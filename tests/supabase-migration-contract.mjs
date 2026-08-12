import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260810210000_user_entitlements.sql', import.meta.url);
const sql = (await readFile(migrationUrl, 'utf8'))
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const requiredFragments = [
  'create table if not exists public.user_entitlements',
  'user_id uuid primary key references auth.users(id) on delete cascade',
  'alter table public.user_entitlements enable row level security',
  'alter table public.user_entitlements force row level security',
  'revoke all on table public.user_entitlements from anon, authenticated',
  'grant select (user_id, plan_key, status, features, expires_at, updated_at) on public.user_entitlements to authenticated',
  'create policy "users can read own entitlement" on public.user_entitlements for select to authenticated',
  '(select auth.uid()) = user_id'
];

for (const fragment of requiredFragments) {
  assert.ok(sql.includes(fragment), `Supabase entitlement migration must preserve: ${fragment}`);
}

assert.doesNotMatch(
  sql,
  /create policy[^;]+for\s+(insert|update|delete|all)\s+to\s+authenticated/,
  'Authenticated clients must not receive write policies for server-managed entitlements.'
);

assert.doesNotMatch(
  sql,
  /grant\s+(insert|update|delete|all)[^;]+to\s+(anon|authenticated)/,
  'Anon/authenticated roles must not receive entitlement write grants.'
);

console.log('Supabase entitlement migration contract: PASS');
