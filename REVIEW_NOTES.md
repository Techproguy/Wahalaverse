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
Final commit `5d3dc07`. **18 unit + 22 E2E = 40 pass, 0 fail.** (The 38 in the provisional review
were 16 unit + 22 E2E; this adds 2 isolation regression tests.)
```
$ node --test tests/core.test.js   # tests 18 | pass 18 | fail 0
$ npx playwright test              # 22 passed (Desktop Chrome + Pixel 7)
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
