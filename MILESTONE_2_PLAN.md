# Milestone 2 — Real account integration (PLAN, for review before implementation)

_Branch: `milestone-2-auth-backend` (off `main` @ `cdf635c`). Date: 2026-10-28._

> **Status: Phase A done; Phase B in progress.** CI, Phase A (auth), the F-1..F-5 fixes, secure
> profile update, and the two-account RLS integration-test scaffold are implemented on this branch
> with automated tests. Remaining Phase B/C items below are PLAN ONLY. No credentials are connected,
> no migrations are run, no data is collected, nothing is deployed, PR #2 is not merged.
>
> **Phase B progress (this round):** F-1 pending-name isolation (email+TTL scoping, consume/clear);
> F-2..F-5 auth state hygiene (field clearing, monotonic `authOpId` stale-response invalidation,
> try/catch/finally busy hygiene); secure `updateProfile` (account-scoped, epoch-guarded, draft
> `Update own profile` policy); and `tests/rls.integration.test.js` (skips without a TEST project).
> Still pending in Phase B/C: live two-account RLS verification, account deletion/export, and the
> Phase C enumeration removal (get_challenge RPC).

## Review additions incorporated (2026-10-28)
1. **GitHub Actions CI** — added (`.github/workflows/ci.yml`): a unit job and a Playwright job on
   push/PR. **Done.**
2. **Email OTP fallback** — implemented in Phase A (`auth.js` + two-stage dialog): the sign-in email
   carries both a magic link and a 6-digit code, so a mobile user whose link opens in a different
   browser can type the code into the browser where they started. **Done (code + mocked tests).**
3. **Harden the challenge RPC** (Phase C) — `security definer`, **fixed `search_path`**, **minimal
   returned columns** (no `owner_id`), and **restricted EXECUTE** (revoke from `public`, grant only
   to `anon`/`authenticated`). Broad enumeration removed for both roles. Updated below.
4. **Account deletion authz** (Phase D) — the deletion endpoint must **authenticate and authorize the
   caller** (verify their JWT, act only on their own account); all privileged (service-role)
   operations stay strictly server-side in an Edge Function. Updated below.

M1 shipped guest-mode reliability + tests. M2 turns the **optional** cloud account on and makes it
safe: real sign-in, strict per-account isolation verified against a live DB, secure challenge
retrieval **without enumeration**, and the data-rights (export/delete) and privacy groundwork
required before any real person's data is collected.

---

