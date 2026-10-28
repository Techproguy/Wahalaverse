# WahalaVerse — Assume Their Life: Causal Simulation Design

**Version:** v0.1 — founder-direction capture and proposed design for review  
**Date:** 2026-10-28  
**Status:** **DESIGN ONLY — not authorization to code, migrate, deploy, or expand PR #2**  
**Related:** `WahalaVerse-Product-Feature-Register.md` §1; Custom Challenges remains a separate product feature.

## 1. Product promise

**Assume a real-world position. Make difficult decisions. Live with the consequences.**

A player temporarily takes the *publicly documented starting position* of a prominent person (for example, Elon Musk), or of a high-stakes office such as president. The player gets an initial, dated snapshot of applicable wealth/holdings, power, obligations, institutions, stakeholders and current pressures. The player then enters a *clearly fictional, alternative timeline* lasting a bounded period (illustrative possibilities: days, 12 weeks, 2–6 months, a year). At the end they see what happened to the role's relevant measures and **why**.

This is **not** the existing four-round Survive Naija game, a generic personality quiz, 12 unrelated hypothetical questions, a random shuffle of identical dilemmas for every public figure, or an open-ended start-from-zero life sim.

## 2. Founder-confirmed core requirements

1. **Causal, branching story.** The player's response to an event may determine their **next** event and can create a cascade of immediate, delayed and indirect events. Later situations must remember earlier decisions. There is no universal fixed question order.
2. **Not a disguised quiz.** Decisions are actions in an evolving simulation, not questions with a secretly correct answer. Players should need to reason, prioritise and accept hard trade-offs.
3. **Role-specific reality.** Different personalities and positions face meaningfully different systems, constraints, stakeholders and events. Simply swapping the person's name or shuffling generic questions is unacceptable.
4. **Grounded starting position.** Public baseline facts must be dated, sourceable and distinguished from estimates; the playable future is hypothetical, not an assertion about the actual person or a forecast.
5. **Variable time horizon.** The role/scenario may unfold over days, weeks, months or a year. The number of events/decisions is not automatically equal to the number of calendar periods.
6. **Multiple dimensions of consequence.** Finances, companies, operations, leadership, government policy, citizens, media, reputation, relationships, health/time and personal pressure as appropriate to the assumed role—not just net worth.
7. **Small actions can matter.** A missed meeting, casual statement, staff decision or promise can trigger a plausible later cascade, not only headline-making decisions.
8. **Meaningful end-of-run report.** Compare the dated initial position with the *simulated* final position, including sustained or diminished wealth/influence where relevant, stakeholder outcomes, unintended consequences, and a trace explaining major turning points.

## 3. Proposed experience architecture (open for product review)

### A. Setup: inherit a situation, not a title

Show a concise **Situation Brief**:
- Who/what role; snapshot date; sources and uncertainty of public baselines.
- What is actually controlled: CEO cannot simply spend every dollar of market capitalization; president cannot unilaterally enact every policy; celebrity cannot control fan reaction.
- Starting tensions: outstanding obligations, allies, opponents, budgets, stakeholders, reputational pressures, uncertainty.
- Horizon (scenario-specific, possibly player-selectable later) and the goal: survive, improve, or leave a defensible legacy. No single universally correct outcome.

### B. Gameplay: a living decision engine

Each step follows **Situation → Choose action → Immediate response → Updated world → Follow-on event(s)**. The player sees information they would plausibly possess. Some uncertainty remains; additional investigation may cost time, money or goodwill. They can sometimes delay, negotiate, delegate, ask for information or do nothing; inaction can also be consequential.

The game tracks a **compact state**, adjusted by role: available cash vs paper wealth, liquidity, ownership/control, operational capacity, public credibility, political capital/approval, institutional constraints, stakeholder trust, commitments, time and competing risks.

**Events are selected by state and history, not shuffled**. An event can have:
- Preconditions (e.g. a supplier contract was canceled; cash reserves are below threshold).
- Trigger source (player action, stakeholder response, external shock, deadline, or a previously planted consequence).
- Timing/deadline and meaningful alternatives with costs.
- Immediate effects, delayed "seeds", commitments and stakeholder memories.
- Follow-up event IDs or eligibility rules, so choices unlock/block/modify future circumstances.
- A source/provenance label for the *baseline*; fictional scenarios labelled hypothetical.

Choose from a plausible candidate pool using causally relevant conditions; use variety only within plausibility constraints. Ensure important cascades reach the player before the end of the chosen horizon.

### C. Stakes should be connected

A business decision might affect cash → staff retention → operations → media confidence → valuation → ability to borrow. A leader's speech might affect citizens' trust → legislative coalition → policy feasibility → protests or compromise. A personal promise might affect whether a trusted adviser stays and whether an opportunity reaches the player later.

Trade-offs should be explainable without making one option obviously "good" or "bad". Luck and outside forces may affect outcomes, but must not override a coherent causal record.

### D. End: Hindsight / Reckoning

Report role-appropriate before/after measures, a short story of the run, **3–5 pivotal decisions**, delayed effects and alternative opportunities missed. Explain *observed simulated causes* rather than claiming certainty about the real world. A WhatsApp-ready result card can tease a headline such as "You protected the business but lost the board's confidence" and link back to play. Never imply endorsement by the depicted person.

## 4. Example branching cascade (ILLUSTRATIVE FICTION; not a claim about any real person)

