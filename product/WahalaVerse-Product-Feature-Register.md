# WahalaVerse — Product Feature Register

**Purpose:** the canonical product-requirements reference and backlog for WahalaVerse features
planned **after** the current Milestone 2 Supabase integration. This is a planning artifact — **no
feature here is authorized for implementation** without separate founder approval.

> ⚠️ **Provenance note.** A file named `WahalaVerse-Product-Feature-Register.md` was referenced as an
> attachment but was **not present** in the materials provided (only
> `WahalaVerse-Assume-Their-Life-Causal-Simulation-Spec-v0.1.md` and a mascot logo were). This Register
> was therefore **authored from the founder's written instructions + the Causal Simulation Spec**, so
> it can be reconciled with the intended original — please correct anything that diverges.

_Last updated: 2026-10-28. Maintainer: implementation team. Status: backlog / requirements reference._

## Legend — preserve these distinctions
- ✅ **Confirmed requirement** — a firm product decision; build toward it.
- 🎭 **Illustrative** — an example used to communicate intent; **not** a commitment to that exact
  content, number, person, or scenario.
- ❓ **Open decision** — explicitly not yet decided by the founder; must be resolved before build.

## Hard sequencing rule (applies to everything below)
❓/✅ **Do not implement any feature in this Register on PR #2, and do not interrupt the Milestone 2
Supabase TEST integration.** Each feature is prototyped on its **own** later branch/PR, only after the
founder approves its scenario/design. No additional gameplay code is authorized yet.

---

## Already shipped (context, not backlog)
- **Quick Challenge / "Predict My Wahala"** — the 7-question friendship challenge (live; guest-first).
- **Survive Naija** — the 4-round salary/life-decision mini-game (live; guest-first).
- **Milestone 2 (in progress)** — optional Supabase accounts: magic-link + OTP auth, profile, activity
  sync, secure challenge retrieval (RPC, no enumeration), data export + account deletion. On branch
  `milestone-2-auth-backend` / PR #2; not merged; production stays guest-only.

---

## Priority 1 — Create Your Own Wahala  ✅ (confirmed priority)
User-authored, shareable challenges **alongside** the existing Quick Challenge.

- ✅ Users can write their own questions + answer choices and share them like Quick Challenges.
- ✅ Must coexist with Quick Challenge (the 7 predefined questions stay).
- ✅ Guest-first play preserved; existing guest (`?guest=`) and cloud (`?c=`) links must keep working.
- 🎭 Illustrative design (schema `template_version` discriminator, guest-link v2 payload, content
  limits, validation, abuse reporting) is drafted in **`CUSTOM_CHALLENGES_DESIGN.md`** (on the
  `milestone-2-auth-backend` branch). Numbers there (e.g. 3–10 questions, 2–4 choices, length caps) are
  illustrative starting points.
- ❓ Open: final content limits; whether anonymous users may *create* v2 (recommendation:
  account-required to create, guest to play); moderation workflow depth; monetization (sponsored
  editions) — all deferred.

## Priority 2 — Assume Their Life  ✅ (confirmed priority)
A **time-boxed, reality-grounded, stateful branching simulation**: the player assumes the *publicly
documented starting position* of a real public figure or an office (e.g. president), makes consequential
decisions, and compares a **simulated** ending (wealth, influence, reputation, leadership, etc.) against
the dated starting snapshot.

**This must NOT be a generic multiple-choice quiz, a reskinned Survive Naija, or a shuffled list of
identical dilemmas.**

- ✅ Confirmed core requirements (from the founder brief + `WahalaVerse-Assume-Their-Life-Causal-Simulation-Spec-v0.1.md` §2):
  1. Causal, branching story — a decision can change the **next** event and trigger immediate, delayed
     and cascading consequences; later events remember earlier decisions; no universal fixed order.
  2. Not a disguised quiz — decisions are actions with real trade-offs, not questions with a secret
     right answer.
  3. Role-specific reality — different people/positions have meaningfully different systems,
     constraints, stakeholders and events (not a renamed template).
  4. Grounded starting position — public baseline facts are **dated and sourced** and distinguished
     from estimates; the playable future is **clearly hypothetical**, not a claim/forecast about the
     real person.
  5. Variable time horizon (days…a year); #events ≠ #calendar periods.
  6. Multiple consequence dimensions (finances, operations, leadership, policy, citizens, media,
     reputation, relationships, health/time, personal pressure — as fits the role), not just net worth.
  7. Small actions can matter (a missed meeting / casual statement / promise can cascade later).
  8. Meaningful end report — dated start vs simulated end, stakeholder outcomes, unintended
     consequences, and an **explainable** trace of the pivotal turning points.
  - ✅ The engine remembers commitments, omissions, investments, failures, relationships, prior crises;
    **event selection is conditional on evolving state**, not a shuffled list.
- 🎭 Illustrative: the CEO 12-week cascade in the Spec §4, the role packs in §5, the engine shape in §6,
  and the fully-worked **`ASSUME_THEIR_LIFE_SCENARIO_MAP.md`** in this folder (a complete branching
  event graph, delayed cascades and multiple endings). These demonstrate the *causal structure* — they
  are **not** a settled content script, approved role, named person, or final numbers.
- ❓ Open decisions (Spec §8): first playable role / named person vs fictional analogue; duration & time
  compression; ratio of sourced baseline vs authored counterfactual; depth/visual presentation; budget,
  storage, monetization, moderation, end-card format. **No implementation authorization until a
  founder-approved scenario map + first-run design exist.**

## Priority 3 — Today's Wahala  ✅ (retain as a future feature)
- ✅ Retained as a future feature (a recurring "today's" challenge/moment).
- ❓ Essentially all specifics are open: format (is it a daily Quick Challenge? a daily simulation
  beat? an editorial prompt?), cadence, personalization, backend needs, moderation. No spec has been
  provided yet; to be defined before any design work.

---

## Cross-cutting constraints (apply to all features)
- ✅ **Guest-first**: trying any experience must not require sign-up.
- ✅ **Mobile-first + WhatsApp-shareable**; low data/cost; preserve the Nigerian voice; avoid punching
  down.
- ✅ **No fabricated facts about real people**; named-figure content needs dated, sourced public
  baselines and clear "hypothetical — not affiliated/endorsed" labeling.
- ✅ **Privacy & safety** rules from Milestone 2 carry forward (no live registration until privacy +
  deletion/export are approved; production guest-only until then).

## Related documents
- `WahalaVerse-Assume-Their-Life-Causal-Simulation-Spec-v0.1.md` (this folder) — founder direction + design for Priority 2.
- `ASSUME_THEIR_LIFE_SCENARIO_MAP.md` (this folder) — the pre-build playable scenario map for Priority 2.
- `CUSTOM_CHALLENGES_DESIGN.md` (on `milestone-2-auth-backend`) — design for Priority 1.
- `UX_BACKLOG.md` (on `milestone-2-auth-backend`) — mobile UX / viral-growth backlog.
