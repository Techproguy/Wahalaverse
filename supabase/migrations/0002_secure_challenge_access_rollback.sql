-- Rollback for migration 0002 — Secure challenge access (Milestone 2, Phase C)
-- Reverts a TEST project to the Milestone-1 challenge access model
-- (public/by-link enumerable read, anon column-scoped grant, no RPC).
--
-- TEST PROJECT ONLY. Running this re-introduces table enumeration, so only use it
-- to undo 0002 during testing — never leave a project in this state for launch.

begin;

-- 1) Remove the RPC.
drop function if exists public.get_challenge(uuid);

-- 2) Remove the owner-scoped read policy, restore the broad public read.
drop policy if exists "Read own challenges" on public.challenges;
create policy "Public challenge reading" on public.challenges for select to anon, authenticated
  using (true);

-- 3) Restore the Milestone-1 anon column-scoped grant (no owner_id).
grant select (id, owner_name, title, answers, template_version, created_at)
  on table public.challenges to anon;

commit;
