# Platform

Production-ready starter built on the mandated stack: Next.js (App Router) +
React + TypeScript + Tailwind + shadcn/ui + Framer Motion + PWA, Supabase as
the complete backend, Paystack for payments, Cloudinary for image delivery,
and a modular multi-provider AI layer.

This is a **foundation**, not a finished product — it has no specific domain
tables yet. Add your product's actual entities (listings, courses, orders,
whatever) on top of the auth/wallet/subscription/AI scaffolding here.

## Stack as delivered

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind, shadcn/ui-style components, Framer Motion (installed, not yet used in UI — add to taste) |
| Backend | Supabase: Postgres, Auth, RLS, Storage, ready for Edge Functions |
| Auth | Supabase Auth — email/password, Google OAuth, password reset, email verification, protected routes via middleware, role-based access (user/admin) |
| DB | One migration: `supabase/migrations/0001_init.sql` |
| Storage | Supabase Storage (metadata tracked in `public.files`) + Cloudinary for optimized image delivery |
| Payments | Paystack — one-time, wallet top-up, subscriptions, webhook, verification, auto-unlock |
| AI | 8 providers behind one interface with independent failover: OpenAI, Gemini, Claude, OpenRouter, Groq, Together, Cohere, DeepSeek |
| Deploy | Vercel + Supabase, no code changes required |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your keys
```

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` against it (Supabase Studio SQL
   editor, or `supabase db push` if you're using the CLI).
3. In Supabase Auth settings: enable the Google provider, set your site URL
   and redirect URL to `<your-domain>/auth/callback`.
4. Fill in `.env.local`: Supabase URL/keys, Cloudinary credentials, Paystack
   secret + public key, and whichever AI provider keys you have. Any AI
   provider left blank is simply skipped — nothing breaks.
5. `npm run dev`

## How the pieces fit together

**Auth & roles** — `src/middleware.ts` → `src/lib/supabase/middleware.ts`
refreshes the session on every request, redirects unauthenticated users away
from `/dashboard` and `/admin`, and redirects non-admins away from `/admin`.
A new `auth.users` row automatically gets a `profiles` row (role defaults to
`user`) and a `wallets` row via the `handle_new_user` trigger — promote
someone to admin manually with `update profiles set role = 'admin' where id = '...'`.

**Wallet & payments** — `payments` rows are created as `pending` when
`/api/payments/initialize` is called, then flipped to `success` either by the
client-side `/api/payments/verify` call (immediate UX) or by the
`/api/payments/webhook` handler (source of truth, HMAC-verified against the
raw body). Wallet top-ups insert into `wallet_transactions`; a trigger
(`apply_wallet_transaction`) keeps `wallets.balance_kobo` in sync so the
balance is always derived from the ledger, never edited directly.

**AI layer** — `src/lib/ai/index.ts` exports `generateWithFailover()`. It
walks providers in the order set by `AI_PROVIDER_PRIORITY`, skips any that
lack an API key, and on any request failure moves to the next provider
without throwing — the caller only sees an error if every configured
provider failed. `/api/ai/generate` uses this and logs every attempt to
`ai_usage_logs`.

**RLS** — every table has RLS enabled. Users can only read/write their own
rows; a `is_admin()` helper function grants admins full read (and in most
cases write) access. Review the policies in the migration before going to
production — they're a sound default, not a substitute for your own audit.

## What's intentionally left for you

- No domain-specific tables (products, bookings, whatever your actual
  product is) — this scaffold is domain-agnostic on purpose.
- No emails are sent by the app itself; Supabase's built-in auth emails
  handle verification/reset. Swap in your own provider if you need
  transactional email beyond that.
- Framer Motion is installed but no page uses it yet.
- `next-pwa` generates the service worker at build time; nothing to hand-edit.
- Subscription plan → Paystack `plan` code mapping needs to be created in
  your Paystack dashboard and stored against `subscription_plans` rows.

## Deploying

Push to GitHub, import into Vercel, set the same environment variables from
`.env.local` in the Vercel project settings, and set the Paystack webhook URL
to `https://<your-domain>/api/payments/webhook`. No code changes needed.
