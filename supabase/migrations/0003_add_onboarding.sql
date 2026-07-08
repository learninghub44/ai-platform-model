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
