-- ============================================================================
-- CATCHUP_reference_all_migrations_0001-0009.sql
--
-- NOT a real migration — this is a reference/backup copy combining
-- 0001 through 0009 into one file. It exists because the live Supabase
-- project fell out of sync with this migrations folder (some migrations
-- were committed here but never actually run against production), which
-- caused a string of "column does not exist" / "profile not found" bugs.
--
-- If this ever happens again: paste this whole file into the Supabase
-- SQL Editor and run it. Every migration in here uses idempotent patterns
-- (if not exists / or replace / on conflict do nothing), so re-running
-- ones that already applied is harmless — only the genuinely missing
-- pieces will actually change anything.
--
-- Do NOT number/rename this as 0010+ — it's a combined snapshot of prior
-- migrations, not a new one. Real new changes should still get their own
-- numbered migration file as usual.
-- ============================================================================

-- ============================================================================
-- FILE: 0001_init.sql
-- ============================================================================
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
  currency text not null default 'KES'
    check (currency in ('NGN','USD','GHS','ZAR','KES','XOF')),
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
  currency text not null default 'KES'
    check (currency in ('NGN','USD','GHS','ZAR','KES','XOF')),
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
  currency text not null default 'KES'
    check (currency in ('NGN','USD','GHS','ZAR','KES','XOF')),
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
  w.currency,
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
-- Prices are in the subunit Paystack expects (major unit * 100).
-- KES is this account's home currency (Kenya-registered Paystack account).
insert into public.subscription_plans (code, name, description, price_kobo, currency, interval, features)
values
  ('free', 'Free', 'Basic access', 0, 'KES', 'monthly', '["Core features"]'::jsonb),
  ('pro_monthly', 'Pro', 'Full access, billed monthly', 150000, 'KES', 'monthly', '["All features", "Priority support"]'::jsonb)
on conflict (code) do nothing;


-- ============================================================================
-- FILE: 0002_add_daily_limits.sql
-- ============================================================================
-- ============================================================================
-- 0002_add_daily_limits.sql
-- Add daily usage limits and tracking for free tier
-- ============================================================================

-- Add daily usage tracking to profiles
alter table public.profiles 
add column if not exists daily_requests_count integer not null default 0,
add column if not exists daily_requests_limit integer not null default 10,
add column if not exists daily_requests_reset timestamptz not null default (now() + interval '1 day');

-- Add daily usage tracking to ai_usage_logs
alter table public.ai_usage_logs
add column if not exists is_daily_tracked boolean not null default false;

-- Function to reset daily limits
create or replace function public.reset_daily_limits()
returns trigger language plpgsql as $$
begin
  if old.daily_requests_reset <= now() then
    new.daily_requests_count = 0;
    new.daily_requests_reset = now() + interval '1 day';
  end if;
  return new;
end;
$$;

-- Trigger to auto-reset daily limits when checking
drop trigger if exists trg_reset_daily_limits on public.profiles;
create trigger trg_reset_daily_limits
  before update on public.profiles
  for each row execute function public.reset_daily_limits();

-- Function to increment daily usage
create or replace function public.increment_daily_usage(user_id uuid)
returns void language plpgsql as $$
begin
  update public.profiles
  set daily_requests_count = daily_requests_count + 1
  where id = user_id;
end;
$$;

-- Update user_entitlements view to include daily limits
create or replace view public.user_entitlements as
select
  p.id as user_id,
  p.email,
  p.role,
  w.balance_kobo,
  w.currency,
  s.id as subscription_id,
  s.status as subscription_status,
  sp.code as plan_code,
  s.current_period_end,
  p.daily_requests_count,
  p.daily_requests_limit,
  p.daily_requests_reset
from public.profiles p
left join public.wallets w on w.user_id = p.id
left join public.subscriptions s
  on s.user_id = p.id and s.status in ('active', 'trialing')
left join public.subscription_plans sp on sp.id = s.plan_id;

-- Update subscription plans with cheaper pricing and daily limits
update public.subscription_plans
set 
  price_kobo = 0,
  features = '["10 requests per day", "Basic templates", "Standard response speed"]'::jsonb
where code = 'free';

