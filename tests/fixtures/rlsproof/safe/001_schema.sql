create table public.profiles (
  id uuid primary key,
  owner_id uuid not null,
  display_name text
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

grant select, insert, update on table public.profiles to authenticated;