## 0. Hard gates (must all be true before M2 enables live cloud usage)
- [ ] **G1 — Enumeration removed** for BOTH `anon` and `authenticated` (the deferred M1 blocker D′).
- [ ] **G2 — Account isolation proven** with two real test accounts (A cannot read/write B's rows).
- [ ] **G3 — Pending signup name cannot leak** between accounts.
- [ ] **G4 — Data export + deletion** path exists (self-serve or documented operator-assisted).
- [ ] **G5 — `privacy.html` finalized** with owner-provided legal identity/contact/retention.
- [ ] **G6 — Auth/email failure handling** is graceful (rate limit, expired link, delivery delay).
- [ ] **G7 — No server secret in the browser**; service-role work lives only in an Edge Function.

Each gate maps to a phase below and to tests. Nothing goes live until all are checked.

---

## Phase A — Supabase project wiring & passwordless auth
**Goal:** verified email magic-link sign-in with correct redirect/mobile return.

**Work**
1. Owner provisions a Supabase project (test/staging first). We put the **project URL + publishable
   (anon) key** in a local, git-ignored `config.local.js` (never the service-role/secret key).
2. Apply `supabase-schema.sql` to the **test** project via a versioned migration (not a live prod DB).
3. Configure **Auth → URL Configuration**: Site URL + redirect allowlist for the dev/staging origins
   (e.g. `http://localhost:8080/**`). The app already sends `emailRedirectTo = origin + pathname`.
4. Confirm `supabase-js` `detectSessionInUrl` resolves the session on magic-link return, including
   the **new-tab mobile return** case (link opened in a different tab than it was requested).
5. **OTP fallback (implemented):** `auth.js` exposes `sendSignInEmail` (link + 6-digit code) and
   `verifyEmailOtp`; the dialog has a second stage where the user types the code. For this to deliver
   a code, the Supabase email template must include the token (`{{ .Token }}`) — an owner dashboard
   setting (see setup actions). Code is covered by deterministic mocked tests now; live code delivery
   is verified once the test project + template are configured.

**Verify / tests**
- Manual: request link → receive → open on desktop and on a mobile browser → session established →
  profile row created → refresh keeps session → sign out clears it.
- Scripted integration (Node, against the test project with the anon key): `signInWithOtp` returns
  no error for a valid email; expired/invalid token path surfaces a clean error.

**Owner dependencies:** Supabase project + anon key; a real mailbox for the test account; decision
on production/redirect domain (can defer to Phase F).

---

## Phase B — Profile & activity isolation (verified against a live DB)
**Goal:** prove RLS actually isolates accounts; eliminate the pending-name leak.

**Work**
1. **Audit RLS with two accounts** (A, B): confirm A cannot `select`/`insert`/`update`/`delete` B's
   `profiles`, `activities`, or B's non-public `challenges` columns. Probe directly via the REST API
   with each account's JWT, not just through the UI.
2. **Pending signup name leak fix (gate G3).** Today `requestSignIn` writes a bare
   `localStorage['wv_pending_name']` and `ensureProfile` falls back to it. If person A requests a
   link and never completes, then person B signs in on the same browser via a link **without**
   `user_metadata.display_name`, B's profile could be created with **A's** name. Planned fix:
   - Store it **scoped to the email + a timestamp**: `wv_pending_name = {email, name, ts}` (JSON).
   - In `ensureProfile`, use the pending name **only if** `pending.email === state.user.email` and it
     is within a short TTL (e.g. 1h); otherwise ignore it.
   - **Clear it on consumption** (successful profile create), on sign-out, and on email mismatch.
   - Keep `user_metadata.display_name` (carried in the magic link) as the **primary** source; the
     pending name is a same-email fallback only.
3. **Profile update** (secure): allow a signed-in user to change their own `display_name`
   (RLS `update` policy scoped to `auth.uid() = user_id`; add the `update` grant + policy — currently
   only `select,insert` are granted). Length/charset validation mirrors the existing check constraint.
4. Confirm the M1 cross-account/session isolation fixes (`account.js`) hold against the live DB.

**Verify / tests**
- New deterministic unit tests for the pending-name decision (same-email use, cross-email ignore,
  TTL expiry, cleared on sign-out) — pure function, mockable like the existing `account.test.js`.
- Live two-account RLS probes (documented commands + expected `permission denied` / empty results).

**Owner dependencies:** none beyond Phase A.

---

## Phase C — Secure challenge retrieval (remove enumeration — gate G1)
**Goal:** a challenge is readable **by its link/id**, but the table cannot be enumerated by anyone.

**Problem (carried from M1):** `create policy "Public challenge reading" ... using (true)` lets any
`anon` **or** `authenticated` caller list the entire `challenges` table (harvesting owner_name,
answers, created_at). The unguessable UUID does not help because no id filter is required.

**Planned remediation (migration, applied to the test project only in M2):**
1. **Drop** the `using(true)` SELECT policy and **revoke** table-level `select` on `challenges` from
   `anon`; replace the broad authenticated read with an **owner-scoped** policy so a signed-in user
   can still list **their own** challenges (needed by `refreshAccount`):
   `create policy "Read own challenges" ... for select to authenticated using (auth.uid() = owner_id);`
2. Add a `SECURITY DEFINER` function that returns a **single** challenge by id, public columns only
   (no `owner_id`), e.g.:
   ```sql
   create function public.get_challenge(cid uuid)
   returns table (id uuid, owner_name text, title text, answers smallint[], template_version smallint, created_at timestamptz)
   language sql
   security definer
   stable
   set search_path = ''                      -- fixed, empty search_path (fully-qualified names below)
   as $$
     select id, owner_name, title, answers, template_version, created_at
     from public.challenges where id = cid;  -- minimal columns: NO owner_id
   $$;
   revoke all on function public.get_challenge(uuid) from public;   -- restricted EXECUTE
   grant execute on function public.get_challenge(uuid) to anon, authenticated;
   ```
   Hardening: `security definer` + **fixed `search_path = ''`** (prevents search-path hijacking;
   all names fully qualified), **minimal columns** (never returns `owner_id`), and **EXECUTE revoked
   from `public`** then granted only to `anon`/`authenticated`. This is the **only** way to read
   someone else's challenge — by id, one row, no listing.
3. **App change:** `loadChallenge` switches the cloud path from
   `.from('challenges').select(...).eq('id',...)` to `.rpc('get_challenge', { cid })`. The
   own-challenges list in `refreshAccount` continues to use the owner-scoped table policy.

**Verify / tests**
- Live: `anon` and `authenticated` attempts to `select * from challenges` (no filter) return
  **empty/denied**; `get_challenge(validId)` returns one row; `get_challenge(randomId)` returns none;
  a user can still list only their own challenges.
- E2E: opening a cloud `?c=<id>` link still plays (now via RPC).

**Owner dependencies:** approval to apply this migration to the **test** project.

---

## Phase D — Data export & account deletion (gate G4)
**Goal:** user data-rights before any live collection; **no server secret in the browser (G7)**.

**Work**
1. **Export (self-serve, no secret):** a signed-in user can download a JSON of their own
   `profile + activities + challenges` (all RLS-scoped reads the client can already make). Pure
   client assembly + a `Blob` download. Low risk.
2. **Deletion (authenticate + authorize the caller; privileged ops server-side only):** deleting the
   auth user requires the admin API, which must **never** ship to the browser. Plan: a **Supabase Edge
   Function** `delete-account` that (a) **authenticates** the caller by verifying their JWT
   (`auth.getUser(jwt)`), (b) **authorizes** the action against **only that same user's own id** (the
   function derives the target id from the verified token — it never accepts a user id from the
   request body), (c) calls `auth.admin.deleteUser(self)` using the service-role key **held only in
   the function's server environment** (never committed, never printed, never returned). FK
   `on delete cascade` already removes the user's profile/challenges/activities. Until the function is
   built/approved, provide a **documented operator-assisted** deletion process + a contact channel
   (and do not enable public signup before one of these exists).
