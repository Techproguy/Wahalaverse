# REVIEW_NOTES — Milestone 1 (Reliability + tests)

_For the product owner and the ChatGPT reviewer. Date: 2026-10-28._

## Feature branch / PR
- Branch: `milestone-1-reliability` (off `main`)
- PR: opened against `main` (see GitHub)
- Scope: **Milestone 1 only** — audit, bug fixes, mobile/a11y polish, automated tests. No deploy, no credentials, no live data collection.

## Summary of changes
A deliberately **non-rewrite** milestone. The starter was already solid; this PR makes it
reliable and testable.

1. **`core.js` (new)** — extracted the pure, framework-free logic (content `Q`/`SCENES`/`DEMO`,
   guest-link `encode`/`decode`, `scoreQuiz`, `applySimChoice`, `syncableActivities`,
   escape/format) into a dual CommonJS/global module. Single source of truth, now unit-testable
   in Node and reused unchanged by the browser. `app.js` consumes `window.WahalaCore`. No behavior change.
2. **Privacy fix — cross-account activity leak.** Previously `syncActivities()` uploaded *all*
   unsynced local activities to whoever was signed in, and sign-out never cleared the local queue —
   so guest/other-user activity could be uploaded into the next account on a shared browser. Now:
   activities are stamped with their `owner`, uploads are filtered by `syncableActivities()`
   (unsynced AND unowned-this-session or own), and the local queue is cleared on sign-out.
3. **Deep-link race fix.** Opening a cloud `?c=` link before the async Supabase SDK finished
   importing threw and flashed "this challenge couldn't load", then reloaded. Now it shows a
   loading state while the SDK initializes (initCloud re-loads once ready), a clear
   "this link needs the cloud" message when no backend is configured, and degrades gracefully if
   the SDK import fails.
4. **Reliability + a11y + mobile.** Guarded `create-save` against double-submit (no duplicate
   cloud challenges on rapid taps); auth dialog now moves focus to the first field on open,
   traps Tab, restores focus on close, closes on Escape; `aria-current` on active nav; inputs
   bumped to 16px (prevents iOS zoom-on-focus); dialog close button enlarged to a 44px touch
   target; horizontal-overflow guard.
5. **Tests + docs.** Node unit suite, Playwright E2E suite (desktop + Pixel 7), `STATUS.md`
   audit, README test section, and the project docs (`CLAUDE.md`, `HANDOFF_FOR_CLAUDE.md`).

### Files touched
- Added: `core.js`, `package.json`, `package-lock.json`, `playwright.config.js`,
  `tests/core.test.js`, `tests/e2e/*.spec.js`, `STATUS.md`, `REVIEW_NOTES.md`,
  `CLAUDE.md`, `HANDOFF_FOR_CLAUDE.md`
- Modified: `app.js`, `index.html`, `styles.css`, `.gitignore`, `README.md`
- Unchanged: `config.js` (intentionally blank), `supabase-schema.sql`, `privacy.html` (still DRAFT)

## Commands executed and outputs
```
$ node --check app.js && node --check core.js        # syntax OK (both)
$ node --test tests/core.test.js                     # tests 16 | pass 16 | fail 0
$ npx playwright test                                 # 22 passed (desktop + mobile)
```

## Tests run and results
**Unit (node --test) — 16/16 pass:**
- Guest link encode/decode round-trips (incl. emoji + Yoruba diacritics); URL-safe base64.
- decode rejects garbage, empty, wrong length, out-of-range answers, oversized token, overlong name.
- `scoreQuiz` exact-match counting; `applySimChoice` clamps money ≥ 0 and peace/street 0–100;
  deterministic full Survive Naija run stays in range.
- `syncableActivities` privacy filter: nothing without a user id; only unsynced + (unowned or own)
  items eligible (the cross-account-leak guard).
- `escapeHtml` / `formatNaira` behavior.

**E2E (Playwright, Desktop Chrome + Pixel 7) — 22/22 pass:**
- Guest friendship: create → shareable `?guest=` link → open in a **fresh context** → complete 7 →
  scorecard → "create your own" CTA.
