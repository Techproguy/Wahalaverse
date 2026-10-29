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

## A. Age eligibility — recommendation

**Recommended: a 16+ self-declared minimum for creating an account, with guest play open to
all, pending owner decision.** Rationale and options:

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **16+ to register** (guest play unrestricted) | Keeps viral guest sharing frictionless; avoids the heaviest minors'-data duties; honest to the brand | Self-declaration is not verification | **Recommended default** |
| 18+ to register | Simplest "no minors" story; matches earlier beta framing | Excludes a real slice of the youth audience; still self-declared | Reasonable alternative |
| No minimum | Max reach | Takes on minors'-data obligations the team can't realistically satisfy | Not recommended |

**Practical notes (only if the owner adopts a minimum):**
- A single checkbox is **not** strong proof — phrase it as a self-declaration and keep a
  timestamped record of consent.
- State the minimum in the Terms **and** the sign-up form consistently.
- **Do not re-introduce an 18+ gate in code** until the owner picks a policy (the current
  build deliberately has none).

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
