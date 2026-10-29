# Age Eligibility & Data Retention — practical recommendation (DRAFT)

> **Status:** recommendation for the **owner to decide** — **not imposed, not published, not
> implemented.** Nothing here changes the app's behaviour or the live site. The app
> currently imposes **no** age gate and no retention schedule; these remain open items on
> the Privacy Policy checklist. A Nigerian data-protection professional should review before
> anything is adopted. This is advisory, not legal advice.

## Context (facts)
- Audience: Nigerian young adults; brand voice is adult-leaning but not explicit.
- Data collected is minimal: display name, email, password (via auth provider),
  self-authored challenges, and activity history. No phone, no financial data, no precise
  location, no third-party analytics today.
- Processing minors' personal data attracts **extra obligations** under the NDPA
  (verifiable parental consent, heightened care), which a small team is poorly placed to
  meet well.

## A. Age eligibility — options (DECISION OPEN)

> **Correction (do not overstate):** **16+ still includes minors.** Under Nigerian law a
> minor is **under 18**, so a 16+ policy admits 16- and 17-year-olds, who are minors. A 16+
> self-declaration is therefore **NOT automatically NDPA-compliant** — processing a minor's
> data can require **verifiable parental/guardian consent** and extra safeguards. No age
> option below is "compliant" on its own; each needs legal review and, for any under-18
> users, a lawful basis for processing minors' data. **The decision stays open.**

| Option | Who it admits | Upside | NDPA/compliance implication (not advice) |
|---|---|---|---|
| **16+ to register** | **Includes minors (16–17)** + adults | Frictionless; honest to a youth brand | **Triggers minors'-data duties for 16–17** (likely verifiable parental consent, heightened care) — do **not** treat as compliant by default |
| **18+ to register** | Adults only | Avoids minors'-data duties *if* enforced honestly; matches earlier beta framing | Still self-declared (weak proof); simplest minors story |
| No minimum | Everyone, incl. younger minors | Max reach | Heaviest minors'-data obligations; not advisable for a small team |

**Implications to document whichever way the owner decides:**
- Self-declaration (a checkbox / entered age) is **not** verification; keep a timestamped
  record of the declaration and the policy version shown.
- If **any under-18 users** are permitted, a **parental-consent mechanism and a minors'-data
  handling approach** must be designed and legally reviewed before collecting their data.
- State the chosen minimum consistently in the Terms **and** the sign-up form.
- **Do not re-introduce an age gate in code** until the owner picks a policy (the current
  build deliberately has none) — and adding a gate alone does not establish compliance.

*(No recommendation is asserted as compliant; this is advisory and needs a Nigerian
data-protection professional's review.)*

## B. Data retention — recommendation (starting point for owner approval)

Principle: keep personal data only as long as it serves the user or a legal need, then
delete or anonymise. Suggested schedule (each row **[OWNER TO APPROVE]**):

| Data | Recommended retention | Notes |
|---|---|---|
| **Account** (email, display name, password hash) | While active; **delete within 30 days** of a deletion request or after **24 months** of inactivity (with notice) | Deletion already supported server-side |
| **Challenges** (user-created) | Life of the account; removed on account deletion | Public-readable by link while live |
| **Activity history** | Life of the account, or a rolling **12 months**, whichever the owner prefers | Low sensitivity |
| **Auth/security logs** (provider-side) | Per the auth provider's default, typically short | Confirm provider setting |
| **Device-local data** (`wv_activity`, `wv_cc_draft`, session id) | Until the user clears browser data | Never sent to us; not server-retained |
| **Backups** | Purged on the backup cycle (e.g. ≤ **35 days**) after deletion | Confirm provider backup window |

**Deletion request SLA (recommended):** acknowledge promptly and complete within **30 days**,
consistent with common data-subject-rights practice.

## C. What NOT to do yet
- Do **not** publish these figures in the Privacy Policy until the owner approves them and a
  professional has reviewed.
- Do **not** implement an age gate or automated deletion jobs without explicit approval.
- Keep these numbers in sync with the Privacy Policy §3 (age) and §5 (retention) once agreed.
