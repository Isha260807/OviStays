# MASTER BUILD PROMPT

Build a complete, production-style admin platform (backend + admin panel + payment system) for a NEW project by
studying and adapting a finished REFERENCE project.

How to use: fill in the INPUTS block, open a new Claude Code session in the new project's folder, and paste everything
from "INPUTS" to the end.

---

## INPUTS (fill these in before pasting)

REFERENCE_PROJECT   = D:\Projects\Grhapoch            (finished project to copy design and logic from; read-only)
NEW_PROJECT         = D:\Projects\OviStays            (the folder to build in)
NEW_PROJECT_NAME    = OviStays
DOMAIN              = Hotel booking marketplace. Guests book rooms in hotels. An admin runs the platform.
MODULES             = admin, user (guest), hotel
ENTITY_MAP          = Order -> Booking, Restaurant -> Hotel, Customer -> Guest, Cash on delivery -> Pay at hotel,
                      Delivered -> Checked Out, Zone -> Location (city)
DROP_FROM_REFERENCE = riders and delivery, food menu items and addons, subscriptions, FSSAI, shipping policy, QR cash collection
BRAND_NAME          = OviStays

If an input is missing or unclear, make the most sensible choice, state it in one line, and continue. Ask the user
only when a decision is irreversible or you cannot proceed.

---

## 0. HOW YOU MUST WORK

1. **Study before you build.** For every feature below, first read the matching code in REFERENCE_PROJECT (pages,
   components, models, controllers, services, routes), then build the equivalent in NEW_PROJECT adapted through
   ENTITY_MAP. Copy the design, behaviour, validation and safety logic. Do not copy food-specific parts (DROP_FROM_REFERENCE)
   and say so in the final report. Never copy secrets, database names, API keys, or Cloudinary accounts from the
   reference's `.env`.
2. **Reuse the reference's look exactly** for the admin panel (layout, colours, spacing, card styles, sidebar, navbar,
   dashboard, login). Take screenshots in a real browser and compare.
3. **Verify everything by running it.** After each feature: build the frontend, test the API with real requests, and test the
   screens in headless Chrome (puppeteer-core with the installed Chrome). Compare report and dashboard numbers with figures
   computed straight from the database. Fix what fails; never report a feature as done without a passing check.
4. **Protect the user's data and machine.**
   - Test only against a throwaway database (the real database name with a `_test` suffix) and on spare ports
     (for example backend 5100, frontend 5174). Print the connected database name at server start and check it before testing.
   - Never kill, restart or write to servers the user started. Stop only processes you started, by process id.
   - Before finishing: drop the test database, delete test uploads and temporary scripts, and check the real database has no
     test records.
   - Do not commit, push, deploy or delete user files unless asked.
   - If you ever find unexplained processes or files on the machine, report them and wait for the user's decision.
5. **Be honest.** Report failures, skipped items and deviations plainly. If something is stored but not enforced yet
   (for example a maintenance toggle with no booking route to block), say so.
6. **Tooling tips (Windows).** Use the file Write/Edit tools for any file containing `$`, backticks or regular expressions
   (a bash `node -e "..."` will mangle them). Use PowerShell to inspect or stop processes. Read a file with the Read tool
   before editing it. Match the reference's naming and comment density.
7. **Work in the phases below, in order.** Finish and verify each phase before the next. Keep the final answer short:
   what was built, what was verified, what was left out, what the user must decide.

---

## 1. FOLDER STRUCTURE

Same pattern as the reference:

    NEW_PROJECT/
      Backend/      Node API
      Frontend/     React web app (all three modules, one app)
      Apps/         empty folders per module, for a future React Native app (nothing built)
      README.md  .gitignore  PAYMENT.md  (created later)

    Backend/src/
      config/       env.js, db.js, envLoader.js
      core/         shared by every module: auth/, roles/, uploads/, settings/, pages/, payments/
      modules/<module>/{controllers,models,routes,services,validators}     one folder per MODULES entry
      models/       shared business models
      routes/index.js  middleware/  utils/  scripts/  uploads/      tests/ at Backend/tests

    Frontend/src/
      app/          App.jsx, providers.jsx, routes.jsx (lazy-loads each module by URL prefix), store.js
      core/         auth (persisted zustand store), settings (branding + toggles stores)
      modules/<module>/{pages,components,services,hooks,context,utils,constants}, routes.jsx
      services/api/ axios.js (token header, 401 handling), config.js (assetUrl), uploads.js
      shared/       components (ImageUpload), styles (global.css), utils (cn, branding, exportUtils, legalFormat)

