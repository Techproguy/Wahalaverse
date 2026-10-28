# Security review — Milestone 2, Phase C

_Commit `0fe80ba` on `milestone-2-auth-backend`. Scope: secure challenge retrieval +
sign-out scope. No migrations applied; no production change; PR #2 not merged._

## 1. Threat addressed: challenge enumeration
**Before:** `create policy "Public challenge reading" ... using (true)` + an anon table grant
let any anon or authenticated caller list the **entire** `challenges` table (owner_name,
answers, title, created_at) with a single unfiltered `GET /rest/v1/challenges`. The random
UUID did not help — no id was required to dump the set.

**After (this phase):**
- The `using(true)` policy is dropped; **anon has no table SELECT at all**.
- Authenticated table SELECT is **owner-scoped** (`auth.uid() = owner_id`) → a signed-in user
  can read only their own rows (powers the "my challenges" list); they cannot read or
  enumerate anyone else's.
- The only cross-user read is **by id** via `get_challenge(cid uuid)`.

## 2. RPC hardening (`get_challenge`)
| Control | Applied | Why |
|---|---|---|
| `security definer` | ✅ | Runs as the owner so a by-link read works despite the row policy… |
| `stable` | ✅ | …but is read-only/side-effect-free. |
| `set search_path = ''` (empty) | ✅ | Prevents search-path hijacking; all objects are schema-qualified (`public.challenges`). |
| Schema-qualified references | ✅ | No reliance on the caller's search_path. |
| Minimal return fields | ✅ | Returns id, owner_name, title, answers, template_version, created_at — **never `owner_id`** (no account-UUID leak). |
| `limit 1` | ✅ | One row per id. |
| Input: `uuid` param | ✅ | PostgREST rejects non-UUIDs; `null`/unknown id → zero rows (no error path to probe). |
| `revoke all ... from public` + grant anon, authenticated | ✅ | EXECUTE is explicitly restricted, not left to the default PUBLIC grant. |

**Residual (accepted, documented):** anyone with a valid challenge **id/link** can read that
one challenge's `answers` — by design ("public by link"; answers are non-secret, never for
prizes). Ids are random UUIDs, so this is per-link, not bulk. No enumeration remains.

## 3. Guest-first play preserved
- `?guest=` links are decoded entirely client-side (`core.decodeChallenge`) — unchanged, no
  backend, no account. A recipient opens and plays without registering.
- `?c=` cloud links now resolve via `get_challenge` (anon EXECUTE granted) — still no
  registration required to open a shared cloud challenge.
- With production `config.js` blank (current Vercel state), cloud links show the existing
  "needs the cloud" message; guest links and both games work fully. 22/22 guest E2E pass.

## 4. Sign-out scope — local vs global (objective 8)
`supabase.auth.signOut()` accepts a scope:
- **`global` (chosen):** revokes the user's refresh tokens on the **server for all sessions/
  devices**. Safer default for a shared browser — a signed-out user can't have a lingering
  session resumed elsewhere. We pass `{ scope: 'global' }` explicitly.
- **`local`:** clears only this browser's stored session; other devices stay signed in. Lower
  security but works fully offline.

**Our resilience (independent of scope):** the B-2 fix already clears all identity/account
state and re-renders **synchronously before** the network call, and supabase-js removes the
**local** stored session as part of `signOut`. So even if the global server revocation fails
(network), this device is left locally signed out and the UI shows no account data; we report
an honest "signed out on this device (server sign-out could not be confirmed)" rather than a
false success.

**Retained LIVE-testing requirement (cannot verify without a TEST project):**
1. After a **failed** global `signOut()` (simulate offline), confirm the Supabase session is
   actually removed from browser storage (no auto-resume on reload) — and decide whether to add
   a `{ scope: 'local' }` fallback retry if any SDK version leaves a token behind.
2. Confirm a globally-revoked refresh token can no longer mint a new access token on another
   device.
3. Confirm re-sign-in after sign-out works cleanly (fresh session, no stale identity).
These are tracked for the live Phase (needs the TEST project + two devices/sessions).

## 5. What is NOT changed / NOT done (restrictions honored)
- No migrations applied; no production auth; no public backend deploy; no real data collected;
  production Vercel remains guest-only (blank `config.js`). PR #2 not merged. Architecture and
  the viral-game experience unchanged.

## 6. Test coverage
- **Unit (mocked):** `challenges.test.js` — RPC retrieval, not-found→null, error→throws, no-op
  without client/id; `auth.test.js` — sign-out uses explicit global scope, renders before await,
  honest failure on reject/`{error}`.
- **Integration (skips without TEST creds):** `rls.integration.test.js` — anon + authenticated
  enumeration denied; owner-only reads; by-id `get_challenge` retrieval (anon + user) with no
  `owner_id`; unknown id → none; unauthorized UPDATE and cross-account challenge write/delete
  blocked.
