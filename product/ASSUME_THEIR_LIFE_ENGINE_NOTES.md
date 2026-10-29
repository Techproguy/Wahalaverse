# Assume Their Life — Engine Notes (spike)

**Status:** thin **playable engine spike** (first role pack). Not merged, not deployed.
**Files:** `atl-engine.js` (role-agnostic engine), `atl-pack-afrobeats.js` (first role
pack), `tests/atl-engine.test.js` (deterministic), `tests/e2e/assume-their-life.spec.js`
(plays a full run in the browser). Wired into `app.js` / `index.html` / `styles.css` as
the `?page=atl` experience.

## What the spike demonstrates (Track A acceptance checklist)

| Requirement | Where |
|---|---|
| Fictional rising Afrobeats artist, believable start | `atl-pack-afrobeats.js` → `briefing`, `E1` |
| Time progression + one complete short arc | weeks 1 → 52 across `E1…E5` |
| Meaningful actions incl. **delay / decline** | e.g. `E1.C` (sign nothing), `E2C.C3` (decline both), `E5.G4` (step back) |
| Six interacting variables | `vars`: cash, buzz, fans, cred, energy, control |
| Stakeholder relationships + memory | `run.memory{producer,manager,oldSquad,label,promoter}` |
| ≥2 delayed consequences that trace back | `S_sellout`, `S_beefescalates`, `S_albumdispute`, … each carries a `cause`/`note` |
| ≥2 divergent outcomes | "chase the bag" → **Cancelled**; "build it right" → **Global Breakout** |
| Reckoning: what / why / which decisions mattered | `reckoning()` → before→after deltas, fired-consequence trace, 3–5 pivotal decisions |
| Not a quiz | choices are *actions* with trade-offs; the next event is selected by state + history, never a fixed question order |

Run it: `npm run test:unit` (41 incl. 13 engine) and `npm run test:e2e` (26 incl. a full
browser run to the Reckoning). Or serve the site and open **Explore → Assume Their Life**.

## The engine is role-agnostic by design (so the core role experiences fit without a rewrite)

> **Scope note (2026-10-29):** Afrobeats is **one additional role and a reusable technical
> experiment** — not the flagship and not a gate. The **active core role experiences** are
> **Billionaire, CEO, Founder and Political Leadership** (distinct lives: a CEO is not
> necessarily the founder; a billionaire is not necessarily the CEO). They are active scope,
> not contingent on Afrobeats acceptance. Full breakdown + engine reuse-vs-expansion
> analysis is in `WahalaVerse-Assume-Their-Life-Vertical-Slice-Design-v0.1.md` §10–§11.

`atl-engine.js` knows nothing about Afrobeats. All role-specific reality lives in a **role
pack**. The pack contract is the extensibility seam for the core role experiences
(Billionaire, CEO, Founder, Political — plus the Afrobeats experiment):

- **`pack.vars`** — each role declares its **own** meters, ranges and formatting. A CEO
  pack can declare `runway`, `valuation`, `boardConfidence`, `marketShare`; a billionaire
  pack `liquidCash`, `paperNetWorth`, `influence`, `legalExposure`. The engine clamps and
  tracks whatever is declared — it is not limited to the six Afrobeats meters.
- **`choice.effects` / `memory` / `sets` / `commit` / `seeds`** — generic immediate +
  delayed consequence primitives already used by the Afrobeats pack.
- **`choice.ops(run)`** — an **escape hatch** for arbitrary role-specific systems. This is
  the key to "do not reduce billionaire/CEO to money/reputation meters": ownership
  structures, **cap tables**, equity dilution, acquisitions, asset portfolios and debt
  covenants are modelled as custom logic over `run.custom` inside `ops`, with no engine
  change. (A billionaire may not be a CEO and a CEO may not be a billionaire — each pack
  models its own ownership/control reality.)
- **`pack.derive(run)`** — recompute derived state after every step (e.g.
  `paperNetWorth = liquidCash + Σ holdings`), so composite measures stay correct.
- **`pack.events` / `endings`** — role-specific event graph and explainable endings;
  `next` may be a function of `run` for state-driven branching.

Determinism is a hard invariant: no `Math.random`, no `Date`. A run is fully reproducible
from its choice sequence (see the determinism test), which keeps outcomes debuggable and
fair, and makes "same run" shareable later.

See `WahalaVerse-Assume-Their-Life-Vertical-Slice-Design-v0.1.md` §10–§11 for the active
**core role scope**, the per-role implementation breakdown, and the engine reuse-vs-expansion
analysis (shared `capTable` / `portfolio` / `budget` / `voteCount` helpers via
`choice.ops` + `derive`).
