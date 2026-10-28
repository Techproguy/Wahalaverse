# Security review — Milestone 2, Phase D

_Commit `9ca6503` on `milestone-2-auth-backend`. Scope: self-service data export +
account deletion, RPC-hardening evaluation, sign-out scope documentation. No
migrations applied, no Edge Function deployed, no production change, PR #2 not merged._

## 1. Account deletion — authorization model (requirements 1–4)
**Design:** deletion is performed by the `delete-account` **Edge Function** (server-side), never in
the browser.

| Control | How |
|---|---|
| Authorize by verified identity | The function calls `auth.getUser()` with the caller's bearer token and uses **that** `user.id`. |
| Never trust client-supplied id | The request has **no body/uid**; `account.deleteAccount()` sends only `{method:'POST'}`. The function ignores any body. |
| Service-role stays server-side | `SUPABASE_SERVICE_ROLE_KEY` is read from the function env only; it is never in the repo, the client bundle, CI, or any response. |
| Failed / partial deletion | App rows are deleted first (idempotent, keyed by the verified uid), then the auth user. Errors are collected and returned as `{ok:false, error:'partial-failure', details:[...]}` with HTTP 500 — **no false success**. |
| Retry safety | All deletes are idempotent by uid, so a client retry after a partial failure converges; FK `ON DELETE CASCADE` also backstops orphan rows when the auth user is removed. |
| Client UX | Confirm dialog → invoke → on success sign out + clear; on failure an honest "could not delete… try again or contact support". |

**Residual / live-test items (needs the TEST project + deployed function):**
- Verify a user can delete **only** themselves (A's token cannot delete B — guaranteed by deriving uid
  from the token, but confirm live).
- Verify behavior if `auth.admin.deleteUser` succeeds but a row delete had failed first (ordering makes
  this safe: rows go first; if the auth delete fails, rows may already be gone — acceptable, and a retry
  completes it).
- Confirm the function rejects a missing/invalid/expired token (401) and non-POST (405).

## 2. Data export (requirement 1)
- `account.exportData()` reads only the caller's **own** rows (profiles/activities own-only RLS;
  challenges filtered to `owner_id`), epoch-guarded (a mid-export identity change discards the result),
  and **fails rather than exporting partial data** if any query errors.
- Output is assembled and downloaded entirely client-side (Blob) — no new server surface. Contains the
  user's own profile, activities, and challenges + their account id/email; no other users' data.

## 3. RPC hardening evaluation — exposed function vs privileged-core + wrapper (requirement B)
**Question:** can `get_challenge` be further hardened with a non-exposed privileged function and a
narrow public wrapper?

**Analysis.** The split pattern (an internal `SECURITY DEFINER` function with **no** role grants, plus
a thin `SECURITY INVOKER` public wrapper that validates input and calls it) is valuable when the
privileged routine does **more** than the public path should expose, or performs writes, so the wrapper
can constrain/validate before the privileged work runs.

`get_challenge` today is already minimal: read-only (`stable`), one row by id, returns only the public
play fields (**no `owner_id`**), empty `search_path`, schema-qualified, `EXECUTE` revoked from `public`
and granted only to anon+authenticated. There is no additional authority to hide behind a wrapper — the
function's entire surface **is** the intended public surface. Splitting it would add a layer without
reducing what a caller can do or see.

**Conclusion:** keep the single hardened function for now (no measurable risk reduction from a split).
**Adopt the split later only if `get_challenge` grows** (e.g. starts returning owner-only fields
conditionally, joins private tables, or performs writes). Documented reference pattern for that case:

```sql
-- internal: no grants to anon/authenticated; does the privileged read
create or replace function public._get_challenge_priv(cid uuid)
returns table(...) language sql security definer stable set search_path='' as $$ ... $$;
revoke all on function public._get_challenge_priv(uuid) from public;  -- not callable by clients
-- public wrapper: validates/limits, then calls the internal one
create or replace function public.get_challenge(cid uuid)
returns table(...) language sql stable as $$ select * from public._get_challenge_priv(cid) $$;
revoke all on function public.get_challenge(uuid) from public;
grant execute on function public.get_challenge(uuid) to anon, authenticated;
```

## 4. Sign-out scope — global vs device-only (requirement D)
We call `signOut({ scope: 'global' })`.

| | Global (chosen) | Device-only (`local`) |
|---|---|---|
| Server effect | Revokes the user's **refresh tokens on all devices/sessions** | Clears only this browser's stored session |
| Security | Stronger on a shared/compromised browser — no session can be resumed elsewhere | Other devices stay signed in |
| UX | Signs the user out everywhere (may surprise multi-device users) | Least surprising for multi-device users |
| Offline | Needs the server call to revoke; our client still clears local state + storage regardless | Works fully offline |

**Important caveat (documented):** revoking **refresh tokens** does **not** instantly invalidate an
already-issued **access token (JWT)** — that remains valid until it **expires** (default ~1 hour). So
after a global sign-out, a leaked/in-flight access token could still authorize requests until expiry;
global scope prevents *new* access tokens from being minted (no valid refresh token), bounding exposure
to one token lifetime. Mitigations if this matters later: shorten the access-token TTL on the TEST/prod
project; for truly sensitive actions, verify server-side against a revocation/`banned`/`deleted` check
rather than trusting the JWT alone (account deletion already removes the user, so a post-deletion token
fails `auth.getUser`).

**Our resilience:** B-2 already clears all identity/account UI state and re-renders **before** the
network call, and supabase-js clears the local stored session as part of `signOut`, so a failed global
sign-out still leaves this device locally signed out (honest "signed out on this device" message).

**Retained LIVE-test requirements:** confirm (1) the stored session is actually removed after a failed
global sign-out (no auto-resume on reload); (2) a globally-revoked refresh token cannot mint a new
access token; (3) the access-token-until-expiry window behaves as expected (an old access token stops
working after its TTL and immediately after account deletion).

## 5. Restrictions honored
No migrations applied; the Edge Function is **not deployed**; no production auth; no public deploy; no
real data collected; production Vercel stays guest-only (blank `config.js`); PR #2 not merged;
architecture + viral games unchanged. The Custom Challenges feature is **design-only**
(`CUSTOM_CHALLENGES_DESIGN.md`) — not built.

## 6. Test coverage (requirement 5)
- **Unit (mocked, deterministic):** export (own-data assembly; fails on any query error, no partial),
  delete (invokes the function with **no** client uid; handles ok / partial-failure / transport error).
- **Integration (skips without TEST creds; improvement A):** `before` seeds a profile+activity+challenge
  per account via each user's JWT; `requireSeed()` makes tests **fail** (not skip) if seeding produced
  no rows / no challenge id, so empty tables/missing ids can't fake a pass. Probes: profile/activity
  isolation, unauthorized UPDATE, no enumeration (anon+auth), cross-account challenge write/delete
  blocked, and by-id `get_challenge` retrieval of B's seeded challenge (no `owner_id`).