3. UI entry points in "My corner": "Download my data" and "Delete my account" (with confirm).

**Verify / tests**
- Export: signed-in export contains only the caller's rows; guest export is local-only.
- Deletion (test project): after the function runs, the account and all its rows are gone; a second
  call with a stale JWT fails cleanly.

**Owner dependencies:** decision on self-serve Edge Function vs interim operator-assisted; if the
Edge Function is chosen, owner authorizes creating it in the Supabase project (service-role stays in
the function env; we never commit or print it).

---

## Phase E — Graceful auth/email failure handling (gate G6)
**Goal:** no dead-ends when email/auth misbehaves.

**Work:** clear, distinct UX for: invalid email, rate-limited sends, send success ("check your inbox;
delivery can take a minute"), expired/used magic link on return, and offline/network errors. Keep the
existing toast pattern; add a resend affordance with a cooldown.

**Verify / tests:** unit tests for the error-to-message mapping; manual expired-link return.

---

## Phase F — Privacy finalization (gate G5)
**Goal:** `privacy.html` is publishable; data practices are honest and minimal.

**Work (owner-provided content — we will NOT invent a legal operator or certify compliance):**
- Fill operator legal identity, privacy/support contact, hosting region(s)/processors, and retention
  periods. Reflect the actual data flows (email + display name + activity for signed-in users; guest
  data is local; challenge links encode answers; no phone/contacts/location/payment).
- Document the export/deletion process and age (18+) posture. Owner should obtain a Nigerian Data
  Protection Act review before public beta.
- Keep "answers are visible in guest links — not for prizes" and "no third-party tracking" accurate.

**Owner dependencies:** all legal/operator details; legal review.

---

## Guest → account data at sign-in (design note)
M1 attributes guest activity to the current **browser session** and only auto-syncs this-session
items. On a magic-link return in a **new tab**, the session id differs, so guest history will **not**
auto-attach (the safe default). For M2, recommended: an explicit **"Import your guest history to this
account?"** prompt shown once after first sign-in when unowned local items exist — never silent. This
also cleanly satisfies the "don't attach another guest's history" requirement. (Small, additive;
included here for review — not assumed.)

---

## Testing strategy for M2
- **Unit (node --test):** extend `account.test.js` with the pending-name decision and error-mapping;
  all mocked/deterministic (no network).
- **Live integration (manual + scripted against the TEST project):** RLS two-account probes,
  enumeration-denied checks, `get_challenge` behavior, export contents, deletion. Documented as
  runnable commands with expected outputs in `REVIEW_NOTES.md` for M2.
- **E2E (Playwright):** guest flows stay green; add signed-in cloud flows gated behind a configured
  test project (skipped when `config.local.js` is absent, so the default suite stays credential-free).

---

## Required setup actions for the PRODUCT OWNER
1. **Create a Supabase project** (start with a test/staging project, not production).
2. Share the **Project URL** and **publishable/anon key** only. **Never** the `service_role`/secret
   key, SMTP password, or any production credential (those are pasted into the Supabase dashboard /
   Edge Function env by the owner, not into the repo or chat).
3. Authorize applying `supabase-schema.sql` + the Phase C/B migrations to the **test** project.
4. Provide a **real test mailbox** for end-to-end magic-link testing.
4b. **Enable the OTP code** in Supabase **Auth → Email Templates → Magic Link**: include the token
   (e.g. `{{ .Token }}`) so the same email carries both the link and the 6-digit code the fallback
   uses. (Dashboard setting; no code change.)
5. Decide **deletion mechanism**: self-serve Edge Function (authorize creating it) **or** interim
   operator-assisted process + a published contact address.
6. Provide **privacy.html content**: legal operator identity, privacy/support contact, hosting
   region(s)/processors, retention periods; obtain a **Nigerian Data Protection Act** review.
7. Confirm the **production/redirect domain** (can be deferred until just before Phase A go-live on
   staging, required before Milestone 3).
8. Confirm **email sender** plan for beta scale (default Supabase limits are not enough for launch —
   SMTP configuration is owner-side; relevant for M3 but flagged now).

## Explicit non-goals / guardrails for M2
- No production deployment, no production credentials, no production migrations, no collection of real
  (non-test) user data — all require separate owner approval.
- No service-role/admin key in the browser, ever.
- No invented legal operator or compliance certification.
- Guest play and frictionless share links remain intact and credential-free.

## Suggested implementation order
A → C (close the enumeration gate early) → B → E → D → F, each as a small reviewable commit with
tests, pausing for approval before touching anything beyond the test project.
