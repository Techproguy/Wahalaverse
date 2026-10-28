# WahalaVerse — Claude Code project instructions

You are the lead IMPLEMENTATION AGENT for WahalaVerse, a low-cost, mobile-first Nigerian youth (18+) social entertainment web app. The product owner and their ChatGPT reviewer make product and launch decisions. Follow this file and `HANDOFF_FOR_CLAUDE.md` before editing.

## Mission
Ship a trustworthy, delightful, low-cost beta that starts with **Predict My Wahala** (viral friendship quiz), **Survive Naija** (choice-based mini game), and **My Corner** (personal activity). Users should be able to play as guests before any sign-up; optional name + email magic-link signup saves challenges and activities to Supabase. Optimize for WhatsApp link sharing on mobile connections in Nigeria, including midrange Android devices.

## Current reality
This is an existing STATIC HTML/CSS/JavaScript starter, NOT a complete launched website. Do not rewrite in a new framework without evidence of a concrete need and approval. Do not claim the cloud backend, RLS, deletion flow, consent, or production deployment is done just because the code has placeholders.

Key files:
- `index.html`: shell and basic social metadata
- `styles.css`: responsive styling
- `app.js`: UI, navigation, quiz, simulator, activity, optional Supabase auth/storage
- `config.js`: currently EMPTY public Supabase configuration
- `supabase-schema.sql`: DRAFT three-table schema, not applied to any live project
- `privacy.html`: DRAFT and not publication-ready
- `README.md`: background and setup

## Non-negotiables
1. Keep source simple, maintainable, fast, and inexpensive. No large backend or paid third-party services without explicit permission.
2. Preserve guest play and frictionless shareable URLs. A recipient must not be forced to register before playing.
3. Never commit or print secrets. Browser code may include Supabase **publishable/anon** key only; never `service_role`, `sb_secret`, SMTP passwords, session tokens, or production credentials. Use placeholders/env as appropriate.
4. Use migrations for schema changes, RLS for every relevant app table, and validate access for anon/user A/user B. Do not run production migrations or deploy until user authorization.
5. Protect privacy: minimal data, transparent retention and rights handling, avoid tracking/contact scraping and dark patterns. Restrict beta signup to adults; do not assume a checkbox alone establishes legal compliance.
6. Design for real, safe social sharing and avoid exposing email addresses or personal activity to other users. Do not expose the quiz owner's email. Guest quiz answers are observable in guest URLs, so never use for prizes.
7. Maintain accessibility: semantic elements, keyboard navigation, focus, touch targets, mobile usability and reasonable reduced-data performance.
8. Preserve Nigerian voice and humour, avoid punching down or insulting protected groups.
9. Never present unfinished flows as working or declare production-ready without tests.
10. Small, reviewable commits; describe diff, tests, risks and human-dependent tasks after each milestone. Ask product owner before paying for services, changing scope, deleting user data, or publishing publicly.

## Work protocol
**First task:** Audit the existing codebase; verify actual behavior; write a short numbered implementation plan and update `STATUS.md` with working/pending/blocking, then implement Milestone 1 below. Do not ask for extensive open-ended specifications; use this as source of truth. Use TODOs with blockers when Supabase credentials/legal details are unavailable.

### Milestone 1 — Reliability + tests (first PR)
- Run syntax checks and serve site locally. Add appropriate automated smoke tests for guest friendship challenge create → copy/share URL → open in a fresh context → complete → result → create-your-own CTA; Survive Naija full round; navigation/popstate; input validation; malformed links; phone viewport. Choose a lightweight test approach with clear commands.
- Audit guest activity syncing when one person signs out and another signs in on the same browser. Prevent one account's local activity from being incorrectly uploaded to a different account. Test this.
- Audit and fix deep-link behavior and async Supabase initialization for cloud challenge links; avoid false "link broken" UI while SDK is loading.
- Fix user-visible issues, broken loading/error states, duplicate rapid taps, and basic accessibility issues without doing an unnecessary rewrite.
- Update README with exact test steps and outcomes. Report any untested code paths explicitly.

### Milestone 2 — Real account integration (second PR; needs credentials and approved DB project)
- Verify passwordless Supabase email login, redirect URL and mobile return, profile creation, saved challenge persistence and activity after refresh/signout/login.
- Implement secure profile update and user-facing export/delete process or a documented secure operator-assisted workflow before allowing live data collection. Review schema/permissions and audit actual SQL policy behavior using test accounts; no admin credentials in the browser.
- Clearly distinguish guest activity from account activity and avoid undesired cross-account syncing. Graceful auth/email delivery failure handling.
- Review draft privacy page with operator-provided legal identity/contact details; DO NOT invent a legal operator or privacy compliance certification.

### Milestone 3 — Closed beta launch (separate PR; user approval required)
- Proper OG share preview image, favicon, descriptive result/share text, deployment configuration, phone/performance QA; reasonable abuse protection and email sender/rate limits.
- Privacy-respecting events: challenge_created, challenge_opened, challenge_completed, own_challenge_started, simulator_completed, and signup_completed; define events and anonymous/consented collection method. Do not deploy invasive tracking without permission.
- Provide launch runbook, rollback instructions and simple KPI report. Avoid asserting virality or revenue.

## Definition of done for review
Provide for each milestone: summary of changes, code files touched, commands executed and outputs, test cases passing/failing, security/privacy considerations, deployment effect, blockers requiring owner actions, and proposed next step. Include a short `REVIEW_NOTES.md` summary that can be sent back to ChatGPT for independent code review.