-- Update or insert new affordable plans
insert into public.subscription_plans (code, name, description, price_kobo, currency, interval, features)
values
  ('plus_monthly', 'Plus', 'Enhanced features, billed monthly', 50000, 'KES', 'monthly', '["100 requests per day", "All templates", "Faster response speed", "Priority support"]'::jsonb),
  ('pro_monthly', 'Pro', 'Full access, billed monthly', 150000, 'KES', 'monthly', '["Unlimited requests", "All templates", "Fastest response speed", "Priority support", "Early access to features"]'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_kobo = excluded.price_kobo,
  features = excluded.features;

-- Add function to update daily limit based on subscription
create or replace function public.update_daily_limit_from_subscription()
returns trigger language plpgsql as $$
declare
  new_limit integer;
begin
  case new.status
    when 'active' then
      select case 
        when sp.code = 'free' then 10
        when sp.code = 'plus_monthly' then 100
        when sp.code = 'pro_monthly' then 999999 -- effectively unlimited
        else 10
      end into new_limit
      from public.subscription_plans sp
      where sp.id = new.plan_id;
      
      update public.profiles
      set daily_requests_limit = new_limit
      where id = new.user_id;
    else
      -- Reset to free tier limit when subscription is not active
      update public.profiles
      set daily_requests_limit = 10
      where id = new.user_id;
  end case;
  return new;
end;
$$;

drop trigger if exists trg_update_daily_limit on public.subscriptions;
create trigger trg_update_daily_limit
  after insert or update on public.subscriptions
  for each row execute function public.update_daily_limit_from_subscription();


-- ============================================================================
-- FILE: 0003_add_onboarding.sql
-- ============================================================================
-- ============================================================================
-- 0003_add_onboarding.sql
-- Adds step-by-step onboarding fields to profiles.
-- ============================================================================

do $$ begin
  create type account_type as enum ('individual', 'team');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role_type text,               -- "who are you" e.g. founder, developer, marketer, student, other
  add column if not exists account_type account_type,     -- individual or team
  add column if not exists team_name text,
  add column if not exists team_size text,                -- "1-3", "4-10", "11-25", "25+"
  add column if not exists primary_use_case text,          -- cv_writing, content_writing, code_assistant, design_ideas, other
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists idx_profiles_onboarding_completed
  on public.profiles(onboarding_completed_at);


-- ============================================================================
-- FILE: 0004_add_conversations.sql
-- ============================================================================
-- ============================================================================
-- 0004_add_conversations.sql
-- Chat history: conversations + messages, with pin, share, and edit support.
-- ============================================================================

do $$ begin
  create type message_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

-- ── conversations ────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat',
  pinned boolean not null default false,
  pinned_at timestamptz,
  is_shared boolean not null default false,
  share_id uuid unique,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user on public.conversations(user_id);
create index if not exists idx_conversations_user_last_message
  on public.conversations(user_id, pinned desc, last_message_at desc);
create index if not exists idx_conversations_share_id on public.conversations(share_id)
  where share_id is not null;

-- ── messages ─────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text not null,
  error boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- keep conversations.last_message_at and updated_at in sync automatically
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message on public.messages;
create trigger trg_touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_own_or_shared_or_admin" on public.conversations;
create policy "conversations_select_own_or_shared_or_admin" on public.conversations
  for select using (user_id = auth.uid() or is_shared = true or public.is_admin());

drop policy if exists "conversations_crud_own" on public.conversations;
create policy "conversations_crud_own" on public.conversations
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "messages_select_own_or_shared_or_admin" on public.messages;
create policy "messages_select_own_or_shared_or_admin" on public.messages
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.is_shared = true
    )
  );

drop policy if exists "messages_crud_own" on public.messages;
create policy "messages_crud_own" on public.messages
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());


-- ============================================================================
-- FILE: 0005_fix_table_grants.sql
-- ============================================================================
-- ============================================================================
-- 0005_fix_table_grants.sql
-- Restores table-level GRANTs on public schema objects.
--
-- RLS policies only take effect once a role already has the underlying
-- table-level privilege; without it Postgres throws "permission denied for
-- table X" before RLS is even evaluated. Supabase normally wires this up
-- automatically via `alter default privileges`, but that only applies to
-- tables created *after* the default privilege rule exists — and it can be
-- silently lost after a db reset, a manual REVOKE, or migrations applied
-- outside Supabase's usual pipeline. This migration is idempotent and safe
-- to re-run any time this class of error shows up again.
-- ============================================================================