Path aliases: `@`, `@admin`, `@user`, `@hotel` (one per module). Each module owns its code; shared code goes in `core/` or `shared/`.

## 2. TECH STACK

Match the reference's versions where it has them.

- **Frontend:** React 19, Vite, Tailwind CSS 4 (`@tailwindcss/vite`), react-router-dom 7, Redux Toolkit + react-redux
  (keep one placeholder reducer), Zustand (auth, branding, toggles), axios, sonner (toasts), recharts, framer-motion,
  lucide-react, react-icons (brand icons; lucide has none), jspdf + jspdf-autotable. No component library: write small Card,
  Modal, StatusBadge, form components.
- **Backend:** Node (ESM), Express, Mongoose, jsonwebtoken, bcryptjs, helmet, cors, compression, morgan, dotenv, multer,
  sharp, cloudinary, nodemon. Tests with `node --test`.
- **Env:** a single `MONGO_URI` (no local/production pair). `PORT`, `FRONTEND_URL`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, Razorpay, Cloudinary, email, etc. Provide `.env.example` files. Generate fresh
  random JWT secrets and `ENCRYPTION_KEY`. Use a new database name, never the reference's.
- **API shape:** `{ success, data, message }`. Errors are JSON with the right status: 400 validation, 401 login, 403 role,
  404, 409 duplicate, 413 too large. Express 5 passes async errors on its own. Map Mongoose ValidationError, CastError, duplicate key
  and MulterError in one error handler.

## 3. BACKEND FOUNDATION

- `config/env.js`: reads `process.env`; exports `env`, `refreshEnv()` and `fileEnv` (the values written in `.env`, so an
  override can be undone).
- `config/db.js`: connects and logs `MongoDB connected (database: <name>)`.
- `utils/httpError.js` (`badRequest`, `notFound`, `HttpError`); `utils/codePlugin.js`: a Mongoose plugin that gives every
  record a readable id (`BK-0001`, `HT-0001`, ...) from an atomic counter.
- **Generic admin resource router** (`modules/admin/services/resource.factory.js` + `resources.config.js`): one config per
  list page gives list (search, status filter, page/limit capped at 100), get, create, update, delete, and an `/options`
  endpoint for dropdowns. It whitelists create and update fields, supports hooks (`beforeCreate`, `beforeUpdate`) and
  `decorate` (aggregated columns). Query values must be checked as strings (blocks `?status[$ne]=x`); escape regular
  expressions in search; validate ObjectIds.
- **Auth:** admin login (bcrypt, generic "Invalid email or password"), JWT, `authenticate`, `authorize(role)`,
  `requireSuperAdmin` that reads the admin's role from the database on every request. Admin roles: `ADMIN` (super) and
  `SUB_ADMIN`. Profile update and change-password endpoints.
- **Scripts:** `seed:admin` (takes ADMIN_EMAIL / ADMIN_PASSWORD from the command line or `.env`; refuses a short password) and
  `seed:demo` (refuses to run if data exists; creates realistic sample data including bookings spread over 300 days, with
  payments dated like their bookings).

## 4. ADMIN PANEL DESIGN (copy the reference)

- **Layout:** fixed black sidebar 320px wide (collapses to an 80px icon rail, state remembered; slides in on mobile with an
  overlay); white sticky navbar; content area on a light grey background. The admin area uses a slightly smaller text scale
  (CSS variable, `admin-compact` class on `<html>`).
- **Sidebar:** brand logo + name (logo on a light tile so dark logos show), "Admin Panel" label, menu search box, sections
  with headings, links, accordion groups (opening one closes the others), active highlight, animations, thin scrollbar.
  Sections marked super-admin-only are hidden from sub-admins (and the API enforces it).
- **Navbar:** menu button (mobile), logo + name, maintenance pill (ON/OFF switch), centred search pill, notification bell
  dropdown, profile dropdown (Profile, Settings, Logout).