**Role:** Founder/CEO of a major technology group. **Starting context:** A critical supplier fails ahead of a launch. Workforce, lenders, regulators and customers are waiting. **Horizon:** 12 weeks.

**Decision 1 (Week 2):** How do you respond?

| Player decision | Immediate cost / effect | Distinct next event triggered | Possible delayed consequence |
|---|---|---|---|
| **A. Finance emergency in-house production** | Uses liquidity; improves control; strains staff | **Week 3:** Engineering lead asks for an urgent safety and overtime decision | **Week 7:** Exhaustion/quality risk or improved output changes customer trust and board support |
| **B. Postpone launch and protect cash** | Preserves reserves; may disappoint partners | **Week 3:** An anchor customer threatens to cancel its contract | **Week 8:** Cash runway remains healthier, but a competitor may win market share |
| **C. License production to an external partner** | Faster capacity; gives up margin/control | **Week 3:** Partner requests access to sensitive designs and exclusivity | **Week 9:** Delivery improves or IP/control dispute develops, depending on contract terms |

A new event should be determined by **the actual selected path plus conditions**, not served as an unrelated generic dilemma. Later external shocks may intersect with different paths differently. A player who chose A may never see the partner-contract negotiation from C. The Week 7 outcome also depends on subsequent choices (for example, how they treat staff), not solely on the first click.

**Second-order cascade:** If the player earlier dismissed the safety concern, a delayed quality issue may trigger media scrutiny; if they hired independent reviewers, the same external shock may instead trigger a board discussion about cost. A small operational choice shapes a later public crisis. Both outcomes should have clear in-game evidence.

## 5. Content design: every assumed life must actually differ

Use a **shared engine**, but a distinct **role pack** (data + authored events + role-specific rule modules) per type of position:

| Role pack | Distinctive systems | Examples of consequential choices | Suitable outcome dimensions |
|---|---|---|---|
| Public tech entrepreneur | Company ownership, board, cash vs equity, employees, product reliability, markets, media | Allocate resources, respond to launch failure, negotiate financing, decide which commitment to keep | Liquidity, simulated net worth, control, operations, trust |
| President / political office | Institutions, legislature, budgets, security constraints, advisers, citizens, cabinet, diplomacy | Negotiate policy, fund competing priorities, respond to a public emergency, manage cabinet trust | Approval, service delivery, fiscal stability, institutional trust, coalition strength |
| Media figure / celebrity | Audience, sponsors, staff, contracts, reputation, time/privacy | Respond to controversy, renegotiate a deal, protect work-life boundaries | Influence, earnings, audience trust, personal sustainability |

Named public-figure scenarios must be built from reliable, dated public information, and fictional *private* details or misconduct must not be presented as facts. Public net-worth figures are estimates and not spendable cash. Use clear **"hypothetical role simulation — not affiliated with or endorsed by"** labeling. For political roles, use credible policy constraints rather than assuming omnipotence.

## 6. Deterministic, low-cost engine recommendation (NOT YET APPROVED)

To avoid exponential hand-written branches, design a **state-driven event graph** rather than one giant story tree. Use a small rule-based simulation core with JSON event packs, decision conditions, state changes, consequence timers and NPC/stakeholder memories. A deterministic seed makes a run reproducible for debugging and fair comparison. Use LLMs, if at all, for editorial drafting or dialogue variation subject to review—not for authoritative state transitions or invented facts.

Persist (a) snapshot/source versions, (b) player state, (c) active commitments and delayed events, (d) timeline of choices and effects, and (e) engine/content version. Support save/resume without a large social-world backend; choose storage architecture during feasibility review.

## 7. Prototype and acceptance gates (proposed)

Prototype **one** tightly authored, reality-grounded role scenario first; do not build dozens of public-figure profiles before the mechanics prove fun. Suggested scope: 8–12 meaningful decisions across a 12-week hypothetical period, 2–3 distinct event arcs, and visible delayed consequences. These counts are **proposals**, not founder-approved limits.

Before coding, require a one-page scenario map showing: baseline source(s), distinct role constraints, state variables, event graph, example of an immediate branch, at least one delayed cross-domain cascade, alternate endings and playable recap.

A prototype is acceptable only if:

- Two players choosing different early decisions encounter **materially different subsequent circumstances**, not merely rearranged questions or differently worded feedback.
- A later event refers correctly to **the player's earlier action or omission**.
- All effects obey state/resource/institutional constraints; paper wealth isn't treated as bank cash.
- Important setbacks are understandable and not forced to guarantee failure; several coherent strategies remain viable.
- Players can identify why their simulated ending differed from the starting position.
- Replay changes the causal experience without fabricating facts about the actual public figure.
- Guest-first mobile web performance and sharing are retained; sign-up is not mandatory to try a run.

## 8. Sequencing and open decisions

**Current engineering gate is unchanged:** finish the Supabase TEST integration, privacy and secure account rollout. **Do not alter PR #2 or start coding this simulator now.** Keep Quick Challenge and Create Your Own Wahala separately planned; they are distinct from this engine. Prototype this feature on its own later branch/PR.

The founder has **not yet finalized**:
- First playable assumed role or named person; use of actual names vs clearly fictional analogues in beta.
- Duration/time compression and how much is simulated between player decisions.
- How much is public baseline data versus authored counterfactual fiction; sourcing/update cadence.
- Depth/visual presentation, budget, storage, monetization, moderation and exact end-card format.

**Decision rule:** no implementation authorization until a founder-approved scenario map and first-run design exist. The specification records the intended **causal structure**, not a settled content script.
