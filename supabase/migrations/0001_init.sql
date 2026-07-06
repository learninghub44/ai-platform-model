-- ============================================================================
-- 0001_init.sql
-- Complete initial schema. Single migration, no duplicates/conflicts.
-- Run against a fresh Supabase Postgres database.
-- ============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type app_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'success', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_kind as enum ('one_time', 'wallet_topup', 'subscription');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_tx_type as enum ('credit', 'debit');
exception when duplicate_object then null; end $$;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth.users row. Created automatically via trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- ── subscription_plans ───────────────────────────────────────────────────────
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_kobo integer not null check (price_kobo >= 0), -- smallest currency unit
  currency text not null default 'NGN',
  interval text not null default 'monthly' check (interval in ('monthly', 'yearly')),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── subscriptions ────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status subscription_status not null default 'trialing',
  paystack_subscription_code text,
  paystack_customer_code text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
-- only one active subscription per user at a time
create unique index if not exists uniq_active_subscription_per_user
  on public.subscriptions(user_id)
  where (status in ('active', 'trialing'));

-- ── wallets ──────────────────────────────────────────────────────────────────
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency text not null default 'NGN',
  updated_at timestamptz not null default now()
);

-- ── wallet_transactions ──────────────────────────────────────────────────────
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type wallet_tx_type not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  balance_after_kobo bigint not null,
  reference text, -- links to payments.reference when topup-originated
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_tx_user on public.wallet_transactions(user_id);
create index if not exists idx_wallet_tx_wallet on public.wallet_transactions(wallet_id);

-- ── payments ─────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind payment_kind not null,
  status payment_status not null default 'pending',
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  reference text not null unique, -- Paystack transaction reference
  paystack_authorization_url text,
  paystack_access_code text,
  metadata jsonb not null default '{}'::jsonb,
  related_subscription_id uuid references public.subscriptions(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_reference on public.payments(reference);

-- ── ai_usage_logs ────────────────────────────────────────────────────────────
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  succeeded boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user on public.ai_usage_logs(user_id);
create index if not exists idx_ai_usage_provider on public.ai_usage_logs(provider);

-- ── files (Supabase Storage metadata) ───────────────────────────────────────
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null,
  path text not null,
  cloudinary_public_id text,
  cloudinary_url text,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists idx_files_user on public.files(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- auto-create profile + wallet when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance_kobo)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- wallet transaction ledger integrity: keep wallets.balance_kobo in sync
create or replace function public.apply_wallet_transaction()
returns trigger language plpgsql as $$
begin
  if new.type = 'credit' then
    update public.wallets
      set balance_kobo = balance_kobo + new.amount_kobo, updated_at = now()
      where id = new.wallet_id
      returning balance_kobo into new.balance_after_kobo;
  else
    update public.wallets
      set balance_kobo = balance_kobo - new.amount_kobo, updated_at = now()
      where id = new.wallet_id
      returning balance_kobo into new.balance_after_kobo;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_wallet_transaction on public.wallet_transactions;
create trigger trg_apply_wallet_transaction
  before insert on public.wallet_transactions
  for each row execute function public.apply_wallet_transaction();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- A user's current entitlement snapshot: active plan + wallet balance
create or replace view public.user_entitlements as
select
  p.id as user_id,
  p.email,
  p.role,
  w.balance_kobo,
  s.id as subscription_id,
  s.status as subscription_status,
  sp.code as plan_code,
  s.current_period_end
from public.profiles p
left join public.wallets w on w.user_id = p.id
left join public.subscriptions s
  on s.user_id = p.id and s.status in ('active', 'trialing')
left join public.subscription_plans sp on sp.id = s.plan_id;

-- Admin-facing revenue summary
create or replace view public.payments_summary as
select
  date_trunc('day', created_at) as day,
  kind,
  status,
  count(*) as tx_count,
  sum(amount_kobo) as total_kobo
from public.payments
group by 1, 2, 3
order by 1 desc;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.files enable row level security;

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- subscription_plans (public read, admin write) ---------------------------
drop policy if exists "plans_select_all" on public.subscription_plans;
create policy "plans_select_all" on public.subscription_plans
  for select using (is_active = true or public.is_admin());

drop policy if exists "plans_admin_write" on public.subscription_plans;
create policy "plans_admin_write" on public.subscription_plans
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions ------------------------------------------------------------
drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- wallets --------------------------------------------------------------------
drop policy if exists "wallets_select_own_or_admin" on public.wallets;
create policy "wallets_select_own_or_admin" on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "wallets_admin_write" on public.wallets;
create policy "wallets_admin_write" on public.wallets
  for all using (public.is_admin()) with check (public.is_admin());

-- wallet_transactions ----------------------------------------------------
drop policy if exists "wallet_tx_select_own_or_admin" on public.wallet_transactions;
create policy "wallet_tx_select_own_or_admin" on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "wallet_tx_admin_write" on public.wallet_transactions;
create policy "wallet_tx_admin_write" on public.wallet_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- payments ---------------------------------------------------------------
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (user_id = auth.uid());

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
  for update using (public.is_admin());

-- ai_usage_logs ------------------------------------------------------------
drop policy if exists "ai_logs_select_own_or_admin" on public.ai_usage_logs;
create policy "ai_logs_select_own_or_admin" on public.ai_usage_logs
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "ai_logs_insert_own" on public.ai_usage_logs;
create policy "ai_logs_insert_own" on public.ai_usage_logs
  for insert with check (user_id = auth.uid());

-- files ------------------------------------------------------------------
drop policy if exists "files_select_own_or_admin" on public.files;
create policy "files_select_own_or_admin" on public.files
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "files_crud_own" on public.files;
create policy "files_crud_own" on public.files
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- SEED DATA (safe to run once)
-- ============================================================================
insert into public.subscription_plans (code, name, description, price_kobo, currency, interval, features)
values
  ('free', 'Free', 'Basic access', 0, 'NGN', 'monthly', '["Core features"]'::jsonb),
  ('pro_monthly', 'Pro', 'Full access, billed monthly', 500000, 'NGN', 'monthly', '["All features", "Priority support"]'::jsonb)
on conflict (code) do nothing;
