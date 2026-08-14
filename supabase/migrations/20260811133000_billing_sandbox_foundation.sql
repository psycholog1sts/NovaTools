begin;

alter table public.user_entitlements
  drop constraint if exists user_entitlements_status_check;
alter table public.user_entitlements
  add constraint user_entitlements_status_check
  check (status in ('inactive', 'active', 'trialing', 'past_due', 'paused', 'unpaid', 'canceled', 'expired'));

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_customers (
  provider text not null check (provider in ('lemon_squeezy', 'paddle')),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_customer_id text not null check (char_length(provider_customer_id) between 1 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, user_id),
  unique (provider, provider_customer_id)
);

create table if not exists public.subscriptions (
  provider text not null check (provider in ('lemon_squeezy', 'paddle')),
  provider_subscription_id text not null check (char_length(provider_subscription_id) between 1 and 128),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_customer_id text not null check (char_length(provider_customer_id) between 1 and 128),
  plan_key text not null check (plan_key in ('pro_monthly', 'pro_annual')),
  status text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'unpaid', 'canceled', 'expired')),
  current_period_end timestamptz,
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, provider_subscription_id)
);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_customer_idx on public.subscriptions(provider, provider_customer_id);

create table if not exists public.billing_webhook_events (
  provider text not null check (provider in ('lemon_squeezy', 'paddle')),
  event_key text not null check (char_length(event_key) between 1 and 128),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  event_type text not null check (char_length(event_type) between 1 and 128),
  occurred_at timestamptz not null,
  status text not null default 'received' check (status in ('received', 'processed', 'rejected')),
  processing_result text,
  attempts integer not null default 1 check (attempts > 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, event_key)
);
create index if not exists billing_webhook_events_status_idx
  on public.billing_webhook_events(status, received_at);

create table if not exists public.usage_limits (
  plan_key text not null check (plan_key in ('free', 'pro_monthly', 'pro_annual')),
  feature_key text not null check (char_length(feature_key) between 1 and 80),
  window_seconds integer not null check (window_seconds between 60 and 2678400),
  max_quantity integer not null check (max_quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (plan_key, feature_key)
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null check (char_length(feature_key) between 1 and 80),
  quantity integer not null default 1 check (quantity > 0 and quantity <= 10000),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  occurred_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists usage_events_window_idx
  on public.usage_events(user_id, feature_key, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_customers force row level security;
alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
alter table public.usage_limits enable row level security;
alter table public.usage_limits force row level security;
alter table public.usage_events enable row level security;
alter table public.usage_events force row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.billing_customers from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.billing_webhook_events from anon, authenticated;
revoke all on table public.usage_limits from anon, authenticated;
revoke all on table public.usage_events from anon, authenticated;

grant select (user_id, display_name, created_at, updated_at) on public.profiles to authenticated;
grant insert (user_id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.process_billing_subscription_event(
  p_provider text,
  p_event_key text,
  p_payload_hash text,
  p_event_type text,
  p_event_occurred_at timestamptz,
  p_subscription_id text,
  p_customer_id text,
  p_user_id uuid,
  p_plan_key text,
  p_status text,
  p_expires_at timestamptz,
  p_features text[]
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer := 0;
  v_subscription_written integer := 0;
begin
  if p_provider not in ('lemon_squeezy', 'paddle')
    or p_event_key is null
    or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_event_type is null
    or p_event_occurred_at is null
    or p_event_occurred_at > now() + interval '5 minutes'
    or p_subscription_id is null
    or p_customer_id is null
    or p_plan_key not in ('pro_monthly', 'pro_annual')
    or p_status not in ('active', 'trialing', 'past_due', 'paused', 'unpaid', 'canceled', 'expired')
  then
    return 'invalid_event';
  end if;

  insert into public.billing_webhook_events (
    provider, event_key, payload_hash, event_type, occurred_at
  ) values (
    p_provider, p_event_key, p_payload_hash, p_event_type, p_event_occurred_at
  ) on conflict (provider, event_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    update public.billing_webhook_events
      set attempts = attempts + 1
      where provider = p_provider and event_key = p_event_key;
    return 'duplicate';
  end if;

  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    update public.billing_webhook_events
      set status = 'rejected', processing_result = 'unbound_user', processed_at = now()
      where provider = p_provider and event_key = p_event_key;
    return 'unbound_user';
  end if;

  insert into public.billing_customers (provider, user_id, provider_customer_id)
  values (p_provider, p_user_id, p_customer_id)
  on conflict (provider, user_id) do update
    set provider_customer_id = excluded.provider_customer_id,
        updated_at = now();

  insert into public.subscriptions (
    provider, provider_subscription_id, user_id, provider_customer_id,
    plan_key, status, current_period_end, last_event_at
  ) values (
    p_provider, p_subscription_id, p_user_id, p_customer_id,
    p_plan_key, p_status, p_expires_at, p_event_occurred_at
  )
  on conflict (provider, provider_subscription_id) do update
    set user_id = excluded.user_id,
        provider_customer_id = excluded.provider_customer_id,
        plan_key = excluded.plan_key,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        last_event_at = excluded.last_event_at,
        updated_at = now()
    where excluded.last_event_at >= public.subscriptions.last_event_at;
  get diagnostics v_subscription_written = row_count;

  if v_subscription_written = 0 then
    update public.billing_webhook_events
      set status = 'processed', processing_result = 'stale', processed_at = now()
      where provider = p_provider and event_key = p_event_key;
    return 'stale';
  end if;

  insert into public.user_entitlements (user_id, plan_key, status, features, expires_at, updated_at)
  values (
    p_user_id,
    case when p_status in ('active', 'trialing') then p_plan_key else 'free' end,
    p_status,
    case when p_status in ('active', 'trialing') then coalesce(p_features, '{}'::text[]) else '{}'::text[] end,
    p_expires_at,
    now()
  )
  on conflict (user_id) do update
    set plan_key = excluded.plan_key,
        status = excluded.status,
        features = excluded.features,
        expires_at = excluded.expires_at,
        updated_at = now();

  update public.billing_webhook_events
    set status = 'processed', processing_result = 'applied', processed_at = now()
    where provider = p_provider and event_key = p_event_key;

  return 'applied';
end;
$$;

revoke all on function public.process_billing_subscription_event(
  text, text, text, text, timestamptz, text, text, uuid, text, text, timestamptz, text[]
) from public, anon, authenticated;
grant execute on function public.process_billing_subscription_event(
  text, text, text, text, timestamptz, text, text, uuid, text, text, timestamptz, text[]
) to service_role;

commit;
