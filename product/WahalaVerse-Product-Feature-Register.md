# WahalaVerse — Product Feature Register (reconciled)

**Purpose:** the canonical product-requirements reference and backlog for WahalaVerse features planned
**after** the current Milestone 2 Supabase integration. Planning artifact — **no feature here is
authorized for implementation, migration, deployment, or PR #2 scope expansion** without separate
founder approval.

> ✅ **Provenance.** Reconciled on **2026-10-28** against the recovered founder original, preserved
> verbatim as **`WahalaVerse-Product-Feature-Register-ORIGINAL.md`** in this folder. Where this file
> elaborates beyond the original, the elaboration is marked 🎭 illustrative or ❓ open — it is an
> implementation recommendation, **not** a retroactively claimed agreement. The reconciliation change
> summary is at the bottom.

_Last updated: 2026-10-28. Status: backlog / requirements reference._

## Legend — preserve these distinctions (do not silently convert examples into requirements)
- ✅ **Confirmed requirement** — a firm product decision; build toward it.
- 🎭 **Illustrative** — an example used to communicate intent; **not** a commitment to that exact
  content, number, person, scenario, score, graph, or engine.
- ❓ **Open decision** — explicitly not yet finalized by the founder; must be resolved before build.

## Hard sequencing / scope-protection rule (applies to everything)
✅ **Current priority is Milestone 2** (Supabase TEST integration, two-user RLS, auth/export/delete
verification, privacy & launch safeguards). **Do not implement any feature here on PR #2, and do not
interrupt the Supabase work.** Each new feature starts on its **own** branch/PR **after** the current
milestone's gates clear, with acceptance criteria and tests. PR #2 keeps its existing approval gates.

---