- **Dashboard (exact copy of the reference page):** filter bar (location, period), "Financial Overview" 6 cards (3x2),
  "Platform & Operations" 10 cards (5x2), revenue chart (area + bars), booking-status donut with clickable counts, momentum
  bars, live signals feed, status cards. Every card links to its page. All numbers come from one stats endpoint
  (`period` and `city` filters, monthly series, recent activity); no static data anywhere.
- **Login page:** same design as the reference (gradient background, round logo badge, "Admin Entry" card, red labels, show/hide
  password, animated button). The logo and name come from Business Setup.
- **Common UI:** Card, Modal, StatusBadge, PageHeader, form fields, a list page driven by a config (columns, filters, add form),
  server-side paging/search/status filter, view modal with status change, row quick actions (Approve / Reject), delete with
  confirm, loading/empty/error states, toasts for every result.
- **Auth in the UI:** persisted token store, protected routes, super-admin-only routes, 401 clears the session.

## 5. ADMIN MENU AND PAGES (every one needs backend + screen + tests)

Sidebar sections and links (adapt names through ENTITY_MAP):

- **Dashboard**
- **Booking Management:** Bookings > All, Pending, Confirmed, Checked In, Checked Out, Cancelled, Refunded
- **Hotel Management:** Hotels > All Hotels, Join Requests (Approve / Reject), Add Hotel (full form + cover image), Suspended
  (Reactivate); Rooms > Room Types, Amenities; Locations
- **Customer Management:** Customers; Reviews & Ratings
- **Promotion Management:** Coupons; Banners (image upload); Push Notifications (log)
- **Report Management:** see section 10
- **Transaction Management:** Payments; Hotel Payouts (see section 11 for the safe versions)
- **Help & Support:** Support Tickets; Contact Messages
- **System Settings:** Broadcast Notification; Toggle Management; Business Setup; Sub Admins; Profile
- **Pages & Social Media:** About Us; Terms & Conditions; Privacy Policy; Refund Policy; Cancellation Policy; Social Media
- **Developer (super admin only):** Env Managements; Image Setting; Developer Settings

Models: Hotel, RoomType, Amenity, Location, Booking (with commission, platform fee and GST calculated from Settings when
created), Payment/finance record, Payout, Review, Coupon, Banner, Notification, SupportTicket, ContactMessage, User (guest),
Admin, Settings, PageContent, BroadcastNotification, InboxNotification, EnvSetting, UploadSetting.

## 6. IMAGE UPLOAD RULES (copy the reference's logic, harden it)

- Endpoints (any signed-in account): `POST /api/uploads/image` (JPEG, PNG, WebP, GIF, max 5 MB, field `type` picks a size
  preset), `/file` (PDF only, 10 MB), `/video` (MP4, WebM, MOV, 50 MB). Multer in memory.
- **Validate the real content, not the browser's file type:** images must decode in sharp (reject anything else), PDFs must
  start with `%PDF-`, videos must have the right signature bytes. Limit decoded pixels (decompression bombs).
- **Processing:** auto-rotate, resize to the preset (hotel/room 1200x800, banner 1600x600, profile 400x400, logo 600x600,
  favicon 128x128; `fit: inside`, never enlarge), convert to WebP quality 85, drop metadata (GPS).
