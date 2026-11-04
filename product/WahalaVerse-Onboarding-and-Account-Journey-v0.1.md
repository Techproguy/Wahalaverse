# WahalaVerse — Onboarding & Account Journey (v0.1)

_Branch: `survive-naija-2`. Prepared for founder review. Guest-first, with an **optional**
account system that is designed now and **enabled only after** backend security verification._

## Principle
Guest-first does **not** mean accounts are removed. Nobody is ever forced to sign up to
play. Accounts are an **optional** add-on that lets a player keep progress across devices —
and they go live only once cross-account data-isolation (RLS), export and deletion are
verified on a TEST backend.

## The complete journey

| Stage | Guest build (now) | With verified backend (after authorization) |
|---|---|---|
| **Welcome & discovery** | One dismissible welcome card; home + mobile Games picker surface every game; Survive 2.0 is prominent (top nav + first card). | Same. |
| **Continue as guest** | Primary path. Play everything; progress (challenges, Survive Naija runs) saved on the device. | Same — still the default, no forced sign-up. |
| **Create account** | Shown as **"coming soon"** in the onboarding sheet — no credential form rendered, nothing collected. | Email + password (the M2 implementation), display name captured. |
| **Log in** | Not collected in guest build (coming soon). | Email + password sign-in. |
| **Password recovery** | n/a in guest build. | "Forgot password" → recovery email → reset (M2 recovery stage). |
| **Returning user** | Device-local: returns straight to play; Survive 2.0 Resume banner restores a run. | Signed-in session restored; account activity + saved challenges load. |
| **Save / resume** | **Device-local** for Survive 2.0 (`wv_sn2_run`) and activity (`wv_activity`). | Account-linked sync **where supported**, in addition to device-local. Never promised before RLS/export/delete pass. |

## What works now vs. what needs the verified backend
- **Works now (guest, no backend):** all games, guest challenge links, Survive 2.0
  save/resume on device, device-local activity. No account, no email, no OTP, no password.
- **Needs the verified backend (not enabled here):** account create / log in / password
  recovery, cross-device sync, cloud-saved challenges. These live on the
  `milestone-2-auth-backend` branch (email + password) and must pass live verification first.

## Security dependencies before accounts go live (Track B)
1. **Cross-account data isolation (RLS):** two-account tests proving user A cannot read/
   write user B's rows (challenges, activities, profile).
2. **Challenge enumeration removed:** `get_challenge` SECURITY DEFINER RPC verified live.
3. **Self-service export + account deletion:** verified against a TEST project (Edge
   Function uses service-role **server-side only**; never in the browser).
4. **Honest messaging:** no "cloud save" promise until the above pass; no `service_role`,
   secret, or SMTP credential ever in client code (CLAUDE.md non-negotiable #3).
5. **Age/retention/privacy:** operator legal content + age-eligibility + retention confirmed
   before any live personal-data collection.

Until all five pass, the guest build keeps accounts as **"coming soon"** — exactly what is
implemented on this branch.
