# WahalaVerse — Product Feature Register

**Captured:** 2026-10-28  
**Purpose:** Keep agreed product ideas distinct from the ongoing Supabase TEST integration work.  
**Status:** Product requirements recorded; this document does **not** authorize implementation, migration, deployment, or scope expansion of PR #2.

## 1. Confirmed feature: Assume Their Life (working title)

### Concept and player promise
A **time-boxed, reality-grounded, hypothetical role-assumption simulation** within WahalaVerse. The player assumes the *starting position* of a recognizable public figure—such as Elon Musk—or a high-stakes position such as president, then makes consequential decisions across a defined period. Unlike an open-ended life sim that starts a character with nothing, the player starts with the assumed figure's **reported wealth, holdings, influence, obligations, institutional constraints, and public situation at a specified snapshot date**, where reliable information is available. Starting public net worth is an estimate, not a precise bank balance.

Player-facing hook: **“You inherited their position. Can you keep it?”** This is an illustrative copy direction, not a settled brand slogan.

### Confirmed gameplay characteristics
- **Real-world starting baseline:** Publicly verifiable, dated figures, background, role-specific constraints and relevant context. Display data sources and timestamp, and distinguish estimates from established facts.
- **Player-controlled alternate history:** Once the player starts, every event and outcome is a **fictional simulation**, *not* a claim or forecast about what the real person would do. Avoid implying participation or endorsement by the public figure.
- **Finite, variable horizon:** Examples discussed include 12 days, 12 weeks, 2–3 months, 4–6 months and one year. Duration varies by role/scenario; **12 decisions over 12 weeks** is a useful example, **not** a universally approved format.
- **Difficult, pragmatic choices:** Scenarios must be plausible, interconnected and genuinely challenging. Decisions have delayed effects, opportunity costs and trade-offs, not guaranteed success and not arbitrary comedic punishments.
- **Not finance-only:** Business strategy, markets, government, politics, public confidence, employees, friends/family where appropriate, media, reputation, personal decisions and crises can all matter. Different roles require different outcomes and stakes.
- **End-of-run reckoning:** Compare the player's simulated ending position with the verified starting snapshot: net worth or public resources where relevant, influence, public trust, business health, approval, leadership, relationships, and a clear explanation of the decisions that caused the changes. Role-relevant measures take priority over one universal score.
- **Shareable results:** A concise, compelling outcome suitable for WhatsApp/social sharing should be explored as part of WahalaVerse's viral distribution strategy.

### Example scenarios (illustrative, not approved content)
**Assume Elon Musk:** Begin from a dated, sourced estimate of public equity/wealth and responsibilities; decide how to respond to operational, market, regulatory or reputational scenarios. Track *simulated* asset values, liquidity, influence, reputation and company performance. Net worth changes must account for market movement, ownership, debts and liquidity—not treat every spending decision as an equal subtraction from net worth.

**Assume the President:** Begin with credible public constraints and a real historical snapshot, not a private individual's literal wealth. Face governance, public policy, political coalitions, fiscal pressure, crises and trade-offs. Track simulated approval, government performance, stability, trust and legacy, not simply private net worth.

**Media/celebrity role:** Reputation, audience, influence, income, partnerships, personal boundaries and controversies, using public verified baselines and fictional scenario consequences.

### Open design decisions — do not silently finalize
- Which real-world profiles/roles ship first; whether profiles portray named public figures or use clearly labelled fictional analogues.
- Scenario length, number and frequency of rounds, and whether players choose a duration or each role has a fixed one.
- How dynamic baseline updates and source verification work (publication date, FX conversions, asset fluctuations, uncertainty ranges).
- The precise simulation engine and balance model, ability to save and resume, scorecard, moderation and legal review for use of public figures.
- How to test playability and plausibility with Nigerian youths before costly production development.

### Explicit boundary
This **is not** the four-round existing **Survive Naija** game, the generic “start from zero and build a career” life simulation, the separate **Three Years / AYÉ** work, or merely a “President for a Day” question quiz. It is a bounded role-assumption challenge grounded in a real starting snapshot, with simulated consequential outcomes.

## 2. Confirmed feature: Create Your Own Wahala (Custom Challenges)

The current **Quick Challenge / Predict My Wahala** uses predefined questions. Add a separate **Custom Challenge** creation mode where users write their *own* questions, define answer choices, select their intended correct/personal answers, and share with friends to compare performance. The game must remain playable from a shared link without compulsory signup. Creator safety, content limits, abuse reporting, existing-link compatibility, and secure storage are required. **A technical design exists; implementation is still pending.**

**Do not replace** the quick, template-based option; maintain both.

## 3. Other previously discussed experience

**Today's Wahala / The Hot Seat**: recurring, relatable dilemmas and social voting/share loops. Concept discussed, **not committed for the next engineering phase**. Live community voting/percentages will require actual stored aggregate responses, not fabricated numbers.

## 4. Development sequence / scope protection

**Current development priority:** finish Milestone 2 integration preparation, dedicated Supabase TEST environment, two-user RLS and actual auth/export/delete verification, privacy and launch safeguards. PR #2 remains governed by its existing approval gates. **Do not implement new gameplay on that branch.**

**Product backlog after backend gates:**
1. Design and implement **Create Your Own Wahala**, preserving Quick Challenge and testing the viral share loop.
2. Prototype **Assume Their Life** with one or two carefully selected role scenarios and a bounded duration, using real, dated baseline information and clearly hypothetical outcomes. Validate decisions and result cards before adding dozens of profiles.
3. Evaluate **Today's Wahala** and larger simulator extensions from actual usage evidence.

**Operating rule:** Record features now; do not interrupt active security work; start each new product feature on its own branch/PR after the current milestone's gates clear, with acceptance criteria and tests.

## 5. Implementation guardrails

- Phone-first web experience; low operating cost, short sessions, fast sharing and repeatability.
- No mandatory signup to try the first experience.
- Distinguish sourced real baseline facts from fictional gameplay and simulated predictions.
- Avoid unsupported statements, impersonation, implied endorsement or fabricated allegations about real people.
- Preserve historical baselines so saved runs remain explainable when public figures' circumstances change.
- Never call a speculative outcome an actual future prediction.
- No production changes or public data collection authorized by this feature register.

**Source of product direction:** This WahalaVerse chat, including the founder's clarification on October 28, 2026. Any elaboration marked illustrative or open is an implementation recommendation, **not** a retroactively claimed agreement.
