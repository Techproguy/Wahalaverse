# WahalaVerse — UX & viral-growth backlog (recorded, not yet implemented)

_Recorded 2026-10-28 from the product owner's mobile-UX review. **Not implemented yet** — Milestone 2
(auth/backend security) is mid-flight (stopped for review before Phase C), and these changes would
interrupt it. Scheduled for a dedicated UX pass after M2 clears review._

**Guardrails for all items (approved visual direction — preserve):** dark theme, lime-green identity,
playful illustrations, Nigerian youth personality; guest-first (no registration before first play);
keep both working games (Predict My Wahala, Survive Naija) and the responsive layout; no fabricated
content; no new paid services.

Priority: **P0** = directly drives the core growth loop (share → play → create) or is a hard
constraint; **P1** = strong conversion/quality; **P2** = polish.

| # | Item | Priority | Why it matters |
|---|------|----------|----------------|
| UX-1 | Make **Predict My Wahala** the primary homepage experience with one strong, exciting CTA | **P0** | It's the viral loop; the home must funnel to "create/play a challenge", not present games as equals |
| UX-2 | **Expressive, shareable result cards** optimized for WhatsApp Status / social | **P0** | The share card *is* the growth mechanic; a great card = more opens = more creators |
| UX-3 | Keep **registration optional before first play** | **P0 (constraint)** | Already true today; must stay true through every redesign |
| UX-4 | Improve **mobile typography & contrast** (small descriptions, nav labels) | **P1** | Readability + accessibility (WCAG contrast) on midrange Android in daylight |
| UX-5 | **Reduce homepage scrolling & repeated CTAs** | **P1** | Faster path to the one action that matters; less fatigue |
| UX-6 | Preserve working games + responsive layout | **P0 (constraint)** | Non-negotiable; regressions must be caught by existing E2E |

## Details & acceptance criteria

### UX-1 — Predict My Wahala as the hero (P0)
- Restructure the hero so the single primary CTA is "Make your challenge" (or "Play a challenge"),
  visually dominant; Survive Naija becomes a clearly secondary card, not a co-equal hero.
- Collapse the current 3-card "playground" + "1·2·3" + banner into a tighter funnel.
- **Acceptance:** above-the-fold on a 390×844 phone shows the Predict My Wahala value prop + one
  primary CTA; a first-time visitor can reach the create/play flow in one tap; guest E2E still green.

### UX-2 — Shareable result cards (P0)
- Design a vertical, screenshot-friendly result card (friendship score + Survive Naija outcome) sized
  for WhatsApp Status (9:16-ish), with bold score, playful copy, and WahalaVerse branding/handle.
- Provide "Share" (Web Share API, already present) **and** a "Save image" path (e.g. render the card
  to canvas → PNG) so users can post to Status even when Web Share can't attach an image.
- Keep answers non-secret caveat intact; no personal data on the card beyond the chosen display name.
- **Acceptance:** result screen offers a visually distinct card + share/save; card renders correctly
  at phone widths; no layout overflow.

### UX-3 — Registration stays optional (P0 constraint)
- No change needed to behavior; enforce as a guardrail/review check in the redesign. (Also aligns with
  the M2 launch restriction: no live registration until the backend + privacy work is approved.)

### UX-4 — Mobile typography & contrast (P1)
- Audit small text (`.intro`, `.sectionhead p`, `.helper`, `.navlink`, bottom-nav labels, card `p`)
  for size and contrast against the dark panels; raise sizes/weights and adjust muted colors to meet
  WCAG AA (4.5:1 for body, 3:1 for large text). `--muted` (#a9a8c2) on `--panel` (#1c1b34) is a likely
  offender for small text.
- **Acceptance:** key text passes AA contrast; no text below ~13px on mobile for primary content.

### UX-5 — Reduce scrolling & repeated CTAs (P1)
- The home currently repeats "create a challenge" CTAs across hero, cards, steps, and banner. Keep one
  primary + at most one secondary; drop the redundant banner or merge sections.
- **Acceptance:** homepage CTA count reduced; measurable drop in page height on mobile.

### UX-6 — Preserve games + responsiveness (P0 constraint)
- All redesign work must keep the Playwright E2E suite green (guest challenge loop, Survive Naija,
  nav/popstate, phone viewport, no horizontal overflow). Add E2E for the new share-card if feasible.

## Suggested sequencing
Do this as its own branch/PR **after** M2 security review, in order: UX-4 (quick, low-risk contrast/
type) → UX-1 (hero funnel) → UX-5 (trim) → UX-2 (share cards, largest effort). UX-3/UX-6 are standing
constraints checked throughout.
