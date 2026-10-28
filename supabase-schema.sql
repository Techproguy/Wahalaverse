-- WahalaVerse MVP — minimal cloud data layer for authenticated users.
-- Run this in the Supabase SQL Editor BEFORE adding credentials to config.js.
-- This schema does not collect phone numbers, device contacts, or raw IP addresses.
-- Supabase Auth separately manages the authentication email and credentials/session.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text not null check (char_length(owner_name) between 2 and 30),
  title text not null check (char_length(title) between 1 and 80),
  answers smallint[] not null check (cardinality(answers)=7 and answers <@ array[0,1,2]::smallint[]),
  template_version smallint not null default 1 check(template_version=1),
  created_at timestamptz not null default now()
);
create index if not exists challenges_owner_created_idx on public.challenges(owner_id,created_at desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('friendship_completed','simulator_completed')),
  details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object' and octet_length(details::text)<=1500),
  created_at timestamptz not null default now()
);
create index if not exists activities_user_created_idx on public.activities(user_id,created_at desc);

-- Lock down table privileges explicitly as well as enabling RLS.
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.activities enable row level security;
revoke all on table public.profiles, public.challenges, public.activities from anon, authenticated;
grant select,insert on table public.profiles to authenticated;
grant select,insert,delete on table public.challenges to authenticated;
-- Column-scoped grant for anon: public (link) readers get everything they need
-- to PLAY a challenge, but NOT owner_id (the creator's auth.users UUID). This
-- keeps the account identifier out of unauthenticated reads. authenticated keeps
-- full-column select because the app filters a user's own challenges by owner_id.
grant select (id, owner_name, title, answers, template_version, created_at)
  on table public.challenges to anon;
grant select,insert on table public.activities to authenticated;

-- Profiles belong only to their account holders.
create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid())=user_id);
create policy "Create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid())=user_id);
-- Milestone 2 (Phase B): allow a signed-in user to update ONLY their own profile's
-- display_name. Account-scoped by auth.uid(); the 2..30 char length is enforced by
-- the table check constraint. DRAFT — not applied to any live project yet.
grant update (display_name) on table public.profiles to authenticated;
create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);

-- PRIVACY NOTE on this SELECT policy (reviewed for Milestone 1):
--   `using (true)` makes every challenge row readable by anon + authenticated.
--   Implications for a "public by link" product:
--   1. ENUMERATION: because there is no row filter, an anon caller can list the
--      WHOLE table (e.g. GET /rest/v1/challenges with no id filter), not just a
--      single shared link. The unguessable UUID id does NOT protect against this
--      — you don't need to guess ids to dump the set. Harvestable: owner_name,
--      answers (the quiz key), title, created_at. This is acceptable for casual
--      fun (answers are already documented as non-secret; NEVER use for prizes),
--      but it is broader than the app needs (the app only ever reads BY id).
--   2. ACCOUNT ID: mitigated above via a column-scoped grant so anon cannot read
--      owner_id; without that, anon could group all challenges by creator.
--   RECOMMENDED M2 REMEDIATION (needs a live DB + test accounts, out of M1 scope):
--   replace table-level anon SELECT with a SECURITY DEFINER RPC get_challenge(id)
--   that returns a single row, and drop the anon table grant — this removes
--   enumeration entirely while keeping by-link reads. Tracked in REVIEW_NOTES.md.
create policy "Public challenge reading" on public.challenges for select to anon,authenticated
  using (true);
create policy "Create own challenges" on public.challenges for insert to authenticated
  with check ((select auth.uid())=owner_id);
create policy "Delete own challenges" on public.challenges for delete to authenticated
  using ((select auth.uid())=owner_id);

-- All saved activity belongs to the currently signed-in user.
create policy "Read own activity" on public.activities for select to authenticated
  using ((select auth.uid())=user_id);
create policy "Write own activity" on public.activities for insert to authenticated
  with check ((select auth.uid())=user_id);

-- Before real launch: review RLS, install rate limits/CAPTCHA, add account deletion
-- and data export (server-side/admin), and test permissions on both roles.
