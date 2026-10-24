# OviStays Payment Storage & Management

This file is the specification for how money is stored, moved and checked in OviStays.
It is copied from the payment system in **Grhapoch** (`D:\Projects\Grhapoch\Backend`), which is built for
production: every payment step can be repeated safely, money is never off by a paisa, and a scheduled job
finds and fixes anything that went wrong.

Nothing in this file is built yet. Read section 1 first (what exists today and what is unsafe), then build in the
order given in section 14. Where a Grhapoch file is the model to port, its path is given as `grhapoch:<path>`
(relative to `D:\Projects\Grhapoch\Backend\src\`, except tests, which are in `D:\Projects\Grhapoch\Backend\tests\`).

## Contents

1. [Where OviStays is today](#1-where-ovistays-is-today)
2. [The rules (never break these)](#2-the-rules-never-break-these)
3. [Money handling](#3-money-handling)
4. [Folder layout](#4-folder-layout)
5. [Collections and indexes](#5-collections-and-indexes)
6. [State machines](#6-state-machines)
7. [Payment flows](#7-payment-flows)
8. [Webhooks](#8-webhooks)
9. [Reconciliation and self-healing](#9-reconciliation-and-self-healing)
10. [Security](#10-security)
11. [Infrastructure and configuration](#11-infrastructure-and-configuration)
12. [API surface](#12-api-surface)
13. [Admin panel changes](#13-admin-panel-changes)
14. [Build order](#14-build-order)
15. [Tests that must exist](#15-tests-that-must-exist)
16. [Decisions the business must make](#16-decisions-the-business-must-make)
17. [Grhapoch to OviStays name map](#17-grhapoch-to-ovistays-name-map)

---

## 1. Where OviStays is today

What exists (all from the admin panel work so far):

| Piece | Where | State |
|---|---|---|
| `Payment` model | `Backend/src/models/Payment.model.js` | A plain record: booking, method, amount, status (`Paid/Pending/Failed/Refunded`). No gateway ids, no history. |
| `Payout` model | `Backend/src/models/Payout.model.js` | A plain record: hotel, period, amount, status. |
| `Booking` model | `Backend/src/models/Booking.model.js` | Has `amount`, `commission`, `platformFee`, `gst` calculated from Settings when created. |
| Settings | `Backend/src/models/Settings.model.js` | `commissionRate`, `platformFee`, `gstRate`, `cancelHours`, and the toggles `onlinePaymentOnly`, `maxPayAtHotelAmount`, `maintenanceMode`. |
| Env Managements | Admin > Developer | Can already store `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` encrypted. |
| Reports | Admin > Report Management | Read `Payment`, `Booking`, `Payout`. They must be updated when the models below change. |

What is **unsafe for real money today** (fix these first, see section 14, step 0):

1. **Anyone with admin access can change a payment's status** (`PATCH /api/admin/payments/:id`) or **delete a
   payment**. A payment must only change through the finance service, and must never be deleted.
2. **Payouts can be created, edited and deleted freely** (`/api/admin/payouts`), with no balance check.
3. **Money is stored as ordinary numbers, and `Booking` rounds commission and GST to whole rupees**
   (`Math.round` in `Booking.model.js`). Every amount must be whole paise.
4. **No payment gateway, no webhook, no idempotency.** Nothing stops a payment being recorded twice.
5. **No database transactions.** A booking and its payment can be left half-written.
6. **No refund flow, no wallet, no ledger, no reconciliation.**
7. `scripts/seed-demo.js` writes `Payment` rows directly. It must be changed or limited to development.

---

## 2. The rules (never break these)

These are the guarantees Grhapoch gets from its design. Each one is enforced in code, not by convention.

1. **One module changes payment state.** `core/payments/finance.service.js` is the only code allowed to change a
   payment's status, refund state or settlement flags. Controllers, jobs and admin screens call it; they never
   write those fields themselves. (`grhapoch:modules/food/orders/services/finance.service.js`)
2. **Every change is a conditional update.** "Set captured only if it is currently pending". Two requests,
   a retry, or a webhook racing the verify API can never apply the same change twice.
3. **Every money movement has an idempotency key.** A key is a fixed name for the real-world event
   (`booking_payment:<bookingId>`, `booking_refund:<bookingId>`, `wallet_topup:<gatewayOrderId>`). A unique
   index on the key means replaying an event cannot move money again.
4. **Money is exact.** Amounts are whole paise (integers). Never add or compare rupee decimals.
5. **Related writes are all-or-nothing.** The booking, the payment record and any wallet debit are written in
   one MongoDB transaction. Production refuses to start payments without transactions.
6. **The wallet balance only changes through the ledger.** One function writes the ledger row and moves the
   balance together. A debit can never take a balance below zero.
7. **Never trust the client.** The amount, order and status of an online payment are read from Razorpay, not
   from the app. A payment must match the booking it is for, in amount and order id.
8. **One gateway payment pays for one booking.** A unique index on the Razorpay payment id enforces it.
9. **Every webhook is recorded once.** A unique index on the event id means a retried or duplicated webhook is
   acknowledged and ignored.
10. **Hotel balances are calculated, never stored.** There is no "hotel wallet" number to drift. Balance =
    earned from completed stays minus withdrawals and payouts. Every screen uses the same function.
11. **Withdrawals and payouts are serialised per hotel.** A lock row makes "check balance, then pay" safe when
    two requests arrive together.
12. **Reconciliation runs on a schedule.** It finds payments that disagree with each other or with Razorpay, repairs
    what is safe to repair, writes a report, and raises an alert for the rest.
13. **History is append-only.** Every payment record keeps a list of what happened and who did it. Nothing is
    deleted.

---

## 3. Money handling

**Store integer paise.** 1 rupee = 100 paise. `₹1,234.56` is stored as `123456`.

Grhapoch stores the wallet and ledger in integer paise but keeps the per-order finance record in rupees rounded
to 2 decimals by schema setters (and compares in paise). OviStays should be stricter and store **integer paise
everywhere in the new collections**. That removes the whole class of rounding bugs. Convert to rupees only at
the API boundary and in the admin screens.

Create these three helpers first (port them as they are):

| File | Purpose | Model |
|---|---|---|
| `src/utils/money.js` | `toPaise`, `fromPaise`, `round2`, `addMoney`, `subMoney`, `percentOf`, `eqMoney`, `gtMoney`, `gteMoney`, `ltMoney`. The one place money is rounded or compared. | `grhapoch:utils/money.js` |
| `src/utils/moneySchema.js` | `roundMoneyPaths(schema, paths)` for any field that still holds rupees. Throws at startup on a wrong path. | `grhapoch:utils/moneySchema.js` |
| `src/utils/dbTransaction.js` | `withTransaction(fn, { session })` and `sessionOpts(session)`. Retries transient errors; in production it throws if the database has no transaction support (unless `FINANCE_REQUIRE_TRANSACTIONS=false`). | `grhapoch:utils/dbTransaction.js` |

Rules for paise fields: `type: Number`, `validate: Number.isInteger`, `min: 0` (or `min: 1` for a ledger row).
Name them `...Paise` so a rupee value can never be mistaken for one.

Percentages (commission, GST) are applied to paise and rounded once, with `percentOf`. Calculate the split once,
when the booking is created, and **store the result on the payment record** (a snapshot). Reports and payouts then
read the snapshot, so a later change to the commission rate cannot rewrite old bookings.

Tests that prove it (port `grhapoch:tests/money.test.js`): `toPaise(1.005)`, `0.1 + 0.2 === 0.3` through the
helpers, many small amounts adding up with no drift.

---

## 4. Folder layout

Everything shared by the guest, hotel and admin modules lives in `core/`, next to `core/auth`, `core/uploads`
and `core/settings`.

```
Backend/
  scheduler-server.js                 separate process: reconciliation jobs + stale-booking expiry
  src/
    core/payments/
      finance.service.js              THE only code that changes payment state (section 2, rule 1)
      transaction.service.js          wallet ledger: recordTransaction(), getTransactionsByEntity()
      wallet.service.js               creditWallet(), debitWallet(), wallet views for the apps
      razorpay.helper.js              Razorpay client: orders, fetch payment, refund, signature check
      payoutBalances.service.js       hotel balances, calculated from bookings and withdrawals
      payoutLock.js                   per-hotel lock so payouts cannot overlap
      payoutTransitions.js            withdrawal pending -> approved | rejected, once
      reconciliation.service.js       find problems, repair one booking
      reconciliation.job.js           scheduled self-heal and full runs, reports, alerts
      jobLock.js                      stops two servers running the same job at once
      controllers/razorpayWebhook.controller.js
      routes/webhook.routes.js
      models/
        BookingTransaction.model.js   one finance record per booking (replaces today's Payment)
        WalletTransaction.model.js    ledger rows
        UserWallet.model.js
        PaymentIntent.model.js
        WebhookEvent.model.js
        ReconciliationReport.model.js
        PayoutAccount.model.js        the lock rows
        JobLock.model.js
        HotelWithdrawal.model.js
        HotelAdjustment.model.js      signed manual credits / debits by an admin
    config/db.js                      ensurePaymentIndexes() runs before the server accepts traffic
    utils/money.js  utils/moneySchema.js  utils/dbTransaction.js
```

Keep the Grhapoch file names where possible so the two projects stay easy to compare.

---

## 5. Collections and indexes

Collection names use the prefix `payment_` so all money data is easy to find, back up and lock down.

### 5.1 `payment_booking_transactions` (one per booking)

The source of truth for the state of a booking's payment. It replaces the current `Payment` model.
(`grhapoch:modules/food/orders/models/foodTransaction.model.js`)

| Field | Type | Meaning |
|---|---|---|
| `bookingId` | ObjectId, **unique** | The booking this is for |
| `userId`, `hotelId` | ObjectId | Guest and hotel |
| `paymentMethod` | `razorpay` / `wallet` / `pay_at_hotel` | How the guest pays |
| `status` | `pending` / `authorized` / `captured` / `failed` / `refunded` | See section 6.1 |
| `currency` | `INR` | |
| `pricing` | object, paise | Snapshot at booking time: `roomCharge`, `tax`, `platformFee`, `discount`, `total` |
| `amountDuePaise` | paise | What the guest must pay now. Online payments must cover at least this |
| `razorpay` | `{ orderId, paymentId, signature }` | Gateway references |
| `amounts` | object, paise | The split, see 5.1.1 |
| `refund` | `{ status, destination, amountPaise, reason, gatewayRefundId, attempts, error, requestedAt, processedAt }` | Where the current refund stands |
| `refundedPaise` | integer | Total refunded so far (partial refunds add up) |
| `refunds[]` | `{ key, amountPaise, destination, status, reason, ledgerKey, gatewayRefundId, error, requestedAt, processedAt }` | Every refund attempt. `key` is the request id that makes it idempotent |
| `dispute` | `{ status, disputeId, amountPaise, reasonCode, phase, respondBy, openedAt, resolvedAt }` | Chargeback state |
| `settlement` | `{ isHotelSettled, hotelSettledAt }` | Whether the hotel has been paid for this booking |
| `history[]` | `{ kind, amountPaise, at, note, ref, recordedBy:{role,id} }` | Append-only audit trail. `ref` is used to ignore duplicates |

**5.1.1 The split (`amounts`)**, worked out once at booking time:

```
guestPaid           = pricing.total
hotelCommission     = percentOf(roomCharge, commissionRate)           from Settings, snapshot
gstOnCommission     = percentOf(hotelCommission + platformFee, gstRate)
paymentGatewayFee   = percentOf(guestPaid, gatewayFeeRate)            0 for pay-at-hotel
hotelShare          = roomCharge + passThroughTax - hotelCommission - gstOnCommission - paymentGatewayFee - tcs
platformNetEarning  = hotelCommission + platformFee + gstOnCommission... (see section 16: tax treatment)
```

Grhapoch's equivalent fields are `restaurantShare`, `restaurantCommission`, `gstOnItem`, `gstOnCommission`,
`paymentGatewayFee`, `tcs`, `platformNetProfit`. Confirm the exact tax treatment with an accountant (section 16)
before building the formula; the structure above is what matters.

**Indexes (all must exist in production):**

```
{ bookingId: 1 }                          unique
{ 'razorpay.orderId': 1 }                 sparse        (webhook looks up by this)
{ 'razorpay.paymentId': 1 }               UNIQUE, partial: only when the id is a non-empty string
                                          -> "one Razorpay payment pays for one booking"
{ status: 1, paymentMethod: 1 }
{ 'refund.status': 1, updatedAt: 1 }                    (finds stuck refunds)
{ hotelId: 1, 'settlement.isHotelSettled': 1 }
{ createdAt: -1 }
```

### 5.2 `payment_transactions` (the wallet ledger)

One row per credit or debit of a guest wallet. The single record of wallet money movement.
(`grhapoch:core/payments/models/transaction.model.js`)

`entityType` (`user`), `entityId`, `type` (`credit`/`debit`), `amountPaise` (integer, ≥ 1), `balanceAfterPaise`
(set in the same operation), `status` (`completed`/`pending`/`failed`/`reversed`), `category`
(`booking_payment`, `booking_refund`, `wallet_topup`, `referral_reward`, `admin_topup`, `adjustment`),
`bookingId`, `description`, `idempotencyKey`, `gatewayOrderId`, `gatewayPaymentId`, `metadata`.

Indexes: `{ idempotencyKey: 1 }` **unique, partial** (only rows that have a key); `{ entityType, entityId, createdAt: -1 }`;
`{ bookingId, entityType }`; `{ gatewayPaymentId: 1 }` sparse.

### 5.3 `payment_user_wallets`

`userId` (unique), `balancePaise` (integer ≥ 0), `referralEarningsPaise`. Changed **only** by `recordTransaction`.
(`grhapoch:modules/food/user/models/userWallet.model.js`)

### 5.4 `payment_intents`

"We asked Razorpay to collect X for this purpose." Written when a wallet top-up order is created, so the webhook can
still credit the guest if their app dies after paying, and so a payment made for something else cannot be replayed
as a top-up. (`grhapoch:core/payments/models/paymentIntent.model.js`)

`kind` (`wallet_topup`, plus `hotel_cash_remittance` if section 7.6 is used), `ownerId`, `gatewayOrderId` (**unique**),
`amountPaise`, `status` (`created`/`completed`), `gatewayPaymentId`, `completedAt`,
`completedVia` (`verify_api` / `webhook` / `reconciliation`).

### 5.5 `payment_webhook_events`

One row per delivery from Razorpay: audit trail and duplicate guard.
(`grhapoch:core/payments/models/webhookEvent.model.js`)

`provider`, `eventType`, `fingerprint`, `resourceId`, `status` (`processing`/`processed`/`failed`), `payloadHash`,
`bookingId`, `attempts`, `processedAt`, `error`. Index: `{ provider: 1, fingerprint: 1 }` **unique**.

### 5.6 `payment_reconciliation_reports`

One row per scheduled run: `kind` (`self_heal`/`full`/`manual`), `startedAt`, `finishedAt`, `durationMs`, `ok`,
`error`, `issueTotal`, `criticalTotal`, `counts`, `walletMismatches`, `repairs[]`, `remaining[]`,
`remainingCritical`. (`grhapoch:core/payments/models/reconciliationReport.model.js`)

### 5.7 `payment_payout_accounts` and `payment_job_locks`

- **Payout account**: `partyType` (`hotel`), `partyId`, `seq`. Unique on `(partyType, partyId)`. Every payout write
  first increments `seq` inside the transaction; two simultaneous payouts for the same hotel then conflict, one
  retries, and the second sees the first's withdrawal. (`grhapoch:core/payments/payoutLock.js`)
- **Job lock**: `name` (unique), `lockedUntil`, `owner`. A job takes the lock for a limited time; a crashed run cannot
  block the job forever. (`grhapoch:core/payments/jobLock.js`)

### 5.8 `hotel_withdrawals` and `hotel_adjustments`

- **Withdrawal**: `hotelId`, `amountPaise`, `status` (`pending` → `approved` | `rejected`), `requestId`
  (**unique per hotel**, so a double tap returns the same request), bank details snapshot, `transactionId`,
  `adminNote`, `rejectionReason`, `processedAt`.
- **Adjustment**: `hotelId`, signed `amountPaise` (credit positive, debit negative), `reason`, `adminId`. For manual
  corrections. Always visible in the balance.

---

## 6. State machines

### 6.1 Booking payment (`BookingTransaction.status`)

```
pending ──► authorized ──► captured ──► refunded
   │            │
   └──► captured│
   │            ▼
   └──► failed ──► captured      (only for a late payment: guest paid after we gave up)
```

Allowed transitions only (`grhapoch` `TRANSITIONS`):

| From | To |
|---|---|
| `pending` | `authorized`, `captured`, `failed` |
| `authorized` | `captured`, `failed` |
| `captured` | `refunded` |
| `failed` | `captured` (late capture only) |
| `refunded` | nothing |

`canTransition(from, to)` is a pure function and has its own test.

### 6.2 Refund

A refund is a three-phase process, and **several partial refunds are allowed**:

1. **Claim.** One refund in flight at a time. A conditional update adds a `refunds[]` entry as `initiated` and sets
   `refund.status = initiated`. Only one caller can win. The same atomic update checks that the refunded total plus
   this amount does not exceed what the guest paid.
2. **Move the money.** To the wallet (an idempotent ledger credit with key `booking_refund:<bookingId>[:<key>]`) or
   to the original payment method (a Razorpay refund).
3. **Finalize.** `processed` (adds to `refundedPaise`; when the total reaches what was paid, the booking payment
   becomes `refunded`), `pending` (Razorpay accepted it; the webhook confirms), or `failed` (can be retried with the same key).

`refund.status`: `none → initiated → (pending →) processed`, or `failed` (retryable).
A **full** refund uses key `full`. A **partial** refund must carry a caller-supplied `idempotencyKey`; reusing a key
with a different amount is rejected.

### 6.3 Withdrawal

`pending → approved` or `pending → rejected`. Both are final. It is one conditional update, so approving or
rejecting twice (double click, two admins) applies once. (`grhapoch:core/payments/payoutTransitions.js`)

### 6.4 Dispute (chargeback)

`none → open → under_review → won | lost | closed`.

- `open` / `under_review`: the booking's earnings are **held back** from the hotel's balance.
- `won`: the earnings are released.
- `lost`: the bank took the money. Recorded as a refund with destination `chargeback`, once.
- An old event can never move a finished dispute backwards.

---

## 7. Payment flows

### 7.1 Creating a booking with online payment

1. Guest chooses dates and pays online. Check `maintenanceMode` (refuse if on) and the toggles
   (`onlinePaymentOnly`, `maxPayAtHotelAmount`).
2. Work out the price and the split (5.1.1). **Never take the price from the app.**
3. Create the Razorpay order: `orders.create({ amount: totalPaise, currency: 'INR', receipt: <bookingId> })`.
   If total is under ₹1 (100 paise), refuse.
4. In **one database transaction**: create the booking, create the `BookingTransaction` (`pending`, with the Razorpay
   order id), and, if paying by wallet, debit the wallet with key `booking_payment:<bookingId>`.
5. Return `{ key, orderId, amount, currency }` to the app. The booking stays `Pending` and the room is held for a
   limited time (15 minutes in Grhapoch).

### 7.2 Confirming an online payment: verify API and webhook race

Two things can tell the server the guest paid: the app calling **verify**, and Razorpay's **webhook**. Both call the
same function and whichever arrives first wins:

```
finance.capturePayment(bookingId, { method, source, gatewayPaymentId, gatewayOrderId, signature, amountPaise })
```

Inside one transaction it:

1. Loads the finance record. If already `captured` or `refunded`, returns `{ applied: false }` (not an error).
2. Rejects a payment whose Razorpay order id does not match this booking's order (`gateway_order_mismatch`).
3. Rejects an amount below `amountDuePaise` (`underpaid`).
4. Sets `captured` with a **conditional update** (`status` must still be `pending` / `authorized` / `failed`).
5. Appends a `history` entry (with `ref` = the webhook event id or payment id).
6. Updates the booking's payment snapshot in the same transaction.

Catch the duplicate-key error on the unique Razorpay payment id and report "this payment is already linked to another booking".

The caller that gets `applied: true` runs the follow-up **once**: confirm the booking, notify the hotel and the guest.
(`grhapoch` `afterOnlinePaymentCaptured`.)

**Verify API** checks the HMAC signature (`orderId|paymentId` signed with the key secret), and then asks Razorpay
for the payment to confirm status `captured`. It never believes the amount the app sends.

### 7.3 Failures, abandoned payments and late payments

- `payment.failed` webhook: only **records the attempt** in `history` (deduplicated by payment id). The guest may retry on
  the same Razorpay order, so the booking payment is not failed.
- A booking whose payment is not completed within the hold time (15 minutes) is cancelled by the scheduler:
  the booking is moved to `Cancelled` with a conditional update, then `finance.expireUnpaidOnlineBooking()` closes
  the finance record as `failed` and releases the room.
- **Late payment**: if the guest pays after the booking was cancelled, `capturePayment` still accepts it
  (`failed → captured`) and the follow-up sees the booking is cancelled and **refunds it at once** to the original method.
  Reconciliation catches any case this missed (section 9).

### 7.4 Pay at hotel (cash)

- Only allowed when `onlinePaymentOnly` is off and the amount is within `maxPayAtHotelAmount`.
- The finance record starts `pending`. The hotel marks it collected at check-in (`capturePayment` with
  `method: pay_at_hotel`, `source: hotel_desk`, actor = hotel).
- **The hotel is now holding money that belongs partly to the platform** (commission, platform fee, GST). This is the
  hotel-side version of Grhapoch's rider cash in hand. The platform's share must be recovered either by:
  - **netting** it against the hotel's next payout (simplest: it simply reduces the hotel's balance), or
  - **remittance**: the hotel pays it in through Razorpay, using a `PaymentIntent` of kind `hotel_cash_remittance` and
    a unique payment id so one remittance can only be recorded once.
- The Daily Sales report already shows "platform share to collect from hotels". It must be calculated from these records.
- A cash booking that is cancelled after collection cannot be refunded digitally: the refund returns
  `manual_required` and a `refund_manual_required` history entry is written.

### 7.5 Wallet

- **Top-up**: create a Razorpay order, write a `PaymentIntent` (`wallet_topup`), return the order. After payment, **verify**
  and the **webhook** both call `creditTopupIntent()`. It credits with key `wallet_topup:<gatewayOrderId>`, then marks the
  intent `completed`. Whichever is second is a harmless no-op. Verify must also check:
  signature, that Razorpay's payment belongs to this order, status `captured`, an intent exists for **this user**, and
  the gateway amount equals the intent's amount. Cap a single top-up (Grhapoch: ₹50,000).
- **Pay with wallet**: debit with key `booking_payment:<bookingId>` inside the booking transaction.
- **Refund to wallet**: credit with key `booking_refund:<bookingId>[:<key>]`.
- **Dev fallback**: Grhapoch credits a wallet without Razorpay when keys are missing. **Do not copy this to production.**
  Allow it only when `NODE_ENV !== 'production'`.

The ledger function (`grhapoch:core/payments/transaction.service.js` `recordTransaction`) is the model:

1. If the key already exists, return the original row and move nothing.
2. Make sure the wallet exists (race-safe upsert).
3. One `findOneAndUpdate` with `$inc` on the balance. A debit adds the guard `balancePaise >= amount` in the same
   operation, so it cannot overdraw even with parallel requests.
4. Write the ledger row (`balanceAfterPaise` from step 3). If that fails outside a transaction, reverse the balance.
5. On a duplicate-key error for the key, return the existing row.

### 7.6 Cancellation and refunds

`finance.settleCancellation(bookingId, { reason, actor, refundDestination })` is called by **every** cancel path
(guest cancels, hotel cancels, admin cancels, auto-expiry). It does exactly one of:

| Payment state | Action |
|---|---|
| `pending` / `authorized` (not paid) | Close the record as `failed`. No money moves. |
| `captured` online or wallet | `refundOrder` for what has not yet been refunded. |
| `captured` pay at hotel (cash) | Flag for manual handling. |

How much to refund is the **cancellation policy** (section 16) applied to `Settings.cancelHours` and the check-in time.
The policy decides the amount; `refundOrder` carries it out with the guarantees in 6.2.

Refund destination (`resolveRefundDestination`): wallet-paid → wallet; guest asked for wallet → wallet; gateway-paid with a
Razorpay payment id → original method (`source`); cash → `manual`.

`refund.processed` and `refund.failed` webhooks finalize a refund that Razorpay completes later. A refund made directly
in the Razorpay dashboard is recorded once as an external refund (key `gw:<refundId>`).

### 7.7 Settlement and hotel balances

A hotel's balance is **calculated**, in one function used by every screen and every payout check
(`grhapoch:core/payments/payoutBalances.service.js`, `getRestaurantBalances`):

```
earned     = sum of hotelShare for bookings that are
               status Checked Out, finance record captured (or authorized),
               not yet settled, and not in an open / under-review dispute
withdrawn  = sum of withdrawals with status pending or approved   (rejected ones do not count)
adjustments= sum of signed manual adjustments
available  = max(0, earned - withdrawn + adjustments)
```

Earnings only become available **after check-out**, so a booking that is cancelled or a no-show never pays out.
Settlement flags (`markHotelSettled`) are set once, only on captured payments.

**Requesting a withdrawal**: inside `withPayoutLock('hotel', hotelId, fn)` and a transaction: recalculate `available`;
refuse if the amount is greater; create the withdrawal with the guest-supplied `requestId` (a repeat returns the same
withdrawal). **Admin payout** (`markPayoutAsPaid`) is also under the lock and cannot exceed `available`.
**Approve / reject** goes through `transitionWithdrawal`.

### 7.8 Disputes

Handled by `finance.recordDispute` from the webhook (section 8). Each `(dispute, status)` is recorded once through a
`history.ref` of `dispute:<id>:<status>`.

---

## 8. Webhooks

Endpoint: `POST /api/payments/webhook/razorpay` (public, no login, signed). Configure the URL and the secret in the
Razorpay dashboard; keep the secret in Env Managements as `RAZORPAY_WEBHOOK_SECRET`.

**Raw body.** Signature checking needs the exact bytes. In `app.js`, the `express.json({ verify })` hook must store
`req.rawBody = buf` for this route (`grhapoch:app.js`). Do not use any middleware that re-serialises the body before it.
This route must be mounted **before** any body sanitiser that rewrites the body.

**Processing steps** (`grhapoch:core/payments/controllers/razorpayWebhook.controller.js`):

1. Compute `HMAC-SHA256(rawBody, webhookSecret)` and compare with `x-razorpay-signature` using
   `crypto.timingSafeEqual` (check lengths first). Bad signature → `400`.
2. `payloadHash = sha256(rawBody)`. `fingerprint = x-razorpay-event-id`, or `payloadHash` if the header is missing.
3. **Claim the event**: insert into `payment_webhook_events` as `processing`. The unique `(provider, fingerprint)` index means
   a duplicate gets error 11000. A duplicate is **re-run only if** the earlier attempt `failed` or has been `processing`
   for more than 5 minutes (a crashed worker). Otherwise reply `200 { status: 'duplicate' }`.
4. Dispatch by event type (below).
5. Mark the event `processed` (with the booking id it touched) and reply `200`.
6. On error: mark `failed` with the message, reply `500` so Razorpay retries. The retry is allowed because the event is `failed`.

**Events to subscribe to and handle:**

| Event | Action |
|---|---|
| `payment.captured` | Find the booking by Razorpay order id → `capturePayment` (source `webhook`) → run the follow-up if `applied`. If there is no booking, check for a `PaymentIntent` (wallet top-up / remittance): the amount must equal the intent's, then credit. |
| `payment.failed` | `recordPaymentAttemptFailure` (history only). |
| `refund.processed` | `confirmGatewayRefund` (finalize ours, or record one made in the dashboard). |
| `refund.failed` | `failGatewayRefund` (marks the refund `failed`, retryable). |
| `payment.dispute.created / action_required / under_review / won / lost / closed` | `recordDispute`. |

Always check `payment.status === 'captured'` before acting. Never treat `authorized` as paid.

---

## 9. Reconciliation and self-healing

Even with every guard above, a server can crash between two steps, or a webhook can be missed. Reconciliation
proves the numbers agree and repairs what is safe. (`grhapoch:core/payments/reconciliation.service.js`, `reconciliation.job.js`)

### 9.1 What it checks (`reconcileBookings`)

| Issue type | Severity | Repair |
|---|---|---|
| `paid_booking_without_transaction` – booking says paid, no finance record | critical | none (human) |
| `transaction_without_booking` | warning | none |
| `booking_transaction_status_mismatch` – booking snapshot ≠ finance record | critical | `resync` |
| `booking_refunded_transaction_not` | critical | none |
| `transaction_refunded_booking_not` | warning | `resync` |
| `captured_payment_on_cancelled_booking` – guest paid, cancelled booking not refunded | critical | `refund` |
| `refund_stuck` – refund `initiated`/`pending` for over 15 minutes | critical | `recover_refund` |
| `wallet_payment_missing_ledger_row`, `wallet_refund_missing_ledger_row` | critical | none |
| `gateway_paid_database_pending` – Razorpay captured it, we still say unpaid (full run only) | critical | `capture` |
| `gateway_check_failed` | warning | none |
| `dispute_open`, `chargeback_lost` | warning | none (needs a human) |
| `hotel_settled_not_captured` | warning | none |
| `wallet_ledger_mismatch` – wallet balance ≠ sum of ledger rows | critical | none (always alert) |

### 9.2 Repairs (`repairBooking`, every step idempotent)

1. Refund stuck mid-way → `recoverStuckRefund`: for a wallet refund, replay the keyed credit and finalize; for a gateway
   refund, ask Razorpay for the payment's refunds, finalize the matching one, or mark `failed` so it can be retried.
2. Razorpay says captured but we say unpaid → `capturePayment` from the gateway data, then the follow-up.
3. Paid money on a cancelled booking (not cash) → `settleCancellation`.
4. Booking snapshot out of step → `resyncBookingSnapshot` (the finance record is the truth).

### 9.3 Schedule

Run in the **separate scheduler process**, never inside the web server:

| Job | When | Does |
|---|---|---|
| Self-heal | every 10 min (first run 2 min after start) | stuck refunds, snapshot fixes, refund cancelled bookings. Local checks only. |
| Full | every 60 min (first run 5 min after start) | everything above **plus** asking Razorpay about unpaid online bookings (last 48 h, older than 10 min, max 100) **plus** wallet-versus-ledger. |
| Stale unpaid bookings | every 5 min | cancel online bookings unpaid after 15 min |

Each run: takes a job lock (`payment-self-heal`, TTL 9 min; `payment-full-reconcile`, TTL 25 min); ignores records touched in
the last 3 minutes; repairs at most 100 bookings; checks again; saves a `ReconciliationReport`; and if any critical issue
remains, calls the alert (log, plus a POST to `PAYMENT_ALERT_WEBHOOK_URL` when set).

### 9.4 Admin tools (super admin only)

`GET /api/admin/payments/reconciliation` (wallets), `.../bookings` (issues), `POST .../bookings/:id/repair`,
`GET .../report/latest`, `GET .../reports`, `POST .../run`. See section 13 for the screen.

---

## 10. Security

- **Signatures**: verify the checkout signature on verify, and the webhook HMAC with a constant-time comparison.
- **Server-side truth**: read amount, status and order id from Razorpay; compare with the booking in paise.
- **No raw secrets in code or logs**: keys come from Env Managements / `.env`. Never log a signature or secret.
  The Razorpay helper must read the key on every call, not once at start-up (Grhapoch reads it once, so a key
  changed from its admin panel would not apply until a restart), so a key changed in Env Managements takes effect.
- **Nothing replays**: the unique indexes on the payment id, the event id, the idempotency key and the gateway order id.
- **Roles**: guests can only pay and refund their own bookings; hotels see only their own balances and withdrawals; refunds,
  manual payouts, approvals and reconciliation are admin-only; **reconciliation, repair and manual payouts are super-admin only**
  (`requireSuperAdmin`). Every money action stores who did it (`recordedBy`).
- **Input**: reject non-finite, negative and fractional-paise amounts; strict types (a string `"false"` is not `false`);
  escape regular expressions in searches (already done in the admin list code).
- **Do not store card data.** Razorpay Checkout handles it. Store only gateway ids.
- **Rate limit** the verify, top-up and withdrawal endpoints.
- **HTTPS only** in production, and CORS limited to the real front-end origins.
- **Delete nothing.** There is no delete for payments, ledger rows, withdrawals or webhook events.

---

## 11. Infrastructure and configuration

**Database**

- MongoDB must support **transactions** (an Atlas cluster or a replica set). Production startup fails otherwise
  (`withTransaction`), unless `FINANCE_REQUIRE_TRANSACTIONS=false` is set deliberately.
- **Indexes are part of the safety design.** On startup, `ensurePaymentIndexes()` imports every payment model and awaits
  `Model.init()`. If a unique index cannot be built (for example because duplicate rows already exist) the guarantee is
  silently gone, so in production **startup must fail** (unless `PAYMENT_STRICT_INDEXES=false`). (`grhapoch:config/db.js`)
- Back up the `payment_*` and `hotel_*` collections; restrict who can open them.

**Environment (set through Admin > Developer > Env Managements where possible)**

| Variable | Notes |
|---|---|
| `RAZORPAY_KEY_ID` | public key id |
| `RAZORPAY_KEY_SECRET` | secret, used for the checkout signature and API calls |
| `RAZORPAY_WEBHOOK_SECRET` | secret, set in the Razorpay dashboard webhook |
| `FINANCE_REQUIRE_TRANSACTIONS` | default on in production |
| `PAYMENT_STRICT_INDEXES` | default on in production |
| `PAYMENT_ALERT_WEBHOOK_URL` | optional Slack-style URL for critical issues |
| `ENCRYPTION_KEY` | already exists; encrypts the values above in the database |

**Processes**: the web server, and a **scheduler** (`scheduler-server.js`) that runs the jobs in section 9.3. Run only one
scheduler normally; the job lock makes an accidental second one safe. Give it a `/health` endpoint.

**Razorpay dashboard**: enable auto-capture; add the webhook URL and the events in section 8; use test keys in
development and staging, live keys only in production.

---

## 12. API surface

Paths follow the existing module layout (`/api/user`, `/api/hotel`, `/api/admin`, plus `/api/payments` for the webhook).

**Guest (`/api/user`)**

| Method and path | Purpose |
|---|---|
| `POST /bookings` | Create a booking and its payment (7.1). Returns the Razorpay payload for online payment. |
| `POST /bookings/:id/payment/verify` | Confirm an online payment (7.2). |
| `POST /bookings/:id/cancel` | Cancel and settle the money (7.6). Returns the refund outcome and what remains. |
| `GET /wallet` | Balance and history (from the ledger). |
| `POST /wallet/topup` and `POST /wallet/topup/verify` | Top up (7.5). |

**Hotel (`/api/hotel`)**

| Method and path | Purpose |
|---|---|
| `POST /bookings/:id/collect` | Mark a pay-at-hotel booking as collected (7.4). |
| `GET /balance` | `earned`, `withdrawn`, `pendingWithdrawals`, `adjustments`, `available`. |
| `POST /withdrawals` | Request a withdrawal with a `requestId` (7.7). |
| `GET /withdrawals` | History. |

**Admin (`/api/admin`)**

| Method and path | Purpose |
|---|---|
| `GET /payments`, `GET /payments/:id` | List and detail. **Read-only**; remove today's update and delete. |
| `POST /payments/:bookingId/refund` | Refund `{ amount?, idempotencyKey, reason, destination? }`. Partial refunds need the key. |
| `POST /payments/:bookingId/settle` | Mark the hotel as settled for a booking. |
| `GET /withdrawals`, `POST /withdrawals/:id/approve`, `POST /withdrawals/:id/reject` | Review withdrawals. |
| `POST /hotels/:id/payouts` | Record a manual payout (under the lock; cannot exceed `available`). |
| `POST /hotels/:id/adjustments` | Manual credit or debit with a reason. |
| `GET /disputes` | Open chargebacks and their deadlines. |
| `/payments/reconciliation/*` | Section 9.4 (super admin). |

**Public**

| Method and path | Purpose |
|---|---|
| `POST /api/payments/webhook/razorpay` | The webhook (section 8). |

---

## 13. Admin panel changes

| Screen | Change |
|---|---|
| **Payments** (Transaction Management) | Make it read-only. Show gateway ids, the split, the refund list and the history. Add a **Refund** action with an amount and a reason, a confirmation, and an idempotency key generated by the page. Remove the status editor and delete. |
| **Hotel Payouts** | Replace free-form create/edit with: hotel balance cards (`earned`, `withdrawn`, `available`), **Record payout** (checked against `available`), and the withdrawal queue with Approve / Reject. |
| **New: Withdrawal Requests** | List, filter by status, approve or reject once, with a note and a bank transaction id. |
| **New: Disputes** | Open chargebacks, deadline to respond, outcome. |
| **New: Payment Reconciliation** (Developer, super admin only) | Latest report, issue list with severity, Repair button per booking, Run now, run history. (`grhapoch` `PaymentReconciliation.jsx`) |
| **Report Management** | Read the new collections. Convert paise to rupees at the API boundary. Add refund and chargeback columns to the Transaction report, and make Daily Sales' "platform share to collect from hotels" use the real pay-at-hotel records. |
| **Dashboard** | Revenue, commission, GST and refunds read from the finance records. |
| **Toggle Management** | `onlinePaymentOnly`, `maxPayAtHotelAmount` and `maintenanceMode` are enforced in the booking-creation code (7.1, 7.4), not just stored. |
| **Env Managements** | Already lists the Razorpay keys. Add `PAYMENT_ALERT_WEBHOOK_URL`. |

---

## 14. Build order

Do these in order. Each step ends with its tests passing.

**Step 0. Lock down what exists.** Make `payments` read-only in `resources.config.js` (no `update`, no `delete`).
Remove create / update / delete from `payouts`. Stop `seed-demo.js` writing `Payment` rows directly outside development.
Nothing here should reach production before this is done.

**Step 1. Foundations.** `money.js`, `moneySchema.js`, `dbTransaction.js`, `ensurePaymentIndexes`, and the tests for them.
Confirm the production MongoDB supports transactions.

**Step 2. Models.** All collections in section 5, with every index. Migrate existing `Payment` / `Booking` data
(multiply rupees by 100, rebuild the snapshot, rebuild the split).

**Step 3. Ledger and wallet.** `transaction.service.js`, `wallet.service.js`, tests for idempotency, no overdraw,
parallel debits, wallet-versus-ledger agreement.

**Step 4. Finance service.** `capturePayment`, `recordPaymentAttemptFailure`, `expireUnpaidOnlineBooking`,
`refundOrder`, `settleCancellation`, `confirmGatewayRefund`, `failGatewayRefund`, `recordDispute`, `markHotelSettled`,
`recoverStuckRefund`, `resyncBookingSnapshot`. Tests for each transition and each race.

**Step 5. Razorpay and booking flow.** `razorpay.helper.js`, booking creation (7.1), verify (7.2), cancel (7.6), the toggles.

**Step 6. Webhook.** Raw body, signature, event claim, all handlers (section 8). Tests with signed sample payloads.

**Step 7. Wallet top-up and intents** (7.5).

**Step 8. Balances, withdrawals, payouts** (7.7): `payoutBalances`, `payoutLock`, `payoutTransitions`, admin screens.

**Step 9. Pay at hotel and cash remittance** (7.4).

**Step 10. Reconciliation and the scheduler** (section 9) and the admin reconciliation screen.

**Step 11. Update the admin screens and reports** (section 13).

**Step 12. Go-live checklist**: live keys in Env Managements; webhook URL and events set; auto-capture on; a ₹1 real
payment end to end, then a refund; the scheduler running; a reconciliation run that reports zero critical issues;
an alert tested.

**Definition of done**: every test in section 15 passes against a real replica set, a full reconciliation reports no
critical issues, and no code outside `finance.service.js` and `transaction.service.js` writes payment status, refund
state, settlement flags or a wallet balance.

---

## 15. Tests that must exist

Grhapoch runs about 45 integration tests against an in-memory MongoDB **replica set**
(`mongodb-memory-server`, `MongoMemoryReplSet`) and never touches a real database. Do the same
(`grhapoch:tests/finance.integration.test.js`, `finance.transitions.test.js`, `money.test.js`). Port these, renamed for bookings:

- **Ledger**: same key applied concurrently moves money once; a debit cannot overdraw; parallel debits cannot jointly overdraw;
  wallet and ledger agree after a mix of operations.
- **Capture**: applied once even under concurrency; underpaid and wrong-order payments rejected; one gateway payment can
  never pay two bookings; cash collected by the hotel recorded once; a failure webhook only records the attempt.
- **Refund**: a wallet booking cancelled twice refunds once; both entry points share one key; an unpaid booking is closed with
  no money moved; collected cash is flagged for manual refund; a gateway confirmation webhook finalizes once; a stuck refund is
  recovered (wallet and gateway paths).
- **Partial refunds**: several add up and the last closes the payment; the same key never refunds twice; the total can never exceed
  the payment; a partial amount needs a key; concurrent partial refunds cannot jointly exceed the payment; cancelling after a
  partial refund refunds only the rest; a refund made in the Razorpay dashboard is recorded once.
- **Disputes**: open holds earnings, won releases them; lost is recorded as a chargeback refund once; reconciliation reports an open dispute.
- **Transactions**: a failure mid-flow rolls everything back; wallet payment and booking are atomic (insufficient funds leaves nothing).
- **Webhooks**: the unique fingerprint blocks duplicate processing; a failed or stuck event can be retried.
- **Top-up intents**: webhook and verify can both credit and the guest is credited once; an order we never created has no intent.
- **Payouts**: a balance is derived from completed stays minus withdrawals; simultaneous withdrawals can never over-withdraw;
  the same `requestId` returns the same withdrawal; a withdrawal is approved or rejected once; a disputed booking is held back.
- **Reconciliation**: finds a captured payment on a cancelled booking and the repair refunds it; detects and resyncs a snapshot
  that disagrees with its transaction; partial refund on a cancelled booking is still flagged.
- **Job lock**: one holder at a time; a stale lock can be taken over.
- **Money**: `toPaise` edge cases; no drift over many small amounts; fractional paise are rounded, never stored raw; amounts are
  integers in the database.
- **Startup**: every payment unique index actually builds.
- **State machine**: allowed and forbidden transitions, and the exact set of statuses.

---

## 16. Decisions the business must make

These change the formulas. Decide and write them down before step 4.

1. **Cancellation policy.** Refund percentage by time before check-in (`Settings.cancelHours` is only one threshold today).
   No-show. Hotel-initiated cancellation. Is the gateway fee refunded?
2. **Who pays the gateway fee**: the guest, the hotel (deducted from `hotelShare`), or the platform.
3. **GST and TCS treatment.** On the room tariff, on the commission, on the platform fee, and whether TCS applies to payouts.
   Ask your accountant. The structure in 5.1.1 has a field for each; the rates and who bears them are the decision.
4. **When a hotel is paid**: right after check-out, or after a hold of N days. How long a dispute holds earnings.
5. **Minimum withdrawal**, payout schedule, and who may approve.
6. **How platform commission on cash bookings is recovered**: netted against the next payout, or remitted by the hotel (7.4).
7. **Wallet**: do guests get one at launch? It is needed only for "refund to wallet" and wallet payments; the rest of the system
   works without it. If skipped, remove the wallet pieces and refund to the original method only.
8. **Currency**: INR only, or also USD (the Settings page lists both today). A second currency needs its own handling everywhere.

---

## 17. Grhapoch to OviStays name map

| Grhapoch | OviStays |
|---|---|
| Order (`FoodOrder`) | Booking |
| Restaurant | Hotel |
| Customer / `FoodUser` | Guest / `User` |
| `FoodTransaction` (`payment_food_transactions`) | `BookingTransaction` (`payment_booking_transactions`) |
| `Transaction` (`payment_transactions`) | `WalletTransaction`, same collection name |
| `FoodUserWallet` | `UserWallet` |
| `PaymentIntent` kinds `wallet_topup`, `rider_cash_deposit` | `wallet_topup`, `hotel_cash_remittance` |
| COD (cash on delivery) | Pay at hotel |
| Order `delivered` | Booking `Checked Out` |
| `restaurantShare`, `restaurantCommission` | `hotelShare`, `hotelCommission` |
| `FoodRestaurantWithdrawal`, `FoodRestaurantAdjustment` | `HotelWithdrawal`, `HotelAdjustment` |
| `getRestaurantBalances` | `getHotelBalances` |
| `markRestaurantSettled` | `markHotelSettled` |
| `afterOnlinePaymentCaptured` | `afterBookingPaymentCaptured` |
| `expireUnpaidOnlineOrder` | `expireUnpaidOnlineBooking` |
| `repairOrder`, `reconcileOrders` | `repairBooking`, `reconcileBookings` |
| `requireSuperAdmin` on reconciliation routes | same (already in `modules/admin/services/superAdmin.middleware.js`) |

**Do not port (food and delivery only):** rider earnings and bonuses, rider cash deposits and cash limits, delivery withdrawals,
the COD QR code flow (`createCollectQr`, `markQrTerminal`, QR statuses), delivery-fleet and dispatch code, restaurant
subscriptions and their commission override, packaging fee, tip and donation fields, FSSAI, and the food order status list.