-- Existing tables --------------------------------------------------------
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;

grant select on public.subscription_plans to authenticated, anon;

grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.wallets to authenticated;
grant select, insert, update, delete on public.wallet_transactions to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.ai_usage_logs to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

-- service_role bypasses RLS but still needs the base grant to touch tables
-- from webhooks / server-side jobs that use the service-role client.
grant all on all tables in schema public to service_role;

-- Views (querying a view still needs a grant on the view itself, even
-- though the underlying tables are already granted).
grant select on public.user_entitlements to authenticated;
grant select on public.payments_summary to authenticated;

-- Sequences (bigserial/identity columns need USAGE on their sequence for
-- inserts to work under RLS-restricted roles).
grant usage on all sequences in schema public to authenticated;

-- Make sure this doesn't regress again: any table created by future
-- migrations under the role running this migration will automatically
-- carry these grants too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage on sequences to authenticated;


-- ============================================================================
-- FILE: 0006_add_message_attachments.sql
-- ============================================================================
-- ============================================================================
-- 0006_add_message_attachments.sql
-- Batch 2: real file attachments on chat messages (drag-and-drop upload).
-- ============================================================================

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Let files be traced back to the conversation they were attached in, so a
-- future "delete conversation" cleanup job can also remove orphaned uploads.
alter table public.files
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

create index if not exists idx_files_conversation on public.files(conversation_id)
  where conversation_id is not null;


-- ============================================================================
-- FILE: 0007_add_folders_and_image_gen.sql
-- ============================================================================
-- ============================================================================
-- 0007_add_folders_and_image_gen.sql
-- Batch 3: conversation folders, and metadata for AI-generated images
-- (upscale / variations / regenerate live entirely in the attachments jsonb,
-- so no new column is needed on messages for that part).
-- ============================================================================

-- ── folders ──────────────────────────────────────────────────────────────────
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_folders_user on public.folders(user_id, position);

alter table public.conversations
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists idx_conversations_folder on public.conversations(folder_id)
  where folder_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.folders enable row level security;

drop policy if exists "folders_crud_own" on public.folders;
create policy "folders_crud_own" on public.folders
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Deleting a folder shouldn't delete its conversations — just drop them back
-- to "no folder" so nothing is silently lost.
-- (the on delete set null above already covers this at the DB level)


-- ============================================================================
-- FILE: 0008_ensure_grants.sql
-- ============================================================================
-- ============================================================================
-- 0004_ensure_grants.sql
-- Belt-and-suspenders: explicitly grant table privileges to anon/authenticated.
-- RLS policies control *which rows* a role can touch, but Postgres still
-- requires a baseline GRANT on the table itself — without it you get
-- "permission denied for table X" (42501) even with a correct RLS policy.
-- Safe to run repeatedly.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to anon, authenticated;

-- Make sure future tables/sequences inherit the same grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;


-- ============================================================================
-- FILE: 0009_backfill_missing_profiles.sql
-- ============================================================================
-- ============================================================================
-- 0009_backfill_missing_profiles.sql
-- One-time backfill for auth.users rows that never got a matching
-- public.profiles / public.wallets row.
--
-- Root cause: public.handle_new_user() is an AFTER INSERT trigger on
-- auth.users. It only fires for signups that happen after the trigger
-- exists on the live database. Any account created before this trigger
-- was deployed (or during a window where it briefly failed) has no
-- profiles row, which causes /api/ai/generate to return 404 "Profile not
-- found" for an otherwise correctly authenticated user.
--
-- This migration is idempotent: safe to run multiple times.
-- ============================================================================

-- Backfill missing profiles rows
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Backfill missing wallets rows for any user who now has (or already had)
-- a profiles row but no wallet
insert into public.wallets (user_id, balance_kobo)
select
  p.id,
  0
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.user_id is null
on conflict (user_id) do nothing;

-- Sanity check: report counts affected (visible in Supabase SQL Editor output)
do $$
declare
  missing_profiles_before integer;
  missing_wallets_before integer;
begin
  select count(*) into missing_profiles_before
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null;

  select count(*) into missing_wallets_before
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  where w.user_id is null;

  raise notice 'Remaining users without profiles after backfill: %', missing_profiles_before;
  raise notice 'Remaining profiles without wallets after backfill: %', missing_wallets_before;
end $$;


