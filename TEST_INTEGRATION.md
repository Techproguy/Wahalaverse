# WahalaVerse — Supabase TEST integration setup & execution checklist

_Prepared after Phase D approval (code at `7e60a51`). **Preparation only** — this document is for
review. No migrations are run, no Edge Function is deployed, no registration is enabled, and the
production Vercel deployment stays guest-only until the owner explicitly approves each step marked
**[OWNER APPROVAL]**._

> Golden rule: everything here targets a **dedicated TEST Supabase project**, never production. The
> production `config.js` stays blank (guest-only) throughout.

---

## 0. Scope & prerequisites
- A dedicated **TEST** Supabase project (separate from any production project). **[OWNER APPROVAL]**
- Local tools: Node ≥ 20, the repo checked out on `milestone-2-auth-backend`, and (for RLS/E2E cloud
  tests) `npm i --no-save @supabase/supabase-js` and `npm install` + `npm run test:e2e:install`.
- Two **test identities** (disposable mailboxes are fine), referred to as **A** and **B**.
- Nothing in this stage touches real users; all data is synthetic test data.

---

## 1. Create & configure the TEST project  **[OWNER APPROVAL to create the project]**
1. Create a new Supabase project named e.g. `wahalaverse-test`. Choose a region close to Nigeria
   (e.g. `eu-west`/`eu-central`) for realistic latency.
2. **Project Settings → API:** copy the **Project URL** and the **publishable/anon key**. These are
   the only secrets that go into the local, git-ignored `config.local.js`.
   - **NEVER** copy the `service_role`/secret key into the repo, the browser, or chat. It is pasted
     only into the Supabase dashboard / function secrets by the owner.
3. **Local app wiring (TEST only):** copy the example and fill in the TEST values:
   ```bash
   cp config.local.example.js config.local.js   # then edit the two values
   ```
   `index.html` loads `config.local.js` **after** the blank `config.js`, so when it is present it
   overrides the config; when it is absent (as in the production deployment) the site keeps the blank
   `config.js` and stays **guest-only**. `config.local.js` is **git-ignored** — never commit it, and
   put ONLY the TEST URL + publishable/anon key in it (never the `service_role` key). Verify: on
   production `config.local.js` 404s (expected/harmless) and the live site remains guest-only.

---

## 2. Final schema & migration order (review)
**Fresh TEST project (recommended):** run **one** file.
1. Supabase **SQL Editor** → paste and run **`supabase-schema.sql`** (the secure baseline). It creates
   `profiles`, `challenges`, `activities` with RLS, the **owner-scoped** challenge read policy, the
   **`get_challenge(id)`** SECURITY DEFINER RPC (hardened), the profile **update** policy, and all
   grants. **[OWNER APPROVAL to run SQL on the TEST project]**
   - ✅ Do **NOT** also run `supabase/migrations/0002_*` on a fresh project — the baseline already
     includes Phase C; 0002 would conflict (objects already exist).
2. **Only if** you are upgrading a project that was previously created from the *Milestone-1* baseline
   (old `using(true)` policy): run `supabase/migrations/0002_secure_challenge_access.sql` instead, and
   keep `0002_..._rollback.sql` on hand. (Not needed for a brand-new TEST project.)

**Order summary (fresh):** `supabase-schema.sql` → (optional, later, with approval) deploy the
`delete-account` Edge Function. No other migrations exist.

---

## 3. Two-account auth + seeded RLS verification (prep)
**Goal:** obtain A's and B's access tokens (JWTs) + user ids, then run the seeded RLS suite.

**Auth/config needed first (see §5):** Site URL + redirect allowlist + (for OTP) the email template.

**Getting JWTs — two options:**
- **Option A (OTP, matches production flow):** run the app locally (TEST config), sign in A with its
  mailbox (magic link or 6-digit code), then read the session access token from the browser
  (`localStorage` Supabase session, or `await supabase.auth.getSession()` in the console). Repeat for B.
