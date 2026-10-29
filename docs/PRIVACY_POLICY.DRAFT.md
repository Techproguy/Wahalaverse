# WahalaVerse — Privacy Policy (DRAFT STRUCTURE — NOT PUBLISHED)

> **Status:** Draft skeleton for owner + legal review. **Do not publish.** Every
> item marked **[OWNER TO CONFIRM]** must be supplied/verified by the operator (and,
> where noted, reviewed by a Nigerian data-protection professional) before this
> becomes a live notice. Nothing here invents a company, contact, retention period,
> or hosting region — those are left blank on purpose.
>
> This file describes **what the product actually does today** (guest-first static
> site; optional Supabase email+password accounts) and flags the legal decisions
> that are still open. It is written to align with the Nigeria Data Protection Act
> (NDPA) 2023 disclosure expectations, but is **not** a certification of compliance.

---

## 0. Facts the owner must supply before publishing

| # | Item | Needed for section | Status |
|---|------|--------------------|--------|
| 1 | Legal operator identity (individual/company name, RC number if any) | §1, §11 | **[OWNER TO CONFIRM]** |
| 2 | Privacy/support contact (email, and postal address if a company) | §1, §9, §11 | **[OWNER TO CONFIRM]** |
| 3 | Whether a Data Protection Officer / contact is designated | §11 | **[OWNER TO CONFIRM]** |
| 4 | Hosting region(s) for Supabase project and static host | §6, §7 | **[OWNER TO CONFIRM]** |
| 5 | Data retention periods (accounts, challenges, activities, auth logs) | §5 | **[OWNER TO CONFIRM]** |
| 6 | Audience / age policy decision (see §3 — currently **undecided**) | §3 | **[OWNER TO DECIDE]** |
| 7 | Whether any analytics will be used, and if so which + consent model | §4, §8 | **[OWNER TO CONFIRM]** |
| 8 | Cross-border transfer basis, if hosting is outside Nigeria | §7 | **[OWNER TO CONFIRM]** |
| 9 | Effective date of the published policy | header | **[OWNER TO CONFIRM]** |

---

## 1. Who we are
- Operator: **[OWNER TO CONFIRM — legal name]**
- Contact for privacy questions: **[OWNER TO CONFIRM — email / address]**
- This policy covers the WahalaVerse website and its games.

## 2. What the service does (plain description)
WahalaVerse is an entertainment website. You can **play as a guest with no account**.
Optionally, you may create an account (name + email + password) to save your
challenges and activity across devices.

## 3. Who can use it (audience / age)
> **[OWNER TO DECIDE]** — The audience/age policy is **not yet decided**. This section
> must be completed once the owner chooses (e.g. general audience, 16+, or 18+).
> Until then we make **no** age claim here and impose **no** age gate beyond what the
> owner decides. If a minimum age is adopted, state it and the basis for processing
> any minors' data under the NDPA.

## 4. What data we collect

**Guest play (no account):**
- We do **not** collect personal data on our servers for guest play.
- Your recent in-game activity is stored **only in your own browser** (`localStorage`)
  on your device. We cannot read it.
- When you create a shareable challenge link, your chosen **display name and answer
  key are encoded into the link itself** (and are therefore visible to anyone who has
  the link and inspects it). Guest links are not suitable for prizes/competitions.

**If you create an account (optional):**
- **Account:** email address and password (password handling is performed by our
  authentication provider — see §6; we do not store your raw password).
- **Profile:** the display name you choose.
- **Content:** challenges you save and your game activity history.
- **Technical:** standard security/operational logs kept by our hosting and auth
  providers (e.g. timestamps, IP address at sign-in) — **[OWNER TO CONFIRM retention]**.

**Analytics:** **[OWNER TO CONFIRM]** — The current build uses **no third-party
analytics tracker**. If analytics is added later, this section and §8 must describe it
and the consent model before launch.

## 5. Why we use it & how long we keep it
- To let you play, save challenges, and sign in.
- To keep the service secure and working.
- **Retention:** **[OWNER TO CONFIRM]** — define how long accounts, challenges,
  activities, and auth logs are kept, and what happens on account deletion.

## 6. Who processes data for us (sub-processors)
- **Authentication & database:** Supabase (email+password auth, profile/challenge/
  activity storage). Region: **[OWNER TO CONFIRM]**.
- **Static hosting / CDN:** **[OWNER TO CONFIRM — e.g. Vercel]**. Region/edge: **[OWNER TO CONFIRM]**.
- Fonts are **self-hosted** on our own origin; the site makes no Google Fonts request.

## 7. International transfers
- **[OWNER TO CONFIRM]** — If Supabase/hosting stores data outside Nigeria, state the
  countries/regions and the lawful transfer basis under the NDPA.

## 8. Cookies & local storage
- We use **browser `localStorage`** to remember your recent activity and (if signed in)
  your session. We do **not** use advertising cookies.
- Your authentication session token is stored by the auth provider's SDK in your browser
  so you stay signed in.
- **[OWNER TO CONFIRM]** — update if analytics/cookies are introduced.

## 9. Your rights (NDPA data-subject rights)
Subject to confirmation of the operator's processes, you may request to access,
correct, delete, or export your personal data, and to object to or restrict certain
processing.
- **Self-service today:** signed-in users can **export** and **delete** their account
  data from within the app (account deletion runs server-side via a secure function;
  no admin credentials are shipped to the browser).
- **Contact route:** **[OWNER TO CONFIRM — email]** for any request the app cannot
  self-serve.
- You may also complain to the Nigeria Data Protection Commission.

## 10. Security
- Row-level security and scoped database grants restrict account data to its owner.
- Passwords are handled by the authentication provider; we do not store raw passwords.
- Security headers (including a Content-Security-Policy) are applied to the site.
- No system is perfectly secure; we cannot guarantee absolute security.

## 11. Contact & changes
- Questions: **[OWNER TO CONFIRM — contact]**.
- We may update this policy; the **effective date** will appear at the top
  (**[OWNER TO CONFIRM]**).

---

### Notes for the reviewer (remove before publishing)
- **No OTP / no mandatory email verification:** sign-up is email + password with
  immediate sign-in. This policy therefore does **not** claim email verification or
  that a welcome/confirmation email proves account ownership.
- **Age:** deliberately left as an open owner decision (§3) — no 18+ claim is asserted
  here.
- This is a **structure**, not legal advice. A Nigerian data-protection professional
  should review before publication.
