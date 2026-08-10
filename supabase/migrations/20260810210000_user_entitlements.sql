begin;

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_key text not null default 'free'
    check (plan_key in ('free', 'pro_monthly', 'pro_annual')),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'trialing', 'past_due', 'canceled')),
  features text[] not null default '{}'::text[]
    check (
      features <@ array[
        'batch_workflows',
        'saved_presets',
        'workflow_chaining',
        'bulk_export',
        'ad_free',
        'local_workflow_history'
      ]::text[]
    ),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.user_entitlements is
  'Server-managed subscription entitlement projection. Authenticated users may read only their own row.';

alter table public.user_entitlements enable row level security;
alter table public.user_entitlements force row level security;

revoke all on table public.user_entitlements from anon, authenticated;
grant select (user_id, plan_key, status, features, expires_at, updated_at)
  on public.user_entitlements to authenticated;

drop policy if exists "Users can read own entitlement" on public.user_entitlements;
create policy "Users can read own entitlement"
  on public.user_entitlements
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );

commit;
