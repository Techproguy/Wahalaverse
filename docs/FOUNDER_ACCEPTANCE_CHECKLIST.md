# WahalaVerse — Founder Acceptance Checklist (integrated guest-first build)

**Build:** local integration rehearsal branch `integration-rehearsal` (off `main`; **not merged, not deployed**).
Combines PRs #4, #5, #6, #7, #8, #9, #10, #11, #12. M2 (#2) is intentionally **excluded** (auth/security still unverified).
**Automated status (integrated build, 2026-10-29):** ✅ **106/106 unit, 54/54 E2E.**

> **How to read this:** automated items are marked **PASS (auto)** — but **CI does not equal acceptance.**
> Please fill the **Your verdict** column with **PASS / FAIL / NEEDS IMPROVEMENT / NOT TESTED** and add comments.
> The experiential/visual items (👁️) have **no auto status on purpose** — they need your hands/eyes.

## 0. Run the integrated build locally
```bash
git checkout integration-rehearsal
python3 -m http.server 8080
# open http://localhost:8080  (phone on same Wi-Fi: http://<your-computer-IP>:8080)
```
No install needed for guest play. For WhatsApp native-share testing you need an HTTPS origin (phone); on localhost, share falls back to copy.

---

## A. Existing guest games (regression)
| # | Check | Auto status | Your verdict | Comments |
|---|-------|-------------|--------------|----------|
| A1 | Predict My Wahala: create → link → open fresh → score → CTA | ✅ PASS (auto) | | |
| A2 | Survive Naija: full 4-round run → outcome → restart | ✅ PASS (auto) | | |
| A3 | Existing **Quick Challenge (v1) links still open** | ✅ PASS (auto) | | |
| A4 | Navigation + browser back/forward; unknown page → home | ✅ PASS (auto) | | |

## B. Create Your Own Wahala + Autosave
| # | Check | Auto status | Your verdict | Comments |
|---|-------|-------------|--------------|----------|
| B1 | Create 3–10 questions | ✅ PASS (auto) | | |
| B2 | Add/remove options; mark intended answer | ✅ PASS (auto) | | |
| B3 | Validation + progress feedback (short name / unanswered) | ✅ PASS (auto) | | |
| B4 | Preview → return to edit | ✅ PASS (auto) | | |
| B5 | Generate link + Copy | ✅ PASS (auto) | | |
| B6 | Recipient plays the shared link → score + CTA | ✅ PASS (auto) | | |
| B7 | Autosave + recovery after reload (notice shown) | ✅ PASS (auto) | | |
| B8 | Recovery of an **incomplete** draft | ✅ PASS (auto) | | |
| B9 | Start Fresh / discard clears the draft | ✅ PASS (auto) | | |
| B10 | Draft cleared after successful generation | ✅ PASS (auto) | | |
| B10a | **Perspective:** recipient questions name the **creator** ("If Shege…"), never "you" | ✅ PASS (auto) | | |
| B10b | **Perspective:** Builder flags ambiguous "you/my" wording; **Insert my name** resolves it | ✅ PASS (auto) | | |
| B10c | **Perspective:** Preview = exact recipient wording + review banner when a question still says "you" | ✅ PASS (auto) | | |
| B10d 👁️ | **Perspective:** play a shared challenge as a friend — each question reads clearly about the creator | — needs you | | |
| B11 👁️ | **WhatsApp native share** on a real phone (HTTPS) | — needs device | | |
| B12 👁️ | Builder **feel** on mobile (typing, tapping answers) | — needs you | | |

## C. Assume Their Life — five role evaluations
Open **Explore → Assume Their Life** → the picker shows **all five**: Founder, CEO, Billionaire, Political, Afrobeats. Each plays to a **Reckoning**. Two **contrasting** playthroughs are given per core role (tap the button text in order); outcomes are deterministic.

### C1. Founder Life — *Zero to One*
- **Diluted path:** Bring a cofounder 50/50 → Bootstrap → Persevere → Stay lean → **Aggressive VC (3× pref)** → Head down → **Sell** → **Diluted to Nothing** (a real sale, you get crumbs).
- **Scaled path:** Go solo → Bootstrap → **Pivot to PMF** → Senior hire+ESOP → **Clean 1× round** → Rally → **Sell** → **Venture Scaled** (you keep the upside).
- Consequence contrast: identical "sell" action, opposite money via the cap table.

| Auto status | Your verdict | Comments |
|---|---|---|
| ✅ PASS (auto) | | |

### C2. CEO Life — *Corner Office*
- **Ousted path:** Balanced → Promote internal → **Push sales** → **Public proxy fight** → Return cash → Rally → Deliver → **Ousted by the Board**.
- **Turnaround path:** Bet on growth → Retain CFO → **Invest in R&D** → Negotiate activist → Raise equity → Rally → Deliver → **Turnaround Hero**.
- Consequence contrast: the board actually votes you out vs backs you.

