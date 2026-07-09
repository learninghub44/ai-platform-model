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
