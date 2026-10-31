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

## 0. Operator facts — confirmed vs still outstanding

**Confirmed by the owner (2026-10-29):**

| Item | Value |
|------|-------|
| Sole proprietor | **Mercy Moyinoluwa Adepoju** |
| Registered business name | **Technoestro Solutions** |
| Product brand | **WahalaVerse** |
| Country | **Nigeria** |
| Planned domain | **wahalaverse.com** — ⚠️ *not yet purchased* |
| Planned privacy email | **privacy@wahalaverse.com** — ⚠️ *not yet active* |

> ⚠️ **Do not publish with inactive contact details.** The domain and email above are
> *planned*. This policy must **not** go live until `wahalaverse.com` is registered and
> `privacy@wahalaverse.com` is active and monitored — otherwise it would advertise a
> contact route that cannot receive data-subject requests.

**Still outstanding before publishing:**

| # | Item | Needed for section | Status |
|---|------|--------------------|--------|
| 1 | Privacy email activation (`privacy@wahalaverse.com` live & monitored) | §1, §9, §11 | **[PLANNED — NOT YET ACTIVE]** |
| 2 | Domain registration (`wahalaverse.com`) | header, §1 | **[PLANNED — NOT YET PURCHASED]** |
| 3 | Whether a Data Protection Officer / contact is designated | §11 | **[OWNER TO CONFIRM]** |
| 4 | Hosting region(s) for Supabase project and static host | §6, §7 | **[OWNER TO CONFIRM]** |
| 5 | Data retention periods (accounts, challenges, activities, auth logs) | §5 | **[OWNER TO CONFIRM]** |
| 6 | Audience / age policy decision (see §3 — currently **undecided**) | §3 | **[OWNER TO DECIDE]** |
| 7 | Whether any analytics will be used, and if so which + consent model | §4, §8 | **[OWNER TO CONFIRM]** |
| 8 | Cross-border transfer basis, if hosting is outside Nigeria | §7 | **[OWNER TO CONFIRM]** |
| 9 | Effective date of the published policy | header | **[OWNER TO CONFIRM]** |

---

## 1. Who we are
- Operator: **Mercy Moyinoluwa Adepoju**, sole proprietor, trading as **Technoestro
  Solutions** (Nigeria).
- Product: **WahalaVerse** (this website and its games).
- Contact for privacy questions: **privacy@wahalaverse.com** — ⚠️ *planned; must be
  active before this policy is published*.

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
- We do not run our **own** server database for guest play, and we do **not** ask you
  to sign in. But guest play is **not processed exclusively on your device** — be
  accurate about three things:
  - **Device-local storage.** Your recent in-game activity and any in-progress
    "Create Your Own Wahala" draft are stored in your **own browser** (`localStorage`)
    on your device (keys `wv_activity`, `wv_cc_draft`, `wv_pending_name`). We cannot
    read these.
  - **Hosting provider (Vercel).** Serving the site means our hosting/CDN provider
    (**Vercel**) necessarily **processes your requests** — including your **IP address**,
    user-agent and standard **access/security logs** — to deliver the pages, even when
    you play as a guest. Region/retention for that processing: **[OWNER TO CONFIRM]**
    (see §6–§7).
  - **Personal content inside shared links.** When you create a challenge link, the
    **display name and answers you entered are encoded into the link itself**. That is
    **personal content that travels in the URL** to anyone you share it with (and to
    whatever app/platform carries the link, e.g. a messaging service). Anyone with the
    link can read/decode it. Don't put private information in names, questions, or
    answers; guest links are not suitable for prizes/competitions.

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
- **Static hosting / CDN:** **Vercel** (current preview). A test request was **routed via
  the `fra1` (Frankfurt) edge** — this indicates **request routing only, NOT confirmed data
  residency** or where any persistent data is stored. Production region/plan **[OWNER TO
  CONFIRM]**.
- Fonts are **self-hosted** on our own origin; the site makes no Google Fonts request.

## 7. International transfers
- ⚠️ **Not yet determined.** A test request was *routed* through Vercel's **`fra1`**
  (Frankfurt) edge — that is observed **routing**, not proof of data-storage location. The
  **Supabase project region** (where account data actually lives) is **[OWNER TO CONFIRM]**
  — it is **not** derivable from the public project URL. Before launch, confirm the actual
  **data-residency** region(s) for Supabase (and any Vercel storage), and if account data is
  stored **outside Nigeria**, state the countries/regions and the lawful cross-border
  transfer basis under the NDPA.

## 8. Cookies & local storage
- We use **browser `localStorage`** on your own device. We do **not** use advertising
  cookies. The keys we set are:
  - `wv_activity` — your recent in-game activity (challenges/games/role-sim results).
  - `wv_cc_draft` — an **autosaved draft** of a "Create Your Own Wahala" challenge you are
    building, so it survives an accidental reload. Stored **only on your device**, never
    sent to us; cleared when you generate the challenge, start fresh, or clear browser data.
  - `wv_pending_name` — a display name you entered, kept briefly to complete sign-in.
  - a per-tab session id (`sessionStorage`) used to keep guest activity on this device only.
- If you sign in, your authentication session token is stored by the auth provider's SDK
  in your browser so you stay signed in.
- **[OWNER TO CONFIRM]** — update if analytics/cookies are introduced.

## 9. Your rights (NDPA data-subject rights)
Subject to confirmation of the operator's processes, you may request to access,
correct, delete, or export your personal data, and to object to or restrict certain
processing.
- **Self-service today:** signed-in users can **export** and **delete** their account
  data from within the app (account deletion runs server-side via a secure function;
  no admin credentials are shipped to the browser).
- **Contact route:** **privacy@wahalaverse.com** (⚠️ *planned; must be active before
  publication*) for any request the app cannot self-serve.
- You may also complain to the Nigeria Data Protection Commission.

## 10. Security
- Row-level security and scoped database grants restrict account data to its owner.
- Passwords are handled by the authentication provider; we do not store raw passwords.
- Security headers (including a Content-Security-Policy) are applied to the site.
- No system is perfectly secure; we cannot guarantee absolute security.

## 11. Contact & changes
- Operator: **Mercy Moyinoluwa Adepoju** (Technoestro Solutions), Nigeria.
- Questions: **privacy@wahalaverse.com** (⚠️ *planned; must be active before
  publication*).
- A Data Protection Officer / designated contact is **[OWNER TO CONFIRM]**.
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