| Auto status | Your verdict | Comments |
|---|---|---|
| ✅ PASS (auto) | | |

### C3. Billionaire Life — *Paper & Power*
- **Liquidity crisis:** Borrow (margin) → Refuse family → **Lever up for the trophy** → **Hold through the crash** → Lobby → Call favours → Mega-bet → **Rich on Paper, Broke in Cash** (₦60bn+ net worth, ₦0 cash).
- **Dynasty:** Sell listed stock → Back family → Minority stake → **Deleverage in the crash** → Philanthropy → Restructure → Succession → **Dynasty Secured**.
- Consequence contrast: leverage + margin calls empty your cash while net worth stays high.

| Auto status | Your verdict | Comments |
|---|---|---|
| ✅ PASS (auto) | | |

### C4. Political Leadership — *The Mandate*
- **Fiscal ruin:** Big popular spend → Water-down → **Divert the capital budget** → Downplay unrest → Blame opp → **Year-end giveaway** → Full populist → **Fiscal Ruin** *despite* high approval (popular ≠ affordable).
- **Reformer:** **Invest in capacity** → Bold reform (passes **and** gets implemented) → Federal help → Dialogue → … → Run on record → **The Reformer**.
- Consequence contrast: a passed law only delivers if state capacity can implement it.

| Auto status | Your verdict | Comments |
|---|---|---|
| ✅ PASS (auto) | | |

### C5. Afrobeats — *Breakout Year* (additional role)
- **Cancelled:** Sign the 360 deal → Safe pop single → Start the beef → Double down → Hold the album → **Cancelled**.
- **Global Breakout:** Stay independent → Keep your day-ones → Stay humble → Go dark → Drop the album → **Global Breakout**.

| Auto status | Your verdict | Comments |
|---|---|---|
| ✅ PASS (auto) | | |

### C6 👁️ Experiential (your judgement)
| # | Check | Your verdict | Comments |
|---|-------|--------------|----------|
| C6a | Does each role **feel like an evolving life** (not disconnected cards)? | | |
| C6b | Are the **consequences** satisfying / legible in the Reckoning? | | |
| C6c | Are financial/institutional outcomes **plausible**? | | |
| C6d | Is the **Nigerian voice/tone** right? | | |

## D. Mobile & sharing
| # | Check | Auto status | Your verdict | Comments |
|---|-------|-------------|--------------|----------|
| D1 | Phone viewport: bottom nav shows, no horizontal overflow | ✅ PASS (auto) | | |
| D2 | Auth dialog moves focus correctly | ✅ PASS (auto) | | |
| D3 👁️ | Overall **mobile usability feel** across all features | — needs you | | |
| D4 👁️ | **WhatsApp share** of a challenge + a role result (on device, HTTPS) | — needs device | | |

## E. PR #5 — privacy hardening (security & fonts)
| # | Check | Auto status | Your verdict | Comments |
|---|-------|-------------|--------------|----------|
| E1 | Self-hosted fonts load from our origin (no Google request) | ✅ PASS (auto) | | |
| E2 | Font licences present (DM Sans + Space Grotesk, OFL-1.1) | ✅ PASS (auto) | | |
| E3 | CSP + security headers configured (`vercel.json`) | ✅ PASS (auto) | | |
| E4 | No CSP violations / no broken fonts / no gameplay regression | ✅ PASS (auto) | | |
| E5 👁️ | **Full response headers on the protected Vercel preview** (logged-in devtools: CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options; fonts from our origin; no console CSP errors) | — needs you | | |

## F. No-regression / integrity
| # | Check | Auto status | Your verdict | Comments |
|---|-------|-------------|--------------|----------|
| F1 | ATL picker displays **all five** roles | ✅ PASS (auto) | | |
| F2 | No significant browser errors / broken nav / missing modules | ✅ PASS (auto) | | |
| F3 | Financial & institutional **constraints preserved** (cap-table waterfall, board vote, budget, capacity) | ✅ PASS (auto) | | |

---

## Founder decision
- **Overall comments:**
  _______________________________________________________________

- **Items marked FAIL / NEEDS IMPROVEMENT (list):**
  _______________________________________________________________

- **Final acceptance decision:** ☐ Accept for release prep ☐ Accept with changes ☐ Not yet — rework

> Reminder: this build is a **local rehearsal only**. Nothing is merged to `main` or deployed. Publishing the Privacy Policy still needs: a genuine working contact, Supabase data-residency region, age-policy decision, retention approval, effective date, and legal review (see the privacy drafts).
