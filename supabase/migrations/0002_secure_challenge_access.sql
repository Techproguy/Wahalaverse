-- Migration 0002 — Secure challenge access (Milestone 2, Phase C)
-- FORWARD migration. Upgrades a project created from the Milestone-1 baseline
-- (supabase-schema.sql with the old `using(true)` challenge SELECT policy) to the
-- Phase C secure model: no table-level enumeration; by-id reads via an RPC.
--
-- Apply to a DEDICATED SUPABASE TEST PROJECT ONLY, and only with explicit
-- authorization. Do NOT run against production. Rollback: 0002_..._rollback.sql.
--
-- Idempotent where practical (drop if exists / create or replace).

begin;

-- 1) Remove the broad, enumerable public read + the anon table grant.
drop policy if exists "Public challenge reading" on public.challenges;
revoke select on table public.challenges from anon;

-- 2) Authenticated users may read ONLY their own challenges (no enumeration of others).
drop policy if exists "Read own challenges" on public.challenges;
create policy "Read own challenges" on public.challenges for select to authenticated
  using ((select auth.uid()) = owner_id);

-- 3) By-id read for everyone (incl. anon) via a hardened SECURITY DEFINER RPC.
--    Empty search_path + schema-qualified names; minimal columns (no owner_id).
create or replace function public.get_challenge(cid uuid)
returns table (
  id uuid,
  owner_name text,
  title text,
  answers smallint[],
  template_version smallint,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select c.id, c.owner_name, c.title, c.answers, c.template_version, c.created_at
  from public.challenges c
  where c.id = cid
  limit 1
$$;

-- 4) Restrict EXECUTE: revoke from PUBLIC, grant only to anon + authenticated.
revoke all on function public.get_challenge(uuid) from public;
grant execute on function public.get_challenge(uuid) to anon, authenticated;

commit;

-- Post-conditions to verify (see MIGRATIONS.md):
--   • anon: GET /rest/v1/challenges  -> empty/denied (no enumeration)
--   • authenticated: select from challenges -> only own rows
--   • anon/authenticated: rpc get_challenge(<valid id>) -> exactly one row, no owner_id
--   • rpc get_challenge(<unknown id>) -> zero rows