- Survive Naija: full 4-round run → outcome (share + restart) → restart returns to Day 1.
- Navigation + popstate (back/forward); unknown page → home.
- Validation: short name toast; unanswered-questions toast.
- Malformed `?guest=` link → graceful "couldn't load"; `?c=` with no backend → "needs the cloud".
- Phone viewport: bottom nav shown / top links hidden; no horizontal overflow on key pages;
  auth dialog receives focus.

## Mobile test results
- Pixel 7 (390×844) project passes all applicable checks. Bottom nav visible, desktop nav hidden,
  no horizontal overflow on home/create/sim/account, dialog focus works, 16px inputs avoid iOS zoom.
- Manual spot-check recommended on a real midrange Android + iOS Safari before beta (touch feel,
  `navigator.share` sheet, WhatsApp hand-off) — these need real devices/HTTPS and aren't automatable here.

## Security / privacy concerns
- **Fixed:** cross-account local-activity leak (see change #2). Covered by a unit test.
- **Unchanged by design:** guest quiz answers remain encoded in the share URL and are inspectable —
  fine for casual fun, **not** for prizes. Documented in README and the privacy page.
- **No secrets committed.** `config.js` is blank; `.gitignore` excludes `config.local.js` and `.env*`.
  Cloud code uses only the publishable/anon key path.
- **Still open (not in M1 scope):** `privacy.html` is a DRAFT (no operator legal identity/contact/
  retention); no account deletion/export; no rate limiting / production email sender. Not yet verified
  against a live Supabase project (RLS, auth, uploads).

## User action needed (blockers for Milestone 2)
1. Create a Supabase project and provide the **project URL + publishable/anon key** (never the
   service_role/secret key). These go in `config.js` locally — not committed.
2. Decide on the legal operator identity, privacy contact, hosting region, and retention periods for
   `privacy.html` (ideally with a Nigerian Data Protection Act review).
3. Confirm the production/redirect domain so magic-link return URLs can be configured.

## Ready for Milestone 2? 
**Not yet — blocked on credentials.** The code paths exist but cloud sign-in, storage, RLS, and
activity upload are intentionally **unverified** without a live Supabase project. M1 (guest-mode
reliability + tests) is complete and green. Recommended next step: owner provisions a Supabase
project + shares public keys, then M2 verifies auth/storage/RLS with test accounts and builds the
deletion/export flow — on a new branch, with its own tests.

---

# Audit response — ChatGPT M1 review (2026-10-28)

Re-auditing the first privacy fix adversarially surfaced two **real concurrency bugs in my own
code** that the original single-threaded reasoning missed. Both are now fixed. Summary of each
review item:

### 1. Cross-account isolation under delayed network / account switching / sign-out / re-login
**Finding A — BLOCKING (fixed): account switch mid-sync uploaded items under the wrong account.**
The old `syncActivities()` read `state.user.id` *fresh on every loop iteration and after every
`await`*. If account A→B switched while an `insert` was in flight (easy under a slow network), the
next iteration inserted A's queued item with `user_id = B`. That is a true cross-account leak.

**Finding B — BLOCKING (fixed): sign-out mid-sync resurrected the cleared queue.** Sign-out cleared
`localStorage`, but an in-flight sync had captured the pre-clear array and wrote it back via
`setRecent(data)` — re-populating the cleared guest items, which then uploaded to the next account
on re-login.

**Fix:** `syncActivities()` now captures the user id **and** an auth-generation counter
(`state.authEpoch`) **once**, and uses the captured id for every insert. After each `await` and
before the final persist it bails if `authEpoch` changed. The final persist is a **flag-merge
against the current queue** (stamp only ids we actually synced), so it can neither resurrect a
cleared queue nor clobber a concurrently-added activity. Sign-out bumps `authEpoch` and clears the
queue **before** the async `signOut()` round-trip; `onAuthStateChange` bumps it on any identity
change. `refreshAccount()` also discards results if the account changed mid-fetch.

Delayed network / same user, and re-login as the same user: re-upload is idempotent (unique `id`
primary key → `23505` is treated as success).

### 2. Can the local queue expose one account's records to another? — NO (after the fix)
Guarantees, each covered by a unit test (`tests/core.test.js`):
- Items are owner-stamped; `syncableActivities()` only yields unsynced items that are unowned
  (guest, this session) or owned by the current user — **never another user's**.
- A guest item, once synced to A, is stamped `owner=A, synced=true` and is thereafter eligible for
  *no one* (test: "never eligible for B").
- From a shared queue, user B only ever receives B's own + unowned items (test: "B can never pick
  up A-owned items").
- Sign-out clears the queue and the epoch guard prevents any in-flight write from undoing that.
The imperative race fixes (Findings A/B) are verified by code review + reasoning; they are not
unit-testable without a live Supabase/DOM harness (that harness arrives in M2).

### 3. Public challenge SELECT policy — privacy implications (documented + minimally hardened)
Policy: `create policy "Public challenge reading" ... for select to anon,authenticated using (true)`.
- **Enumeration (NON-BLOCKING for M1, important for M2):** `using (true)` with no row filter means
  an anon caller can list the **entire** `challenges` table (not just a shared link), harvesting
  `owner_name`, `answers` (the quiz key), `title`, `created_at`. The unguessable UUID does **not**
  help — enumeration doesn't require guessing ids. Acceptable for casual fun (answers are already
  documented as non-secret, never for prizes) but broader than the app needs (it only reads by id).