- **Storage:** flat folder, names `<prefix>_<random>.webp` (never the client's filename). Local folder is `UPLOAD_PATH` if set,
  otherwise `Backend/uploads` in development and `/var/www/uploads` in production (outside the app folder). Or Cloudinary (flat,
  no folders) when selected in Image Setting and the keys exist; the choice is cached 15 seconds.
- **Database stores only the relative path** (`/uploads/x.webp`) or an `https` URL. Models validate that pattern
  (blocks `javascript:`). Serve `/uploads` with a 30-day cache, `nosniff`, `Cross-Origin-Resource-Policy: cross-origin`,
  no directory listing, no dotfiles; resolve the folder per request.
- **Frontend:** `ImageUpload` component (preview, progress, remove, size/type check before upload), `assetUrl()` that adds the
  API origin to relative paths, thumbnail columns in lists.

## 7. BUSINESS SETUP, BRANDING AND TOGGLES

- **Business Setup page (copy the reference page):** company name, email, region, phone with country code, address, state,
  pincode, GSTIN, support email/phone/hours; five upload boxes (main logo, guest-app logo, hotel-panel logo, favicon, terms PDF)
  uploaded when you press Save; Reset; same validations as the reference (10-digit phone, typo email domains, logo required);
  plus a "Pricing & Tax" card (currency, commission %, platform fee, GST %, free-cancellation hours).
- A public `GET /api/settings/public` returns brand and support info and the toggles (never commission or platform fee).
  A branding store caches it; the sidebar, navbar, login page, browser tab title and favicon update at once after saving.
- **Toggle Management** (copy the reference): online-payment-only, max pay-at-hotel amount, maintenance mode, guest
  registration, hotel registration. Toggles save instantly, roll back if the server refuses, accept only real booleans. The same
  maintenance switch appears in the navbar and stays in sync with the page.

## 8. DEVELOPER TOOLS (super admin only; server checks the role)

- **Env Managements:** edit environment variables from the panel. Values are stored AES-256-GCM encrypted in the database
  under `ENCRYPTION_KEY` (a separate key from the JWT secrets), override `.env` at start-up (`loadEnvFromDb`), and can be reset to the
  `.env` value. Secrets are never sent back to the browser (show "Set" only). `MONGO_URI` and `ENCRYPTION_KEY` are not editable.
  Validate values (for example PORT). Mark variables that need a restart.
- **Image Setting:** local vs Cloudinary toggle (refuses Cloudinary without keys), shows the active folder and server mode.
- **Developer Settings:** "Clear operational data" (bookings, payments, payouts, reviews, tickets, messages, notifications)
  behind a typed confirmation phrase with live counts; master data is never touched.

## 9. PAGES, SOCIAL MEDIA, BROADCAST

- **Pages & Social Media:** terms and privacy with one version per audience (tabs), refund, cancellation, About Us (name, version,
  description, logo, up to 12 features with icon and colour), Social Media links. The server stores the **plain text** the admin
  typed and builds the HTML itself with everything escaped (stored script injection is impossible). About-page icons and colours are
  looked up in a server whitelist. Feature titles are required. Social links must be `https://`. Public read endpoint
  `GET /api/pages/:key`. Editor has an Editor/Preview toggle and an unsaved-changes warning.
- **Broadcast Notification:** send to All, Guests, Hotels, or chosen people (server-side search). One history record plus one inbox
  entry per recipient; recipients are re-read from the database (client labels and ids are not trusted); links must start with `/`
  or `https://`; deleting a broadcast removes it from every inbox; history is kept 30 days.

## 10. REPORT MANAGEMENT (copy the reference's report layout)

Reports, each with filters (location, hotel, status, period incl. custom dates), summary cards, searchable paged table, and export
to CSV, Excel, PDF and JSON (export fetches ALL matching rows, not just the page):

- Daily Sales & Cash Audit (date picker; summary cards; cash-collected-at-hotel card and the platform's share still owed; tabs for
  bookings / hotels / payment methods)
- Transaction Report (completed / refunded / pending / failed, admin earning vs hotel earning)
- Booking Report; Tax (GST) Report with a per-hotel drill-down; Admin Earning Report with a chart; Cancellation & Refund Report
- Hotel Report: Performance, Payouts; Customer Report: Top Customers (one row per account), Guest Feedback (rating breakdown)

Rules: money in exports is plain numbers; text starting with `= + - @` gets a leading apostrophe (spreadsheet formula injection);
PDF replaces the rupee sign with "Rs.". **Write a script that compares every report total with a figure computed directly from MongoDB
and make it pass.**

## 11. PAYMENT STORAGE AND HANDLING (production grade)

Read the reference's complete payment system first (payments core folder, finance service, webhook controller, reconciliation,
wallet/ledger, payout balances and locks, startup index check, its integration tests). Then:

**A. Write `PAYMENT.md` at the project root** that specifies, for this project: where it stands today and what is unsafe; the rules;
money handling; folder layout; every collection and index; state machines; every flow; webhooks; reconciliation; security;
infrastructure; API; admin screens; build order; tests; business decisions; and a name map to the reference.

