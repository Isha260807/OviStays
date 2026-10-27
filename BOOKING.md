# OviStays booking system

How a villa gets booked, from search to check-out. Code lives in `Backend/src/modules/user/services` (engine),
`Backend/src/modules/hotel` (owner API), `Backend/src/modules/admin/controllers/marketplace.controller.js` (admin),
`Frontend/src/modules/hotel` (owner panel) and `Frontend/src/modules/user/pages/Booking` (guest).

## Who does what

| Role | Where | Can |
|---|---|---|
| Guest | `/villas/:id/book`, `/bookings` | search, book, pay, cancel, see check-in code, review |
| Owner (host) | `/hotel` | many villas, calendar, prices, accept/reject, check-in/out, earnings, KYC |
| Admin | `/admin` | verify owners, approve/suspend villas, refund rules, cancel with a refund %, audit log |

A villa is a `Hotel` record with `ownerId`. The owner id always comes from the login token, never from the request.

## Owner onboarding

Sign up (OTP) → submit PAN, bank and documents on Profile & KYC → admin verifies in Admin → Villa Owners (KYC) → host panel opens.
Until then every owner API except profile, KYC and notifications answers `403 KYC_REQUIRED` (with `kycStatus`), and the panel shows only the
Profile page with the review status (submitted, under review, or rejected with the admin's reason so they can fix and resubmit).
The owner gets a notification when approved or rejected.

## Booking types (per villa)

`Hotel.bookingModes` turns each on or off: **night** (check-in date to check-out date), **dayUse** (owner-defined packages
with start/end time and price) and **hourly** (open/close time, slot lengths with prices, start step).
All three write the same `AvailabilityBlock` calendar, so they cannot overlap each other.
**Same-day booking:** if the usual check-in time has already passed, tonight can still be booked. The stay starts from the moment of booking
(rounded up to 15 minutes, and before midnight) and checks out at the normal time next day: no extra time is given. The owner can switch it off
per villa (`allowSameDay`).
Confirmation is per villa: `confirmationMode = instant | request`.

## Status flow

```
Instant:  Awaiting Payment ──paid──────────────► Confirmed
              │  └─ hold ends / payment fails ─► Expired
Request:  Requested ──owner accepts──► Awaiting Payment ──paid──► Confirmed
              │  ├─ owner declines ──► Rejected
              │  └─ no reply in time ► Expired
Confirmed ──owner enters guest's code──► Checked In ──► Checked Out
   ├─ guest / owner / admin cancels ───► Cancelled (refund by rule)
   └─ never checked in, grace passed ──► No Show
```

`paymentStatus` is separate: Unpaid, Paid, Failed, Refund Pending, Partially Refunded, Refunded.
Every change goes through `setStatus()` (compare-and-set on the expected old status), so a payment racing a timeout,
or a cancel racing a check-in, has exactly one winner. Each change is appended to `Booking.history`.

## Why two guests cannot get the same dates

1. Every booking attempt takes a short per-villa lease (`Hotel.calendarLockUntil`, atomic `updateOne`, 8 s, self-expiring).
2. Inside it, the overlap query runs: `existing.startAt < new.blockedUntil && existing.blockedUntil > new.startAt`
   (`blockedUntil` = end; there is no cleaning buffer or notice period, a slot is just check-in time to check-out time). Live holds count, expired ones do not.
3. The block is inserted, then re-checked once more. If anything else slipped in, the newer one removes itself.
4. Check-in date is inclusive, check-out exclusive, so one guest can leave at 11:00 and the next arrive at 12:00.

No MongoDB transactions are needed, so this works on a standalone local server and on Atlas. A race test (10 guests, one
villa, one winner) is in `tests/booking.engine.test.js`.

## Money

Whole paise everywhere (`Booking.pricing.*Paise`). The server prices every selection (`pricing.service.js`); the client
sends dates/slot/guests only. Price = nightly rates (weekend rate, date rules) − weekly/monthly discount − coupon + cleaning fee,
then stay GST. Owner payout = total − commission − platform fee − GST on those (rates from Business Setup). The price is
frozen on the booking. Legacy rupee fields (`amount`, `commission`, `gst`) are filled for the existing reports.

## Payments (Razorpay)

`POST /user/bookings/:id/pay` creates an order for the frozen amount. After checkout the browser sends the signature to
`/payment/verify`; the server checks it **and** fetches the payment from Razorpay (order, amount, captured).
`POST /api/payments/razorpay/webhook` (signed, de-duplicated by event id) does the same for closed tabs.
`confirmAfterPayment()` is safe to run twice. If the dates can no longer be given (hold lapsed and someone else booked,
booking cancelled, duplicate payment) the payment is refunded in full automatically.
Keys come from Admin → Developer → Env Managements (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
**Without keys, development runs a labelled test mode** (a "pay" that needs no card). Production refuses payments instead.

## Cancellation and refunds

Admin sets rules in Admin → Booking & Refund Rules: "cancel at least N hours before start → refund P%" (largest matching N wins,
later = 0%). Host or platform cancels → 100%. Admin can type a different % for one booking when cancelling it.
Refunds are recorded once (idempotent key), sent to Razorpay, retried by the background job if they fail.
The refund preview is shown to the guest before they confirm.

## Check-in code

On confirmation the guest gets a 6-digit code. The owner types it to check in. It works from `checkInOpensHours` before the
start; 5 wrong tries lock it for 15 minutes. Check-out is manual or automatic after the grace time.

## Background jobs (every 30 s, `core/jobs/scheduler.js`)

Expire unanswered requests and unpaid holds, mark no-shows, auto check-out, delete old calendar rows, retry failed refunds,
reconcile Razorpay payments we never heard about. All steps claim rows atomically, so several servers can run them.

## Schema changes

- `Hotel`: `ownerId`, `listingStatus` (kept in step with `status`), `bookingModes`, `pricing`, `confirmationMode`, `timezone`,
  `maxAdvanceDays`, `houseRules`, `geo` (2dsphere), `locality`, `country`, `beds`, lock fields.
  `status` gained `Inactive`.
- `Booking`: `ownerId`, `mode`, `slot`, `confirmationMode`, `pricing{}`, `paymentStatus`, deadlines, `checkInCode`, `cancellation`,
  `idempotencyKey` (unique per user), `history`; new statuses Requested, Awaiting Payment, Rejected, Expired, Payment Failed, No Show.
- `Payment`: gateway ids, `amountPaise`, `refunds[]`, `history[]`.
- `Settings`: `stayGstRate`, hold/response/pay windows, check-in/no-show/auto-checkout timings, `refundTiers`.
- New: `Owner`, `OwnerSession`, `AvailabilityBlock`, `PriceRule`, `AuditLog`, `PaymentEvent`. `InboxNotification.ownerType` gained `OWNER`.

## Migration

`npm run migrate:booking` (in `Backend/`) is safe to repeat. It gives existing villas a `listingStatus` and a paise nightly price
(from `startingPrice`), adds the paise snapshot to old bookings, puts live old bookings on the new calendar and builds indexes.
`npm run seed:owner -- "+91 9000000001" "Owner Name" HT-0001` creates a verified owner and hands villas to them.
Demo OTP is `123456` while `OTP_MODE=demo`.

## API summary

Guest (`/api/user`): `GET villas/:id/availability?from&to`, `GET villas/:id/slots?date`, `POST bookings/quote`,
`POST bookings` (header `Idempotency-Key`), `GET bookings`, `GET bookings/:id`, `POST bookings/:id/cancel`,
`POST bookings/:id/pay`, `POST bookings/:id/payment/verify`, `POST bookings/:id/payment/mock` (dev only).

Owner (`/api/hotel`, role `hotel`): `auth/{register,send-otp,verify-otp,refresh,logout,me}`, `profile`, `kyc`,
`villas` CRUD + `submit` + `active`, `villas/:id/calendar`, `villas/:id/blocks`, `villas/:id/price-rules`,
`bookings` (+ `accept`, `reject`, `cancel`, `check-in`, `check-out`), `dashboard`, `earnings`, `reviews`, `notifications`.

Admin (`/api/admin`): `owners`, `owners/:id/kyc`, `owners/:id/status`, `hotels/:id/listing` (approve, reject, suspend, reinstate),
`bookings/:id/cancel`, `bookings/:id/payments`, `audit-logs`, `settings` (refund rules and timings).

## Tests

`cd Backend && npm test` (43 tests, runs against a separate `OviStays_test` database on local MongoDB; it refuses any other).
Covers pricing, refund rules, ten-way booking race, cross-mode overlaps, buffers, request flow, hold expiry, late and duplicate
payments, refunds, check-in lockout, no-show, owner isolation, KYC and approval gating, dashboard scoping.

## Not built / decisions to revisit

- Security deposit, early check-in and stay extensions (not chosen).
- Owner payouts are still recorded by admin (existing Payouts page); no automatic bank transfer.
- Map pin picker (HERE Maps) is not wired: the form takes a Google Maps link and optional latitude/longitude.
- iCal sync with other platforms.
- A guest's wrong "check-in" expectations, disputes and chargebacks are handled by hand through the admin cancel tool.
- Confirm the stay GST rate with an accountant; the platform fee is taken from the owner's side, not added to the guest total.
- The browser flows (owner panel, guest booking pages) compile and the APIs behind them are tested, but they have not been clicked through in a real browser yet.
