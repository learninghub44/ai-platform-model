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
