# Sri Laxmi Silks

An Indian handloom textile store — Next.js 14 (App Router) + TypeScript, Tailwind, Supabase,
Razorpay, and tracking notifications over WhatsApp, SMS and email.

```bash
npm install
npm run dev        # http://localhost:3000
```

It runs with **no configuration at all**. Without credentials the storefront serves a bundled
catalogue (`lib/demo-data.ts`), checkout simulates a successful payment, and real PDF invoices are
still generated. Add credentials to move each piece onto live infrastructure — nothing else changes.

---

## What is wired up

| Area | State |
|---|---|
| Storefront | Home, collections, category, product, cart, checkout, order confirmation, order tracking, policy pages |
| Cart | Zustand + localStorage, live stock re-check on add, self-healing against stock/price drift |
| Payments | Razorpay order creation, server-side HMAC signature verification, webhook fallback |
| Inventory | Atomic `decrement_stock` RPC; sold-out badges and disabled add-to-cart |
| Invoices | Branded A4 PDF (jsPDF), uploaded to Supabase Storage, emailed as an attachment |
| Notifications | Admin + customer email (Resend), tracking over WhatsApp Cloud API, SMS (Twilio or Fast2SMS) |
| Admin | Dashboard with KPIs and a 30-day revenue chart, product CRUD, collection CRUD, order management, tracking dispatch |
| Security | RLS policies, service-role writes only, middleware-gated admin, `admins`-table membership check |

---

## Setup

**Full walkthrough — Supabase and domain, step by step: [docs/SETUP.md](docs/SETUP.md).**
The short version follows.

### 1. Supabase

Create a project, then run in the SQL editor, in order:

1. `supabase/migrations/0001_init.sql` — tables, RLS, the `decrement_stock` RPC, storage buckets
2. `supabase/migrations/0002_seed.sql` — five collections and fourteen products

Then set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. Admin access

One command creates the Supabase Auth user **and** the linked `admins` row:

```bash
npm run admin:create -- --email you@example.com --password "a-long-passphrase" --name "Your Name"
npm run admin:list     # who currently has access
```

Doing this by hand is the usual source of "I can log in but get *Admin access
required*": `admins.id` must equal the auth user's UUID, because that is what the
RLS policies compare against `auth.uid()`. The command writes both records and
repairs the link if it is already wrong.

Sign in at `/admin/login` — email and password. The admin area is not linked from
the storefront, and is protected by three independent server-side checks
(middleware, the admin layout, and every `/api/admin/*` route).

### 3. Razorpay

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...          # optional but recommended
```

For the webhook, point Razorpay at `https://your-domain/api/razorpay/webhook` and subscribe to
`payment.captured` and `payment.failed`. It is a redundant path: if the customer closes the tab
before the browser confirms, the webhook still completes the order. Fulfilment is idempotent, so
both routes running is harmless.

### 4. Email (Resend)

```env
RESEND_API_KEY=re_...
RESEND_FROM="Sri Laxmi Silks <orders@yourdomain.com>"
ADMIN_EMAIL=you@example.com
```

`RESEND_FROM` must use a domain verified in Resend. `onboarding@resend.dev` works for testing.

### 5. WhatsApp (Meta Cloud API)

```env
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_TEMPLATE_NAME=order_shipped_tracking
```

Submit this template for approval in Meta Business Manager, category **Utility**. The parameter
order matters — `lib/notifications/whatsapp.ts` fills the placeholders in exactly this sequence:

```
Hello {{1}}, your order from Sri Laxmi Silks has been shipped! 🚚

Order ID: {{2}}
Tracking ID: {{3}}
Courier: {{4}}
Track here: {{5}}

Download your invoice: {{6}}

Thank you for shopping with us! 🙏
```

Until Meta approves it, the tracking form reports WhatsApp as failed and still sends SMS and email.

### 6. SMS

Configure **one** provider. Twilio takes precedence when both are present.

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
# or
FAST2SMS_API_KEY=...
```

---

## How the money path works

The browser never decides what anything costs. Checkout sends only product ids and quantities;
`lib/orders.ts:priceCart` re-reads prices and stock from the database and computes the total.

```
POST /api/razorpay/create-order
  ├── validate the customer's details
  ├── re-price the cart from product rows, reject if stock moved  → 409 CART_INVALID
  ├── create the Razorpay order (amount in paise)
  └── insert a pending order + order_items

Razorpay Checkout modal → success

POST /api/razorpay/verify
  ├── HMAC-SHA256 check of `${order_id}|${payment_id}`, timing-safe
  ├── mark paid, then decrement stock atomically per line
  ├── render the invoice PDF, upload it, store the URL
  └── email the admin and the customer
```

A failed payment marks the order `failed` and keeps the customer's form data so they can retry.
A cart that drifts out of stock mid-checkout is repaired and the customer is returned to `/cart`
with an explanation rather than a silent failure.

## How tracking notifications work

The courier gives you a docket number offline. In `/admin/orders/[id]`:

```
Tracking ID + courier → POST /api/admin/orders/[id]/tracking
  ├── save tracking_id, courier_name; set order_status = 'shipped'
  ├── build the courier-specific tracking URL (lib/config.ts)
  └── send WhatsApp + SMS + email in parallel
```

Notification failures never fail the request — the tracking ID is saved regardless, and the form
reports each channel's outcome separately so you can see exactly what went out and what did not.

---

## Project layout

```
app/
  (store)/          storefront — home, collections, category, product, cart,
                    checkout, order/success, track, and the policy pages
  admin/
    login/          sign-in, outside the auth guard
    (dashboard)/    guarded shell — dashboard, orders, products, categories
  api/              public catalogue, Razorpay, invoices, notifications, admin CRUD
components/
  store/  admin/  ui/  shared/
lib/
  data.ts           catalogue reads, with the demo-data fallback
  orders.ts         cart pricing, order records, atomic stock commits
  fulfilment.ts     idempotent post-payment work
  invoice.ts        PDF generation and storage upload
  razorpay.ts       client, paise conversion, signature verification
  notifications/    email.ts, whatsapp.ts, sms.ts
stores/cart-store.ts
supabase/migrations/
```

---

## Deployment (Vercel)

1. Push the repo and import it into Vercel
2. Add every variable from `.env.example` under Settings → Environment Variables
3. Set `NEXT_PUBLIC_APP_URL` to the production domain — invoice links and the sitemap use it
4. Point the Razorpay webhook at `https://your-domain/api/razorpay/webhook`
5. Swap `rzp_test_` keys for live keys once you have tested a real order end to end

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm start           # serve the build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit

npm run admin:create # create or repair an admin login
npm run admin:list   # list who has admin access
```
