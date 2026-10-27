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
grant select on table public.challenges to anon;
grant select,insert on table public.activities to authenticated;

-- Profiles belong only to their account holders.
create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid())=user_id);
create policy "Create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid())=user_id);

-- Anyone with the id can play a public challenge. Remember: answers are public
-- to technical users who inspect the API; suitable for fun quizzes, not prizes.
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
