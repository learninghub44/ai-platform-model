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
