create table public.accounts (
  id uuid primary key,
  owner_id uuid,
  api_token text
);

create table public.messages (
  id uuid primary key,
  owner_id uuid,
  body text
);

alter table public.messages enable row level security;

create policy messages_read_all
  on public.messages
  for select
  using (true);

create policy messages_update
  on public.messages
  for update
  to authenticated
  using ((select auth.uid()) = owner_id);

grant all on table public.accounts to anon;
grant select, insert, update on all tables in schema public to authenticated;

create or replace function public.admin_helper()
returns void
language plpgsql
security definer
as $$
begin
  perform 1;
end;
$$;

create view public.user_directory as
select id, email from auth.users;

create materialized view public.account_rollup as
select owner_id, count(*) as total from public.accounts group by owner_id;