- **Account id exposure (fixed):** the original grant let anon read `owner_id` (the creator's
  `auth.users` UUID), allowing grouping of all challenges by creator. The anon grant is now
  **column-scoped to exclude `owner_id`**; the app never requests it as anon, and `authenticated`
  retains full-column access (it filters its own challenges by `owner_id`).
- **Recommended M2 remediation (out of M1 scope — needs a live DB + test accounts):** replace the
  table-level anon SELECT with a `SECURITY DEFINER` RPC `get_challenge(id)` returning a single row,
  and drop the anon table grant — removing enumeration entirely while preserving by-link reads.
- The schema file is a **draft, not applied to any live project**; these changes are inert until M2.

### 4. Do all reported tests pass on the final commit? — YES
At the time of the first audit response: the isolation fix landed in commit `5d3dc07`, and the
branch tip (final commit) was `6968318`, with **18 unit + 22 E2E = 40 pass, 0 fail**. (Those two
hashes refer to *different* commits — the fix vs. the branch tip — which the second review flagged;
see the reconciliation note under "Second audit response" below.) The branch has since advanced for
the second-round findings — current totals are **28 unit + 22 E2E = 50**. See the section below for
the up-to-date final commit.
```
$ node --test tests/core.test.js tests/account.test.js   # tests 28 | pass 28 | fail 0
$ npx playwright test                                     # 22 passed (Desktop Chrome + Pixel 7)
```

### 5. Downloadable diff + docs for independent review
See the generated bundle noted at the end of this file / provided to the owner: a combined patch
(`milestone-1.patch`, apply with `git apply`), the per-commit series, and copies of
`REVIEW_NOTES.md` + `STATUS.md`.

### 6. Merge / deploy / Milestone 2
**Not merged, not deployed, Milestone 2 not started.** All changes remain on branch
`milestone-1-reliability` / PR #1 and are minimal and focused on M1.

