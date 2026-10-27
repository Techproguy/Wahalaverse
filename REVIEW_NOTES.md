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