**B. Build it in this order, each step with tests:**
0. Lock down what is unsafe: payments read-only (no admin status edit or delete), payouts only through the balance-checked flow.
1. Money helpers (integer paise everywhere), schema rounding, `withTransaction`, startup `ensurePaymentIndexes` that fails production
   if a unique index cannot build.
2. Models: booking finance record (unique per booking, payment snapshot, split, refunds list, dispute, settlement, append-only
   history), wallet ledger (unique partial idempotency key), wallet, payment intents, webhook events (unique event id),
   reconciliation reports, payout lock rows, job locks, withdrawals, adjustments.
3. Ledger and wallet: one function writes the ledger row and moves the balance; a debit cannot overdraw; replays move nothing.
4. Finance service, the ONLY code that changes payment state: capture (allowed transitions only, conditional update, gateway order
   and amount checks, unique gateway payment id), failure recording, expiry of unpaid bookings, refunds (claim, move money, finalize;
   partial refunds with required idempotency keys; never more than paid), cancellation settlement, gateway refund confirmation,
   disputes, settlement, stuck-refund recovery, snapshot resync.
5. Razorpay booking flow: create order, create booking + finance record (+ wallet debit) in one database transaction; verify API
   (HMAC signature, then read the payment from Razorpay, never trust the client amount); cancel flow; toggles enforced here.
6. Webhook: raw body, constant-time HMAC check, unique event claim (re-run only failed or stuck events), handlers for captured, failed,
   refund processed/failed, and dispute events; 500 on error so Razorpay retries.
7. Wallet top-up with payment intents (verify and webhook both credit exactly once).
8. Hotel balances calculated (never stored), per-hotel payout lock, withdrawals pending -> approved | rejected once, manual payout.
9. Pay at hotel and recovering the platform's share of cash bookings.
10. Reconciliation: issue checks, safe idempotent repairs, scheduled self-heal (10 min) and full run (hourly) in a separate scheduler
    process with job locks, saved reports, alerts, and the super-admin Payment Reconciliation screen.
11. Update admin screens, reports and dashboard to the new data.

**C. Prove it with integration tests on an in-memory MongoDB replica set** (`mongodb-memory-server`), at least: replay and concurrency
safety, no overdraw, one payment never pays two bookings, partial refund limits, webhook duplicates, rollback on failure, payout race,
withdrawal approved once, reconciliation repairs, exact paise arithmetic, and that every unique index really builds.

Money rules that must hold everywhere: integer paise; every money movement has an idempotency key; related writes are all-or-nothing;
nothing outside the finance and ledger services writes payment status or a balance; no payment or ledger row is ever deleted;
secrets come from Env Managements and are never logged.

## 12. SECURITY CHECKLIST (apply throughout)

Escape all stored text that becomes HTML; validate stored URLs and file paths by pattern; whitelist every class name, icon and field
that comes from a client; strict types (a string "false" is not false); never return secrets; never trust labels, ids or amounts from
the browser when the server can read them; escape regular expressions in search; reject non-string query values; check roles from the
database; rate-limit login, upload, payment verify and withdrawal endpoints; HTTPS and an exact CORS origin in production; no raw error
details to the client for 5xx.

## 13. TESTING PLAN

- Backend: a script per feature that calls the real API with valid, invalid and hostile input and prints PASS/FAIL (permissions,
  validation, duplicates, injection, limits).
- Numbers: compare reports and dashboard to direct database aggregates.
- Frontend: build; then headless Chrome through the real screens (login, every page loads, filters, search, paging, add/edit/delete,
  uploads, exports with real downloaded files, toggles, logout, sub-admin sees no Developer section) with no console errors.
- Screenshots of the key pages (dashboard, login, Business Setup, a report, reconciliation) compared with the reference.
- Cleanup as in section 0.4.

## 14. FINAL REPORT (keep it short and plain)

1. What was built, by phase.
2. What was verified, and how (counts of checks passed).
3. What was left out of the reference and why.
4. What is stored but not enforced yet.
5. Anything the user must decide or change (keys to replace, business rules such as cancellation tiers, GST treatment, payout timing).
6. Any problems found on the machine or in the data, reported as facts.