- **Option B (password test users, fastest for JWTs):** in the dashboard **Auth → Users → Add user**,
  create A and B with passwords, then mint tokens locally (RLS doesn't care how the JWT was issued):
  ```js
  // node --input-type=module  (after: npm i --no-save @supabase/supabase-js)
  import { createClient } from '@supabase/supabase-js';
  const s = createClient('<URL>', '<ANON>');
  const { data } = await s.auth.signInWithPassword({ email: 'a@test...', password: '...' });
  console.log(data.session.access_token, data.user.id);
  ```

**Run the seeded two-account RLS suite:**
```bash
npm i --no-save @supabase/supabase-js
SUPABASE_TEST_URL=https://<ref>.supabase.co \
SUPABASE_TEST_ANON_KEY=<anon> \
SUPABASE_TEST_A_JWT=<A access token> SUPABASE_TEST_A_ID=<A uuid> \
SUPABASE_TEST_B_JWT=<B access token> SUPABASE_TEST_B_ID=<B uuid> \
npm run test:rls
```
The suite's `before` hook **seeds** a profile+activity+challenge for each account via their own JWTs,
and `requireSeed()` makes the tests **fail (not skip)** if seeding produced no rows/ids — so an empty
table can't fake a pass.

---

## 4. End-to-end checks (challenge sharing, export, deletion, sign-out)
Run the app locally against the TEST project (`python3 -m http.server 8080`). Use A and B in separate
browsers/profiles.

- **Challenge sharing (cloud):** A (signed in) creates a challenge → gets a `?c=<id>` link. Open the
  link as **anon** (logged-out, fresh profile) → it loads and plays via the `get_challenge` RPC.
- **Guest link still works:** create a guest challenge (or open an existing `?guest=` link) → plays
  with no account.
- **Data export:** A → "My corner" → "Download my data" → a JSON with A's profile/activities/challenges
  only (paginated; verify with a seeded account having >1000 activities if feasible).
- **Account deletion (run LAST — destructive, see §8):** requires the Edge Function deployed
  (**[OWNER APPROVAL]**, §5). A → "Delete my account" → confirm → signed out; A's rows gone;
  `get_challenge` on A's deleted challenge → empty. Re-seed/recreate accounts before any later run.
- **Sign-out:** A signs out → UI clears immediately; reload → still signed out. (Also the live
  sign-out/token-expiry checks from `SECURITY_REVIEW_PHASE_C/D.md`.)

---

## 5. SITE_URL, redirect URLs, email OTP template  **[OWNER APPROVAL for live-ish settings]**
1. **Auth → URL Configuration:**
   - **Site URL:** the app origin used for testing (e.g. `http://localhost:8080` for local, or the
     TEST deployment origin if you stage one — NOT the production Vercel URL unless deliberately testing).
   - **Redirect URLs (allowlist):** add every origin you'll test from, e.g. `http://localhost:8080/**`.
     Magic-link return (`emailRedirectTo`) must match an allowlisted entry.
2. **Auth → Email Templates → Magic Link:** include the token so the **6-digit OTP** is delivered
   alongside the link (e.g. add `{{ .Token }}` to the template) — required for the OTP fallback.
3. **Edge Function env (only when deploying `delete-account`) [OWNER APPROVAL]:**
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are **reserved vars injected
   automatically** by Supabase — **do NOT set them manually**. Only set **`SITE_URL`** = the exact
   **TEST** origin (for CORS). Do **not** use the production WahalaVerse origin and do **not** rely on
   the wildcard `*`. `supabase functions deploy delete-account`. After deploy, verify the function can
   read the injected `SUPABASE_SERVICE_ROLE_KEY` at runtime (a health check / log line).
4. **Email deliverability:** default Supabase SMTP limits are fine for a few test sends; a real SMTP
   sender is a Milestone-3 concern, not needed for this stage.

---

## 6. Test execution checklist (explicit pass/fail)
| # | Check | How | PASS criteria | FAIL criteria |
|---|---|---|---|---|
| T1 | Schema applies | Run `supabase-schema.sql` on fresh TEST | No errors; 3 tables + `get_challenge` exist | Any SQL error / missing object |
| T2 | Seed + RLS suite | `npm run test:rls` with A/B env | All 7 tests **pass** (seeded) | Any fail, or `requireSeed` fails (empty seed) |
| T3 | Profile isolation | (in T2) | A can't read/update B's profile; anon reads none | A sees B's row or updates it |
| T4 | Activity isolation | (in T2) | A sees only own; can't insert as B | A sees B's / insert-as-B succeeds |
| T5 | No enumeration | (in T2) | anon table SELECT empty/denied; A sees only own | anon lists rows, or A sees B's |
| T6 | By-id retrieval | (in T2) | `get_challenge(B's id)` returns 1 row, **no owner_id**, for anon & A; unknown id → none | returns owner_id, or returns nothing for a valid id, or lists many |
| T7 | Cross-account writes | (in T2) | A can't insert owner_id=B; can't delete B's challenge | either succeeds |
| T8 | Magic link + OTP | Sign in A via link AND via 6-digit code | Both establish a session; session persists on reload | Either fails; code not delivered |
| T9 | Redirect/mobile return | Open magic link on phone / new tab | Returns to app signed in | Lands unauthenticated / error |
| T10 | Cloud challenge share | A creates `?c=` → open as anon | Loads + plays via RPC | "couldn't load" / enumeration |
| T11 | Guest link | Open `?guest=` | Loads + plays, no account | Broken |
| T12 | Data export | A → Download my data | JSON = A's own data only; complete (all pages) | Missing/extra data; partial on error |
| T13 | Account deletion | A → Delete (fn deployed) | Signed out; A's rows + auth user gone; retry-safe | Rows/user remain; false success on error |
| T14 | Deletion authz | B's token cannot delete A | Only self is deletable (uid from JWT) | Any cross-account deletion |
| T15 | Sign-out | A signs out (global scope) | UI clears immediately; no resume on reload | Stale account data shown |
| T16 | Automated suites | `npm run test:unit && npm run test:e2e` | 77 unit + 22 E2E pass | Any failure |

**Stage is GREEN only if T1–T16 all pass.** T13/T14 depend on the Edge Function being deployed
(**[OWNER APPROVAL]**); until then mark them "blocked-pending-deploy", not pass.

---

## 7. Steps requiring product-owner approval (summary)
1. **Create** the TEST Supabase project.
2. **Run `supabase-schema.sql`** (and any migration) on the TEST project.
3. **Deploy** the `delete-account` Edge Function + set its `SUPABASE_SERVICE_ROLE_KEY` and `SITE_URL`
   secrets (needed for T13/T14).
4. Configure **Site URL / redirect allowlist / email OTP template** on the TEST project.
5. Provide/confirm the **two test identities** (and the TEST anon key for local wiring).
6. Any decision to **stage a separate TEST deployment** (still not the production Vercel, which stays
   guest-only).

## 8. Test hygiene & safety rules (REQUIRED)
- **Synthetic identities only.** A and B are throwaway test accounts (disposable mailboxes / dummy
  passwords). Never use a real person's email or any real personal data in the TEST stage.
- **Secrets stay out of GitHub, CI logs, and chat.** TEST user JWTs, the anon key, and (especially)
  the `service_role` key must never be committed, pasted into PRs/issues/ChatGPT, or echoed into CI
  logs. Pass them only as local shell env vars when running `npm run test:rls`; `config.local.js` is
  git-ignored. CI stays credential-free (the 7 RLS tests remain skipped there).
- **Verify RLS over REST under the real roles — not the SQL Editor.** The dashboard SQL Editor runs as
  a privileged role and **bypasses RLS**, so it cannot prove isolation. `tests/rls.integration.test.js`
  already uses the **REST API** with the anon key + each user's **own JWT** (anon and authenticated
  roles). Do any manual spot-checks the same way (REST with the role's token), never via SQL Editor.
- **Fixtures must exist before assertions.** The suite's `before` hook seeds a profile+activity+
  challenge per account and `requireSeed()` **fails** (not skips) if seeding produced no rows / no
  challenge id — so an empty database can't make isolation assertions vacuously pass. Do not run the
  assertions against an unseeded project.
- **Run account-deletion tests LAST.** Deletion (T13/T14) destroys accounts A/B and their data, so run
  it only **after** every test that depends on those accounts (T2–T12). Re-seed / recreate the test
  accounts before any subsequent run.
- **Physical mobile testing needs a protected HTTPS origin.** Magic links, the OTP return, and
  `navigator.share`/WhatsApp hand-off require **HTTPS** on a real device (desktop `http://localhost`
  is exempt, phones are not). Use a dedicated **HTTPS TEST staging** origin (e.g. a separate TEST
  Vercel/Netlify preview, or an HTTPS tunnel) — **not** the production WahalaVerse deployment. Add that
  origin to the Supabase **redirect allowlist** and set it as **SITE_URL** for the Edge Function CORS.
- **TEST CORS origin ≠ production.** The deletion function's `SITE_URL` must be the TEST origin; never
  set it to the production WahalaVerse URL.

## Restrictions (unchanged)
PR #2 stays unmerged; no migrations run, no Edge Function deployed, no production registration, no real
user data — until the matching **[OWNER APPROVAL]** is given. Production Vercel remains guest-only
(blank `config.js`). This document is the plan; execution waits for approval.
