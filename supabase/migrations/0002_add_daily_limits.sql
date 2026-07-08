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
