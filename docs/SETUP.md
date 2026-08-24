# Setup from scratch

Two things to stand up: **Supabase** (database, file storage, admin login) and a
**domain**. Neither is needed to browse the site locally — without them the store
runs on bundled demo data — but both are needed before you can take a real order.

Work through Part 1 first. Part 2 can wait until you are ready to go live.

---

# Part 1 — Supabase

## 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) and sign up (the free tier is enough to start).
2. **New project**. Give it a name, and set a strong database password — **save it in
   your password manager now**; Supabase will not show it again.
3. Choose the region closest to your customers. For an Indian store that is
   **Mumbai (ap-south-1)** — it meaningfully affects page speed.
4. Wait ~2 minutes for provisioning.

## 1.2 Copy the three keys

Go to **Project Settings → API**. You need three values:

| Supabase calls it | Goes in `.env.local` as | Safe in the browser? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` | **No — never** |

> The `service_role` key bypasses every security rule in the database. It belongs
> only in `.env.local` and in your host's environment variables. If it ever appears
> in client code, in a screenshot, or in a git commit, rotate it immediately from
> the same settings page.

Create `.env.local` in the project root (copy `.env.example` and fill it in):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

`.env.local` is already in `.gitignore`. Keep it that way.

## 1.3 Create the tables

In the Supabase dashboard open **SQL Editor → New query**, then run these two
files from this repo, **in order**:

1. `supabase/migrations/0001_init.sql` — tables, security rules, the atomic
   stock function, and the three storage buckets
2. `supabase/migrations/0002_seed.sql` — five collections and fourteen products
   to start from (skip this if you are loading your own catalogue)

Paste the whole file, press **Run**, and confirm it reports success. Both are
safe to re-run.

Check it worked: **Table Editor** should now list `categories`, `products`,
`orders`, `order_items` and `admins`.

## 1.4 Create your admin login

This is the step people usually get wrong by hand, so there is a command for it:

```bash
npm run admin:create -- --email you@yourstore.in --password "a-long-passphrase" --name "Your Name"
```

Or run `npm run admin:create` with no arguments and it will prompt you.

An admin is **two linked records** — a Supabase Auth user, and a row in `admins`
whose `id` is *exactly* that user's UUID. The security rules compare
`auth.uid()` against `admins.id`, so a row created by hand with a fresh UUID
grants **no access at all**. The command always writes both and repairs the link
if it is already wrong.

Check who has access at any time:

```bash
npm run admin:list
```

Now restart the dev server and sign in at **http://localhost:3000/admin/login**.

## 1.5 Verify the lock actually holds

Worth doing once, so you know it is real:

- Open `/admin` in a private window → you are redirected to `/admin/login`.
- Sign in with a Supabase Auth user that is **not** in `admins` → "Admin access
  required". Being able to log in is not the same as being an admin.
- With no session, `curl http://localhost:3000/api/admin/products` → `401`.

There are three independent gates, and each one is checked on the server:

1. **Middleware** — redirects anyone without a Supabase session away from `/admin`.
2. **The admin layout** — re-checks membership of the `admins` table before rendering.
3. **Every `/api/admin/*` route** — calls `requireAdmin()` again, so a
   hand-crafted request cannot skip the interface.

On top of that, Row Level Security in the database means even a stolen `anon`
key cannot read an order.

## 1.6 Storage

`0001_init.sql` already created three public buckets: `products`, `categories`
and `invoices`. Uploads from the admin image picker land there automatically.
Nothing more to configure.

---

# Part 2 — Domain

## 2.1 Buy a domain

Any registrar works. For a `.in` domain, common choices are BigRock, GoDaddy or
Cloudflare Registrar (Cloudflare sells at cost, with no first-year discount that
triples on renewal — worth knowing).

Buy the name and stop there. Decline the add-ons; you do not need their hosting,
their email, or their SSL — all three are covered below or included free.

## 2.2 Deploy to Vercel

1. Push this repository to GitHub.
2. At [vercel.com](https://vercel.com), **Add New → Project**, import the repo.
3. Before the first deploy, add **every** variable from `.env.example` under
   **Environment Variables**. Miss `SUPABASE_SERVICE_ROLE_KEY` and orders will
   fail to save.
4. Deploy. You get a working `your-project.vercel.app` URL.

## 2.3 Point the domain at it

In Vercel: **Project → Settings → Domains → Add**, and enter `yourstore.in`.
Vercel then shows the DNS records to create at your registrar:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Add those in your registrar's DNS panel. Propagation is usually minutes, though
it can take up to 48 hours. Vercel issues and renews the HTTPS certificate
automatically — do not buy an SSL certificate.

Pick one of `yourstore.in` or `www.yourstore.in` as canonical and have Vercel
redirect the other, so you are not splitting search rankings between two
addresses.

## 2.4 Tell the app its own address

This one is easy to forget and breaks things quietly. Set in Vercel:

```env
NEXT_PUBLIC_APP_URL=https://yourstore.in
```

It is used for invoice links, the admin link in order emails, the sitemap, and
the tracking URLs sent over WhatsApp. Leave it wrong and customers get links
pointing at `localhost`.

**Redeploy after changing it** — environment variables are baked in at build time.

## 2.5 Update every service that stores your URL

Changing domain means four other places need the new address:

| Service | Where | Set to |
|---|---|---|
| **Supabase** | Authentication → URL Configuration | Site URL `https://yourstore.in`, and add `https://yourstore.in/**` to Redirect URLs |
| **Razorpay** | Settings → Webhooks | `https://yourstore.in/api/razorpay/webhook` |
| **Resend** | Domains | Verify `yourstore.in`, then set `RESEND_FROM` to an address on it |
| **Meta / WhatsApp** | App settings | Add the domain to allowed domains |

Skipping the Supabase step is the usual cause of "admin login redirects me back
to the login page in production".

## 2.6 Go-live checklist

- [ ] `0001_init.sql` and `0002_seed.sql` run against the **production** project
- [ ] `npm run admin:create` run against production, and login verified
- [ ] All environment variables set in Vercel, then **redeployed**
- [ ] `NEXT_PUBLIC_APP_URL` is the real domain
- [ ] Razorpay switched from `rzp_test_` to live keys — **after** one full test order
- [ ] Razorpay webhook points at the live domain
- [ ] Supabase Site URL and Redirect URLs updated
- [ ] `RESEND_FROM` uses a verified domain
- [ ] WhatsApp template approved by Meta
- [ ] One real order placed end to end, with a small amount, and refunded

---

## Troubleshooting

**"Admin needs Supabase" on `/admin`**
The three keys are missing or misspelled in `.env.local`. Restart the dev server
after editing it — Next reads env files only at startup.

**"Admin access required" even though the password worked**
The auth user exists but has no matching `admins` row, or the row's `id` does not
equal the user's UUID. Re-run `npm run admin:create` with the same email; it
repairs the link.

**Login works locally, redirect loop in production**
Supabase Site URL still points at `localhost`. Fix it in Authentication → URL
Configuration (2.5).

**Orders do not appear in the admin**
`SUPABASE_SERVICE_ROLE_KEY` is missing in the host's environment. Orders are
written with the service role after the payment signature is verified.

**Images upload but do not display**
The bucket is not public. `0001_init.sql` sets this up; if you created buckets by
hand, mark them public in Storage → Configuration.
