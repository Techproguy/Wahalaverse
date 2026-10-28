# WahalaVerse — STATUS

_Last updated: 2026-10-28 (Milestone 1 branch `milestone-1-reliability`)_

This file tracks what actually works, what is pending, and what is blocking — verified by
reading and exercising the code, not by assuming placeholders are complete.

## ✅ Working (verified)
- **Static site serves** — `index.html`, `styles.css`, `app.js`, `core.js`, `config.js` all load (HTTP 200) via `python3 -m http.server`.
- **Guest "Predict My Wahala"** — create 7-answer challenge → generate shareable `?guest=` link (answers base64url-encoded in URL) → open in a fresh context → answer → scorecard → "create your own" CTA. No backend required.
- **Guest link encode/decode** — round-trips UTF-8 incl. emoji and Yoruba diacritics; rejects malformed / oversized / wrong-length / out-of-range payloads (unit-tested).
- **Survive Naija** — 4-round simulator; money/peace/street stats clamp correctly (money ≥ 0, peace/street 0–100); outcome + share (unit-tested math).
- **Navigation** — SPA routing via query string + `popstate` (browser back) works across home/create/sim/account/play.
- **Guest activity history** — stored in `localStorage` (`wv_activity`), shown in "My corner".
- **Mobile layout** — responsive at 840px and 640px breakpoints; mobile bottom-nav with safe-area insets; `prefers-reduced-motion` respected.

## 🟡 Pending (code present but NOT independently verified against a live backend)
- **Supabase email magic-link sign-in** — code path exists (`initCloud`, `requestSignIn`) but requires real Supabase credentials (not provided). Untested end-to-end. **Milestone 2.**
- **Cloud challenge storage / retrieval** (`?c=<uuid>`) — code path exists; needs live Supabase + integration tests. **Milestone 2.**
- **Cloud activity sync** — guest→account sync logic is in place and the cross-account-leak bug is fixed (see below), but real upload/RLS behavior is unverified without credentials. **Milestone 2.**
- **Profile creation / upsert** — `ensureProfile` present, unverified against live DB.

## 🔴 Blocking (needs product owner / human action)
- **Supabase project + credentials** — no project URL / publishable key provided. `config.js` is intentionally blank → app runs in guest demo mode. Required before Milestone 2 cloud verification.
- **`privacy.html` is a DRAFT** — operator legal identity, privacy contact, hosting region, and retention periods are placeholders. Must be completed by the operator (with legal review for Nigerian Data Protection Act) before any live personal-data collection.
- **Account deletion / data export** — not built. Required before enabling public sign-ups (Milestone 2/3).
- **Production email sender, rate limiting, abuse controls** — not configured. **Milestone 3.**
- **OG share image + favicon** — not added. **Milestone 3.**

## Bugs fixed in Milestone 1
1. **Cross-account activity leak** — unsynced local activity could upload to whichever account signed in next on a shared browser. Now: activities are stamped with their owner, sync is filtered by owner, and the local queue is cleared on sign-out.
2. **Cross-account isolation under async races** (found in the ChatGPT review self-audit): (a) an account switch during an in-flight sync could upload one account's queued items under another account's id; (b) a sign-out during an in-flight sync could resurrect the cleared queue. Fixed by capturing the user id + an auth-generation (`authEpoch`) once, aborting on epoch change, and persisting via a flag-merge. See `REVIEW_NOTES.md` → "Audit response".
3. **False "link broken" flash** — cloud `?c=` deep links now show a loading state while the Supabase SDK initializes (and a clear message if cloud is not configured), instead of briefly flashing an error.
4. **Duplicate challenge on rapid taps** — the create action is now guarded against double submission.
5. **Accessibility / mobile** — auth dialog focus management + focus trap, `aria-current` on active nav, 16px inputs (prevents iOS zoom-on-focus), larger touch targets, horizontal-overflow guard.

## Schema privacy (reviewed, documented)
- The `challenges` SELECT policy (`using(true)`) is documented in `supabase-schema.sql`: it allows
  anon **enumeration** of the whole table (owner_name/answers/title/created_at) — acceptable for
  casual, non-prize play but broader than needed; an RPC-based remediation is recommended for M2.
- The anon grant is now **column-scoped to exclude `owner_id`** so the creator's account UUID is not
  exposed to unauthenticated reads. Draft schema, not applied to any live project.

## Tests
- **50 unit** (`npm run test:unit`, node --test — `core` + `account` + `auth`) + **22 E2E**
  (`npm run test:e2e`, Playwright Desktop Chrome + Pixel 7) = **72 passing, 0 failing** on the final commit.
- The 9 `account` tests are deterministic: they drive `account.js` with a mocked Supabase client
  using test-controlled deferred promises (delayed profile, account switch, sign-out, failed refresh,
  cross-session guest data).

## Account isolation (second review round — fixed)
- **Stale profile / stale account data:** `ensureProfile` / `refreshAccount` capture the user id +
  an auth generation and discard any response that arrives after the identity changed; account state
  is cleared the instant identity changes, and a failed refresh clears data rather than exposing a
  previous account's. Logic lives in `account.js` (dependency-injected for testing).
- **Guest activity ownership:** unowned guest activities are attributed to the current browser
  session (`sessionStorage`), so another session's / person's guest history is never auto-synced.

## Milestone 2 requirement (carried forward)
- **Remove broad challenge enumeration for BOTH anon and authenticated** before enabling production
  storage (planned: a `SECURITY DEFINER` `get_challenge(id)` RPC + dropping the broad table SELECT
  grants). Documented in `supabase-schema.sql`; not implemented in M1.

See `REVIEW_NOTES.md` for the full change summary, audit response, and test results.
