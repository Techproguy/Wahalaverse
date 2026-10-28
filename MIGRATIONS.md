# Database migrations — WahalaVerse (Supabase TEST project only)

> **TEST PROJECT ONLY.** Do not run any of this against production. No migration is
> applied automatically. Apply only with explicit product-owner authorization.

## Baseline
- `supabase-schema.sql` is the canonical **fresh-install** schema. Running it once on a
  brand-new TEST project creates `profiles`, `challenges`, `activities` with RLS and the
  **Phase C secure** challenge access (owner-scoped read + `get_challenge` RPC, no anon
  enumeration). A fresh project needs only this file.

## Incremental migrations (`supabase/migrations/`)
Use these to upgrade an **existing** project that was created from the earlier
Milestone-1 baseline (the old `using(true)` enumerable challenge policy).

| Migration | Forward | Rollback |
|---|---|---|
| 0002 — Secure challenge access | `0002_secure_challenge_access.sql` | `0002_secure_challenge_access_rollback.sql` |

### Apply migration 0002 (forward)
1. Open the Supabase **TEST** project → **SQL Editor**.
2. Paste and run `supabase/migrations/0002_secure_challenge_access.sql`.
3. Verify (as separate queries / REST calls):
   - **anon enumeration blocked:** `GET /rest/v1/challenges` with the anon key → empty/denied.
   - **authenticated sees only own:** signed-in `select * from challenges` → only that user's rows.
   - **by-id retrieval works:** `select * from get_challenge('<valid id>')` (or
     `POST /rest/v1/rpc/get_challenge {"cid":"<id>"}`) → exactly one row, **no `owner_id`**.
   - **unknown id:** `get_challenge('00000000-0000-4000-8000-000000000000')` → zero rows.
   - Or run the automated probes: `npm i --no-save @supabase/supabase-js` then set
     `SUPABASE_TEST_URL/ANON_KEY`, `SUPABASE_TEST_A_JWT/_ID`, `SUPABASE_TEST_B_JWT/_ID`,
     and optionally `SUPABASE_TEST_CHALLENGE_ID`, and run `npm run test:rls`.

### Roll back migration 0002
1. In the **TEST** project SQL Editor, paste and run
   `supabase/migrations/0002_secure_challenge_access_rollback.sql`.
2. This drops `get_challenge`, removes the owner-scoped read policy, and restores the
   Milestone-1 public/enumerable read + anon column grant. **Only** for undoing 0002 during
   testing — never leave a project in this (enumerable) state for launch.

## Edge Function — `delete-account` (Phase D; deploy later, with approval)
`supabase/functions/delete-account/index.ts` performs self-service account deletion server-side. It is
**not deployed** in Phase D. When authorized, on the **TEST project**:
```bash
supabase functions deploy delete-account
# REQUIRED for live operations — the exact TEST origin for CORS (do NOT rely on wildcard,
# and do NOT use the production origin):
supabase secrets set SITE_URL=<exact TEST origin, e.g. http://localhost:8080 or your TEST staging URL>
```
**Reserved env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and **`SUPABASE_SERVICE_ROLE_KEY`** are
injected **automatically** by Supabase into hosted Edge Functions — **do NOT set them manually**. The
function reads the injected `SUPABASE_SERVICE_ROLE_KEY` at runtime; verify it can read it in the TEST
runtime (a quick log/health check), rather than configuring it by hand.
**CORS (required for live ops):** `SITE_URL` sets `Access-Control-Allow-Origin`. The wildcard `*` is
only the local/dev default when `SITE_URL` is unset — **set `SITE_URL` to the exact TEST origin before
enabling live use; never use the production WahalaVerse origin as the TEST function's CORS origin.**
**JWT verification:** the function calls `getUser(jwt)` with the caller's token **explicitly**
(Supabase Edge Function pattern); a missing/invalid token → 401 and performs **no** deletion.
Verify: a signed-in user calling it (JWT attached by supabase-js) deletes **only their own** account;
missing/invalid token → 401; non-POST → 405; a row-deletion error stops before the auth user
(account retained, safe to retry), returning a generic `deletion-failed` (details logged server-side).
See `SECURITY_REVIEW_PHASE_D.md`.

## Safety notes
- Never put the `service_role`/secret key in the repo, the browser, or CI. Migrations are run
  by a human in the Supabase dashboard (or via the Supabase CLI with the owner's credentials).
- The app only ever uses the **publishable/anon** key, plus each user's own JWT.
- After any migration, re-run `npm run test:rls` against the TEST project to confirm isolation.
