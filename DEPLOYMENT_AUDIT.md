# Deployment audit — Vercel production (2026-10-28)

## What is deployed
- **Host:** Vercel project `wahalaverse` (owner: adepojumoyinoluwa0-gmailcoms-projects).
- **Public URL:** https://wahalaverse.vercel.app (HTTP 200).
- **Branch:** `main` (Vercel production branch).
- **Commit:** `cdf635c` — "Merge PR #1: Milestone 1 — reliability + tests".
- **Evidence of commit identity:** the live page loads `config.js, core.js, account.js, app.js` and
  **not** `auth.js` (404) or `MILESTONE_2_PLAN.md` (404). `auth.js`/Milestone-2 files exist only on the
  unmerged `milestone-2-auth-backend` branch, so production is confirmed to be Milestone 1 (`main`),
  **not** any Phase A/B auth work.

## Launch-restriction compliance — PASS
| Restriction | Status | Evidence |
|---|---|---|
| No cloud registration enabled | ✅ | Live `config.js` has empty `supabaseUrl` + `supabasePublishableKey` → `hasConfig=false` → `cloudReady=false`; the sign-in dialog renders demo-mode ("Real email sign-in becomes available after Supabase is configured" + "Continue as guest"), with **no email/name form** and `signInWithOtp` never reachable. |
| No personal-data collection | ✅ | With no Supabase connection, nothing is sent to any backend. Guest activity is stored **only** in the device's `localStorage`; no email/name is collected or transmitted. |
| No production backend active | ✅ | No Supabase client is created (blank config); no server-side storage/auth. |
| Milestone 2 auth NOT deployed | ✅ | `auth.js` 404 on production; M2 lives only on the unmerged branch / PR #2. |
| No service-role/secret in client | ✅ | `config.js` is blank; comments forbid secret keys; nothing sensitive served. |

**Conclusion:** the live deployment respects all current launch restrictions. It is a **guest-only,
no-registration, no-personal-data** build of Milestone 1.

## Risks / watch-items (no action taken)
1. **Do NOT populate production `config.js`** with Supabase credentials until Milestone 2 Phase F
   (privacy) + account deletion/export are complete and approved. Filling it would instantly enable
   live registration + personal-data collection against a still-**draft** `privacy.html` (operator
   legal identity/contact/retention are placeholders) — a compliance gap.
2. `privacy.html` on production is the **draft**. Acceptable while guest-only (no data collected), but
   must be finalized before any registration is enabled.
3. Production tracks `main`; when M2 eventually merges, production would pick up the auth UI. Ensure the
   privacy/deletion gates are met **before** that merge reaches production, or keep cloud disabled via
   blank `config.js` even post-merge until approved.

## Not done (per restrictions)
- No production backend activation, no credentials connected, no new/additional public deployment.