## Findings classification
| # | Finding | Severity | Status |
|---|---------|----------|--------|
| A | Account switch mid-sync uploads items under wrong account | **Blocking** | Fixed |
| B | Sign-out mid-sync resurrects cleared local queue | **Blocking** | Fixed |
| C | anon could read `owner_id` (creator account UUID) | Non-blocking (M1 guest mode doesn't touch DB) | Fixed (column-scoped grant) |
| D | `using(true)` allows full-table enumeration of challenges | Non-blocking for M1 | Documented; RPC remediation recommended for M2 |
| E | Rare: concurrent saveActivity during sync could be clobbered | Non-blocking | Fixed (flag-merge persist) |

---

# Second audit response — independent review (mocked-backend findings)

The independent review passed the 18 unit tests, reproduced three further account-isolation issues
with a mocked backend, and asked for deterministic async tests. All three are fixed, with new
deterministic tests. **Architecture preserved** (same static, framework-free app); the account
state machine was modularized into `account.js` exactly as `core.js` was, purely to make the async
auth/db logic injectable and testable.

### Finding 1 — STALE PROFILE RESPONSE (fixed)
`ensureProfile()` now captures the user id **and** `authEpoch` once; after each `await` it checks
`stillCurrent()` and **discards** any response whose identity no longer matches — so A's profile can
never be written after a switch to B. `profile` is cleared immediately on identity change (via
`clearAccountState()` in `onAuthStateChange` and the sign-out handler).
Tests: _"ensureProfile discards a delayed response after the account changes"_, _"…applies the
profile when identity is stable"_.

### Finding 2 — STALE ACCOUNT DATA (fixed)
On any identity change, `clearAccountState()` runs **immediately**, wiping `profile`,
`cloudActivities`, `cloudChallenges` and resetting `loadingAccount`. `refreshAccount()` discards
results if the account changed mid-fetch, and on **any failure** it clears `cloudActivities` /
`cloudChallenges` — so a failed refresh for B can only ever show empty state, never A's data.
Tests: _"refreshAccount discards results after the account changes mid-fetch"_, _"a FAILED refresh
never exposes a previous account's data"_.

### Finding 3 — GUEST ACTIVITY OWNERSHIP (fixed via session attribution)
`localStorage` persists across sessions and people, so treating every `owner:null` record as "the
current guest" was wrong. Chosen remedy: **per-browser-session attribution** (keeps the frictionless
guest→signup sync for the *same* session, no extra prompt). Each guest activity is stamped with a
`session` id (held in `sessionStorage`); `syncableActivities(items, userId, sessionId)` only treats
an unowned item as syncable when `item.session === sessionId`. A previous session's, a legacy
(no-session), or another person's guest history is therefore **never** auto-attached to a signed-in
account. (If instead you prefer an explicit "import your guest history?" prompt, that's a small,
additive change for M2 — noted, not assumed.)
Tests: _"a guest item from a different session is never synced…"_, _"…from THIS session syncs and is
stamped with the owner"_, plus the pure `syncableActivities` cases in `core.test.js`.

### Deterministic async tests (new — `tests/account.test.js`)
Driven by a **mock Supabase client** whose every query resolves through a **test-controlled deferred
promise**, so delayed responses, account switching, sign-out, and failed refreshes are reproduced
without real timing or a backend. 9 account tests + 19 core tests = **28 unit**; E2E unchanged at
**22**. **Total 50, all passing.**

### Commit-reference reconciliation
The first audit response referenced two different hashes: `5d3dc07` (the isolation **fix** commit)
and `6968318` (the branch **tip** at that moment). They were never meant to be the same commit, but
the wording implied `5d3dc07` was "final". Corrected above. **Current final commit: see `git log`
tip of `milestone-1-reliability`** (the bundle's `COMMITS.txt` always lists the exact tip used to
generate that patch).

### Milestone 2 — enumeration requirement retained (expanded)
Confirmed and carried into M2: **remove broad challenge enumeration for BOTH anon AND authenticated**
before enabling production storage. The current `using(true)` policy lets *any* signed-in user also
list the whole `challenges` table (not just anon). Planned M2 remediation: replace table-level SELECT
with a `SECURITY DEFINER` RPC `get_challenge(id)` (single-row, by id) and drop the broad table
grants for both roles, so a user can read a challenge **by link** but cannot enumerate the table.
This is documented in `supabase-schema.sql` and tracked here; it is **not** implemented in M1
(no live DB, no credentials, M2 not started).

### Scope / safety for this round
No merge, no deploy, no credentials, Milestone 2 not started. Changes are minimal and confined to:
`core.js` (sync filter signature), new `account.js` (extracted logic), `app.js` (wiring + session
stamp + immediate clear on identity change), `index.html` (load account.js), `supabase-schema.sql`
(doc only), and tests/docs. Guest flows unchanged (22/22 E2E still pass).

## Findings classification — round 2
| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Stale profile response applied after identity change | **Blocking** | Fixed (epoch+uid guard, immediate clear) |
| 2 | Stale account data survives switch / failed refresh | **Blocking** | Fixed (immediate clear + clear-on-error) |
| 3 | Guest `owner:null` silently attached across sessions | **Blocking** | Fixed (per-session attribution) |
| D′ | `using(true)` enumeration for anon **and** authenticated | Non-blocking for M1 | Retained as M2 requirement (RPC) |