## Already shipped (context, not backlog)
- **Quick Challenge / "Predict My Wahala"** — the 7 predefined-question friendship challenge (live; guest-first).
- **Survive Naija** — the 4-round salary/life-decision mini-game (live; guest-first).
- **Milestone 2 (in progress, PR #2 — not merged)** — optional Supabase accounts: magic-link + OTP auth,
  profile, activity sync, secure challenge retrieval (RPC, no enumeration), data export + account
  deletion. Production stays guest-only.

---

## Build priority 1 — Create Your Own Wahala (Custom Challenges)  ✅ confirmed
The first planned **new gameplay** feature (ships before Assume Their Life).

- ✅ A separate **Custom Challenge** creation mode: users write their **own** questions, define the
  answer choices, **select their intended correct/personal answers**, and share with friends to
  **compare performance** — alongside the existing template-based Quick Challenge.
- ✅ **Do not replace** Quick Challenge — **maintain both**.
- ✅ Must remain **playable from a shared link without compulsory signup** (guest-first).
- ✅ Required before launch: **creator safety, content limits, abuse reporting, existing-link
  compatibility, and secure storage**.
- ✅ **A technical design exists; implementation is still pending.**
- 🎭 Illustrative design (schema `template_version` discriminator, guest-link v2 payload, specific
  content limits, validation, moderation) is drafted in **`CUSTOM_CHALLENGES_DESIGN.md`** (on the
  `milestone-2-auth-backend` branch). Numbers there (e.g. 3–10 questions, 2–4 choices, length caps) are
  illustrative starting points, not approved limits.
- ❓ Open: final content limits; whether anonymous users may *create* (recommendation: account-required
  to create, guest to play); moderation workflow depth; monetization (e.g. sponsored editions).

## Build priority 2 — Assume Their Life (working title)  ✅ confirmed
A **time-boxed, reality-grounded, hypothetical role-assumption simulation**: the player assumes the
*starting position* of a recognizable public figure or a high-stakes office, makes consequential
decisions over a defined period, and sees a **simulated** ending vs the dated starting snapshot.

> 🎭 Player-facing hook (illustrative copy, not a settled slogan): **"You inherited their position.
> Can you keep it?"**

**Must NOT be:** a generic multiple-choice quiz, a "President for a Day" question quiz, a reskinned
Survive Naija, a "start from zero and build" life sim, a shuffle of identical dilemmas per figure, or
the separate **Three Years / AYÉ** work. (Explicit boundary from the original §1.)

- ✅ **Real-world starting baseline:** publicly verifiable, **dated** figures/role constraints/context;
  **show data sources + timestamp and distinguish estimates from established facts**. Starting public
  net worth is an **estimate, not a spendable bank balance**.
- ✅ **Player-controlled alternate history:** after start, every event/outcome is **clearly fictional
  simulation** — not a claim or forecast about the real person; **no implied participation or
  endorsement**.
- ✅ **Finite, variable horizon:** duration varies by role/scenario. 🎭 Examples discussed: 12 days, 12
  weeks, 2–3 months, 4–6 months, one year; **"12 decisions over 12 weeks" is a useful example, NOT a
  universally approved format.** #events ≠ #calendar periods.
- ✅ **Causal, branching story:** a decision can change the **next** event and trigger immediate,
  delayed and cascading consequences; later events **remember** earlier decisions (commitments,
  omissions, investments, failures, relationships, prior crises). No universal fixed order; **event
  selection is conditional on evolving state**, not a shuffled list.
- ✅ **Not a disguised quiz:** decisions are actions with hard, pragmatic trade-offs and opportunity
  costs — not questions with a secret right answer; no guaranteed success, no arbitrary comedic punishment.
- ✅ **Role-specific reality:** different figures/positions have meaningfully different systems,
  constraints, stakeholders and events — not a renamed template.
- ✅ **Multiple consequence dimensions (not finance-only):** business/markets, government/politics,
  public confidence, employees, friends/family (where appropriate), media, reputation, personal
  decisions/crises, health/time. Role-relevant measures take priority over one universal score.
- ✅ **Net worth modeled honestly:** changes account for market movement, ownership, debts and
  liquidity — not every spend treated as an equal subtraction; paper wealth ≠ cash.
- ✅ **Small actions can matter:** a missed meeting, casual statement, staff/relationship decision or
  promise can trigger a plausible later cascade.
- ✅ **End-of-run reckoning:** compare dated start vs **simulated** end on role-relevant measures
  (wealth/resources, influence, public trust, business health, approval, leadership, relationships) with
  an **explainable trace** of the decisions that caused the changes.
- ✅ **Shareable results:** a concise, compelling WhatsApp/social outcome card (viral loop); never
  implying endorsement.
- 🎭 Illustrative examples (from the original §1 — named figures used **as examples only**): **"Assume
  Elon Musk"**, **"Assume the President"**, a **media/celebrity** role; plus the Spec's role packs (§5),
  the CEO 12-week cascade (§4), and the fully-worked **`ASSUME_THEIR_LIFE_SCENARIO_MAP.md`** (state
  model, event graph, scoring, 6 endings, engine sketch). **All illustrative** — not approved content,
  scores, graphs, engine, or profiles. The scenario map uses a **fictional analogue** to avoid
  real-person claims; the original also lists real names as examples — see the open decision below.
- ❓ Open decisions (original §1 + Spec §8) — **do not silently finalize:** which profiles/roles ship
  first; **named public figures vs clearly-labelled fictional analogues**; scenario length / round count
  / whether players choose duration; dynamic baseline updates, sourcing, FX, uncertainty ranges; the
  precise engine + balance model; save/resume; scorecard; moderation + **legal review** for using public
  figures; and how to **playtest with Nigerian youth** before costly production.

## Build priority 3 — Today's Wahala / "The Hot Seat"  ✅ retained (not committed for next phase)
- ✅ Retained as a future feature: recurring, relatable dilemmas with **social voting / share loops**.
  (Already teased on the homepage as a "Hot Seat — coming soon" card.)
- ✅ **Guardrail:** live community voting / percentages must use **real stored aggregate responses, never
  fabricated numbers.**
- ❓ Open: format/cadence, personalization, backend/storage for aggregates, moderation. **Not committed
  for the next engineering phase**; evaluate from actual usage evidence.

---

## Cross-cutting implementation guardrails (original §5)  ✅
- Phone-first web; low operating cost; short sessions; fast sharing & repeatability.
- **No mandatory signup** to try the first experience (guest-first).
- Distinguish **sourced real baseline facts** from fictional gameplay and simulated predictions.
- **No** unsupported statements, impersonation, implied endorsement, or fabricated allegations about
  real people.
- **Preserve historical baselines** so saved runs stay explainable when a public figure's real
  circumstances later change.
- **Never present a speculative outcome as an actual prediction.**
- No production changes or public data collection authorized by this register.

## Related documents
- `WahalaVerse-Product-Feature-Register-ORIGINAL.md` (this folder) — the recovered founder original, verbatim.
- `WahalaVerse-Assume-Their-Life-Causal-Simulation-Spec-v0.1.md` (this folder) — founder direction + design for priority 2.
- `ASSUME_THEIR_LIFE_SCENARIO_MAP.md` (this folder) — the pre-build playable scenario map (illustrative).
- `CUSTOM_CHALLENGES_DESIGN.md` (on `milestone-2-auth-backend`) — design for priority 1.
- `UX_BACKLOG.md` (on `milestone-2-auth-backend`) — mobile UX / viral-growth backlog.

---

## Reconciliation change summary (vs recovered original)
My first-pass register (authored before the original was supplied) was **directionally correct** — same
three features, same build order (Create Your Own Wahala → Assume Their Life → Today's Wahala), same
Confirmed/Illustrative/Open discipline. Changes made to fully align:
1. **Provenance** updated: original recovered + preserved verbatim; "attachment missing" flag removed.
2. **Assume Their Life** enriched with original specifics now marked ✅: honest **net-worth modeling**
   (market/ownership/debt/liquidity; paper ≠ cash); the illustrative **hook** "You inherited their
   position. Can you keep it?"; the full **boundary** (not Survive Naija / not start-from-zero / not a
   "President for a Day" quiz / **separate from Three Years / AYÉ**); explicit **variable-horizon**
   examples with "12×12 is illustrative, not approved."
3. **Named examples** (Elon Musk / President / media figure) recorded as 🎭 illustrative, with
   **named-figure vs fictional-analogue** kept ❓ open (my scenario map's fictional analogue is a
   design-demo choice, not a decision).
4. **Create Your Own Wahala** detail added: users **select intended correct/personal answers** and
   **compare performance**; required **creator safety / content limits / abuse reporting / existing-link
   compatibility / secure storage**; "**maintain both**, don't replace Quick Challenge"; "technical
   design exists, implementation pending."
5. **Today's Wahala** aligned: also **"The Hot Seat"**; **social voting/share loop**; ✅ guardrail that
   **live percentages must be real stored aggregates, not fabricated**; "not committed for next phase."
6. **Guardrails** added from original §5: preserve historical baselines for saved runs; never present
   speculation as prediction; no impersonation/endorsement/fabrication.
7. Added the principle that **illustrative/open items are recommendations, not retroactive agreements.**

**No confirmed requirement from the original was dropped or weakened. No illustrative example was
promoted to a requirement.** Remaining divergence is intentional and labeled: the scenario map uses a
fictional analogue (design demo) while the original cites real-name examples — reconciled by recording
both and keeping named-vs-analogue as an open decision.
