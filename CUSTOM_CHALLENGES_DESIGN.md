# Technical design — Custom Challenges (DESIGN ONLY, not approved for build)

_Prepared in Phase D at the reviewer's request. **Do not implement without separate
approval.** This describes how WahalaVerse can support two challenge kinds:_

- **Quick Challenge** — the current 7 predefined questions (template).
- **Create Your Own Wahala** — the creator writes their own questions + answer choices.

## 1. Goals & constraints
- Keep the viral loop and **guest-first** play (a recipient opens any valid link without
  registering).
- **Backwards compatible:** every existing guest (`?guest=`) and cloud (`?c=`) link keeps working.
- Low cost, no heavy media; text-only questions/choices for v1.
- Abuse-resistant: user-generated content (UGC) needs limits, validation, and reporting.

## 2. Data model: a `template_version` discriminator
The schema already carries `template_version` on `challenges` (currently always `1`). Use it as the
kind discriminator instead of changing existing rows:

| template_version | Kind | Questions source |
|---|---|---|
| `1` | Quick Challenge | Client-side constant `core.Q` (unchanged) |
| `2` | Create Your Own Wahala | Stored `questions` payload (new column) |

- **Add a nullable `questions jsonb` column** to `challenges` (null for v1, required for v2). v1 rows
  are untouched → **existing links keep resolving** (the client renders `core.Q` for v1 and the stored
  `questions` for v2).
- `answers smallint[]` stays the creator's answer key for both kinds (index into each question's
  choices). For v2, `cardinality(answers)` must equal the number of custom questions.

### Guest-link compatibility
- v1 guest links encode `{v:1, n, t, a}` (unchanged).
- v2 guest links must also carry the questions. Define a **new guest payload version** `v:2`
  `{v:2, n, t, a, q:[{q, a:[...]}]}` and keep `decodeChallenge` accepting BOTH v1 and v2. Old links
  (v1) never change. Enforce a strict max encoded length so v2 links stay shareable on WhatsApp
  (see limits) — if a custom challenge is too big to encode, require a cloud (`?c=`) link instead.

## 3. Content limits (v1 proposal — tune with the owner)
| Field | Limit |
|---|---|
| Questions per challenge | 3–10 (Quick stays fixed at 7) |
| Choices per question | 2–4 |
| Question text | ≤ 120 chars |
| Choice text | ≤ 60 chars |
| Title | ≤ 80 chars (existing) |
| Display name | 2–30 (existing) |
| Guest-link `q` payload | hard cap on encoded length (e.g. ≤ 3500 chars, as today) |

Enforced in **three places**: client (UX), `core.decodeChallenge`/a new `validateCustom()` (pure,
testable), and the DB (CHECK constraints + a `jsonb` shape check, plus `cardinality(answers)` =
question count).

## 4. Validation
- Pure `core.validateCustomChallenge(payload)` returns `{ok, error}`; reused by the create form, the
  guest decoder, and (mirrored) the DB constraints. Checks: counts/lengths in range, each `answers[i]`
  is a valid index into that question's choices, no empty strings, UTF-8 only.
- Server (RLS insert) still enforces `owner_id = auth.uid()`; add CHECK constraints for v2 shape so a
  crafted REST insert can't store malformed/oversized content.
- All rendering already HTML-escapes via `core.escapeHtml` — custom text is **never** injected raw
  (XSS-safe). Re-verify for the new question/choice fields.

## 5. Abuse reporting & moderation
- **Report path:** a `report-challenge` action → a lightweight `challenge_reports` table
  (`id, challenge_id, reporter_id nullable, reason, created_at`) writable by anon+authenticated
  (rate-limited), readable only by an operator/admin role. No public counts.
- **Rate limits / anti-spam:** cap create frequency per account/IP (server-side), CAPTCHA option for
  anon creation if v2 is ever allowed for guests (recommend **account-required** to create v2, while
  playing stays guest-first).
- **Takedown:** operator can delete a reported challenge (service-side); consider a `hidden boolean`
  so a reported item can be soft-hidden pending review without breaking links (renders a "removed"
  state).
- **Content policy:** display the "catch cruise, not feelings" tone guidance; prohibit targeted
  harassment / protected-group attacks (aligns with the project's voice guardrail).

## 6. Rollout plan (when approved)
1. Migration `0003`: add `questions jsonb` + CHECK constraints + `challenge_reports` table + RLS.
2. `core`: `validateCustomChallenge`, extend `decodeChallenge`/`encodeChallenge` to v2 (keep v1).
3. UI: "Create Your Own Wahala" builder (add/remove questions + choices, pick your answers).
4. Player: render v1 from `core.Q`, v2 from stored/encoded `questions`.
5. Reporting UI + operator moderation.
6. Tests: validation (pure), v1/v2 encode-decode round-trips + rejections, RLS for reports, abuse
   rate-limit, XSS escaping of custom text.

## 7. Risks
- **Link size** for v2 guest links (mitigated by limits + cloud fallback).
- **Moderation load** (mitigated by account-required creation + reporting + soft-hide).
- **Backwards-compat regressions** (mitigated: v1 untouched; versioned payloads; decode accepts both).

_No code for this feature is included in Phase D._
