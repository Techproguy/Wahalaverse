/* WahalaVerse — "Assume Their Life" ROLE PACK: Political Leadership.
   A fictional newly elected state governor. ILLUSTRATIVE FICTION — ROLE-BASED, no real
   person (politics is sensitive; named figures would need Spec §4–§5 sourcing). DISTINCT
   from the business roles: you command institutions and a public budget, not a company.

   Distinctive mechanics:
     • A fixed public BUDGET (treasury) — a POPULAR choice is not automatically AFFORDABLE.
     • LEGISLATURE (atl-systems.legislativeVote): bold reforms need coalition votes to pass.
     • Implementation ≠ approval: a passed law only delivers in proportion to state CAPACITY;
       weak capacity means an approved reform fails to reach citizens.
     • Crises, accountability, coalition management, public welfare and long-run consequences.

   Exposes window.WAHALA_ATL_POLITICAL (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const S = (typeof module === 'object' && module.exports) ? require('./atl-systems.js') : root.WAHALA_ATL_SYSTEMS;
  const pack = factory(S);
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_ATL_POLITICAL = pack;
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';
  const B = 1000000000;
  const clamp = (v) => Math.max(0, Math.min(100, v));

  return {
    id: 'political-life',
    role: 'A newly elected state governor',
    title: 'The Mandate',
    horizonWeeks: 52,
    startEvent: 'E1',

    vars: {
      approval:         { label: 'Approval',        emoji: '🗳️', start: 55, min: 0, max: 100, fmt: 'pct' },
      treasury:         { label: 'Treasury',        emoji: '🏛️', start: 500000000000, min: 0, max: 999999999999, fmt: 'naira' },
      coalition:        { label: 'Coalition',       emoji: '🤝', start: 50, min: 0, max: 100, fmt: 'pct' },
      serviceDelivery:  { label: 'Service delivery',emoji: '🚰', start: 40, min: 0, max: 100, fmt: 'pct' },
      institutionsTrust:{ label: 'Institutions',    emoji: '⚖️', start: 55, min: 0, max: 100, fmt: 'pct' },
      unrest:           { label: 'Unrest',          emoji: '🔥', start: 25, min: 0, max: 100, fmt: 'pct' },
    },
    stakeholders: ['cabinet', 'legislature', 'citizens', 'press', 'federal'],

    derive(run) {
      if (!run.custom.leg) run.custom.leg = { gov: 40, opp: 35, ind: 25 }; // 100 seats, majority 51
      if (run.custom.capacity == null) run.custom.capacity = 45;            // weak state capacity to start
    },

    briefing: {
      hook: 'You won the election on big promises. Now you inherit an empty-ish treasury, a legislature you don’t fully control, and citizens who want results yesterday.',
      control: 'You set the budget, which bills to push, how to handle crises, and whether to govern through institutions or around them.',
      cannot: 'You can’t spend money you don’t have, can’t pass a bill without the votes, and can’t make a weak civil service deliver just because you signed a law.',
      tension: 'Every popular promise has a price the budget may not cover, and every reform must survive both the legislature AND the machinery that implements it.',
      goal: 'No single “win”: deliver for citizens, build institutions, or chase popularity — but budgets, votes and capacity all push back.',
    },

    events: {
      E1: {
        week: 1, arc: 'The Budget',
        title: 'Your first budget — a fixed pot, infinite demands',
        body: 'The treasury is what it is. Welfare, infrastructure, security and debt service all want a share, and you can’t fund everything.',
        choices: [
          { id: 'A', label: 'Big popular spending — welfare + visible projects',
            reaction: 'The crowds cheer. The accountants wince.',
            effects: { treasury: -300000000000, approval: 15, serviceDelivery: 8 },
            seeds: [{ id: 'S_deficit', fireWeek: 34, cond: (r) => r.vars.treasury < 100000000000,
              effects: { approval: -10, unrest: 10, institutionsTrust: -6 },
              cause: 'the unfunded spending spree', note: 'The budget hole from Day 1 came due — salaries and projects stalled, and the streets noticed.' }],
            next: 'E2' },
          { id: 'B', label: 'Fiscal discipline — balance the books, service debt',
            reaction: 'Responsible and deeply unglamorous.',
            effects: { treasury: -80000000000, approval: -8, institutionsTrust: 10, coalition: 2 }, next: 'E2' },
          { id: 'C', label: 'Invest in capacity and infrastructure',
            reaction: 'You spend on the machinery that actually delivers — results come later.',
            ops(r){ r.custom.capacity = clamp(r.custom.capacity + 25); },
            effects: { treasury: -150000000000, serviceDelivery: 4 },
            seeds: [{ id: 'S_capacitypays', fireWeek: 40,
              effects: { serviceDelivery: 12, approval: 6 },
              cause: 'investing in state capacity early', note: 'The capacity you built paid off — programmes finally reached people at scale.' }],
            next: 'E2' },
        ],
      },

      E2: {
        week: 9, arc: 'The Legislature',
        title: 'Your flagship reform needs the house',
        body: 'The reform you campaigned on is drafted. Now it has to survive the chamber — and the system that would implement it.',
        choices: [
          { id: 'D', label: 'Push the bold reform (spend political capital)',
            reaction: 'You whip the votes and dare the house to say no.',
            ops(r){
              const v = S.legislativeVote(r.custom.leg, r.vars.coalition);
              r.flags.reformPassed = v.passed; r.custom.lastVote = v;
              if (v.passed) { r.vars.serviceDelivery = clamp(r.vars.serviceDelivery + Math.round(12 * r.custom.capacity / 100)); r.vars.approval = clamp(r.vars.approval + 6); }
              else { r.vars.approval = clamp(r.vars.approval - 6); r.vars.institutionsTrust = clamp(r.vars.institutionsTrust + 2); }
            },
            effects: { coalition: -8 },
            seeds: [{ id: 'S_implementfail', fireWeek: 30, cond: (r) => r.flags.reformPassed && r.custom.capacity < 55,
              effects: { serviceDelivery: -8, approval: -8 },
              cause: 'passing a reform your institutions could not implement', note: 'The flagship law passed but barely reached citizens — weak state capacity hollowed it out (approving ≠ implementing).' }],
            next: 'E3' },
          { id: 'E', label: 'Water it down for cross-party consensus',
            reaction: 'Everyone can live with it; nobody is thrilled.',
            ops(r){ r.flags.reformPassed = true; },
            effects: { serviceDelivery: 4, coalition: 4, approval: 2 }, next: 'E3' },
          { id: 'F', label: 'Bypass the house — rule by executive order',
            reaction: 'Fast and decisive — and a shot at the institutions.',
            effects: { serviceDelivery: 6, institutionsTrust: -12, unrest: 8 },
            seeds: [{ id: 'S_overreach', fireWeek: 38,
              effects: { unrest: 10, approval: -8, institutionsTrust: -6 },
              cause: 'ruling by decree', note: 'Courts and civil society pushed back on the executive overreach — a legitimacy crisis built.' }],
            next: 'E3' },
        ],
      },

      E3: {
        week: 18, arc: 'Allocation',
        title: 'An emergency you didn’t budget for',
        body: 'Floods hit three districts. People need relief now — and there’s no line item for it.',
        choices: [
          { id: 'G', label: 'Divert the capital budget to relief (popular now)',
            reaction: 'Help arrives fast; next year’s roads and clinics quietly lose their funding.',
            ops(r){ r.custom.capacity = clamp(r.custom.capacity - 10); },
            effects: { approval: 10 },
            seeds: [{ id: 'S_infradecay', fireWeek: 42,
              effects: { serviceDelivery: -10, unrest: 6 },
              cause: 'raiding the capital budget for relief', note: 'Infrastructure you defunded started failing — outages and bad roads fed public anger.' }],
            next: 'E4' },
          { id: 'H', label: 'Borrow for emergency relief',
            reaction: 'You meet the moment on the state’s credit card.',
            effects: { treasury: 100000000000, approval: 8 },
            seeds: [{ id: 'S_debtservice', fireWeek: 44, cond: (r) => r.vars.treasury < 120000000000,
              effects: { approval: -8, serviceDelivery: -6 },
              cause: 'the emergency borrowing', note: 'Debt service crowded out everything else when revenues disappointed.' }],
            next: 'E4' },
          { id: 'I', label: 'Appeal for federal + donor assistance (slower)',
            reaction: 'Less control, slower — but it doesn’t wreck the books.',
            effects: { treasury: 40000000000, institutionsTrust: 4, approval: 2 }, memory: { federal: 1 }, next: 'E4' },
        ],
      },

      E4: {
        week: 28, arc: 'The Crisis',
        title: 'Unrest flares',
        body: 'A strike spirals into protests. How you respond will echo for months.',
        choices: [
          { id: 'J', label: 'Heavy-handed crackdown',
            reaction: 'The streets clear tonight. The grievance doesn’t.',
            effects: { unrest: -10, institutionsTrust: -10, approval: 4 },
            seeds: [{ id: 'S_backlash', fireWeek: 46,
              effects: { unrest: 15, approval: -10, institutionsTrust: -6 },
              cause: 'the crackdown', note: 'The heavy-handed response radicalised the protest — it came back bigger and angrier.' }],
            next: 'E5' },
          { id: 'K', label: 'Dialogue and concessions',
            reaction: 'Slower, costlier — and it actually settles things.',
            effects: { coalition: 6, treasury: -50000000000, unrest: -12, approval: 4 }, next: 'E5' },
          { id: 'L', label: 'Downplay it and wait',
            reaction: 'You hope it burns out. Hope is not a strategy.',
            effects: { approval: 2 },
            seeds: [{ id: 'S_crisisgrows', fireWeek: 40,
              effects: { unrest: 12, approval: -8 },
              cause: 'ignoring the early unrest', note: 'The problem you waited out metastasised into a full-blown crisis.' }],
            next: 'E5' },
        ],
      },

      E5: {
        week: 36, arc: 'Accountability',
        title: 'A corruption scandal inside your government',
        body: 'A commissioner is caught with his hand in the till. The press has the documents.',
        choices: [
          { id: 'M', label: 'Transparent probe — sack and prosecute',
            reaction: 'You take the hit now and keep your integrity.',
            effects: { approval: 8, institutionsTrust: 12, coalition: -10 }, next: 'E6' },
          { id: 'N', label: 'Cover it up',
            reaction: 'Quiet for now. These things rarely stay buried.',
            effects: { institutionsTrust: -10 },
            seeds: [{ id: 'S_scandal', fireWeek: 48,
              effects: { approval: -15, unrest: 10, institutionsTrust: -10 },
              cause: 'the cover-up', note: 'The cover-up unravelled in public — the scandal became about you, not the commissioner.' }],
            next: 'E6' },
          { id: 'O', label: 'Blame the opposition and move on',
            reaction: 'Your base nods; everyone else rolls their eyes.',
            effects: { coalition: -6, unrest: 6, approval: 2 }, next: 'E6' },
        ],
      },

      E6: {
        week: 44, arc: 'Consequences',
        title: 'Mid-term reckoning',
        body: 'The year’s choices are landing. With elections on the horizon, you pick your closing posture.',
        choices: [
          { id: 'P', label: 'Painful course-correction and reforms',
            reaction: 'You spend popularity to fix the fundamentals.',
            effects: { approval: -6, institutionsTrust: 8, serviceDelivery: 6 }, next: 'E7' },
          { id: 'Q', label: 'A big year-end giveaway',
            reaction: 'Crowd-pleasing — if the treasury can actually fund it.',
            ops(r){ if (r.vars.treasury >= 120000000000) { r.vars.treasury -= 120000000000; r.vars.approval = clamp(r.vars.approval + 12); } else { r.vars.approval = clamp(r.vars.approval + 4); r.vars.institutionsTrust = clamp(r.vars.institutionsTrust - 4); r.flags.unfundedPromise = true; } },
            next: 'E7' },
          { id: 'R', label: 'Rally the coalition and shore up governance',
            reaction: 'You trade favours and rebuild your majority.',
            effects: { coalition: 12, approval: 2 }, next: 'E7' },
        ],
      },

      E7: {
        week: 50, arc: 'The Finale',
        title: 'Year one, judged',
        body: 'The record is what it is. How do you close the year?',
        choices: [
          { id: 'S', label: 'Run on your record',
            reaction: 'You let the results — good or bad — speak.',
            sets: { ranOnRecord: true }, next: 'END' },
          { id: 'T', label: 'Go full populist for re-election',
            reaction: 'Promises now, bills later.',
            ops(r){ if (r.vars.treasury >= 80000000000) r.vars.treasury -= 80000000000; else r.flags.unfundedPromise = true; },
            effects: { approval: 8, institutionsTrust: -4 }, sets: { populist: true }, next: 'END' },
          { id: 'U', label: 'Govern as a statesman — invest in institutions',
            reaction: 'You choose the long game over the next poll.',
            effects: { institutionsTrust: 8, approval: -2 }, sets: { statesman: true }, next: 'END' },
        ],
      },
    },

    endings: [
      { id: 'fiscal_ruin', title: 'Fiscal Ruin', emoji: '💸',
        test: (c) => c.vars.treasury <= 0 || (c.fired.includes('S_deficit') && c.vars.treasury < 60000000000 && c.vars.serviceDelivery < 45),
        blurb: 'You promised more than the treasury could pay. The money ran out and the promises collapsed with it.',
        share: 'I bankrupted the state 💸 — think you’d balance it? WahalaVerse: Assume Their Life' },
      { id: 'unrest_spiral', title: 'Unrest & Instability', emoji: '🔥',
        test: (c) => c.vars.unrest >= 65,
        blurb: 'Grievances you mishandled compounded into open instability. Governing became firefighting.',
        share: 'The state slid into unrest 🔥 — WahalaVerse: Assume Their Life' },
      { id: 'populist_flameout', title: 'Populist Flameout', emoji: '🎆',
        test: (c) => (c.flags.populist || c.flags.unfundedPromise) && c.vars.serviceDelivery < 45 && (c.vars.unrest >= 45 || c.vars.treasury < 80000000000),
        blurb: 'The applause was real and the delivery wasn’t. Popularity bought on credit didn’t survive contact with the bills.',
        share: 'All promises, no delivery 🎆 — WahalaVerse: Assume Their Life' },
      { id: 'institution_builder', title: 'Institution Builder', emoji: '🏛️',
        test: (c) => c.vars.institutionsTrust >= 70 && c.vars.serviceDelivery >= 55,
        blurb: 'You governed through the system and strengthened it. Less fanfare, but a state that actually works.',
        share: 'I built institutions that last 🏛️ — WahalaVerse: Assume Their Life' },
      { id: 'reformer', title: 'The Reformer', emoji: '🚀',
        test: (c) => c.vars.serviceDelivery >= 58 && c.vars.approval >= 55 && c.vars.unrest < 45,
        blurb: 'You delivered for citizens AND kept them with you — reform that passed, implemented, and held.',
        share: 'I actually delivered as governor 🚀 — beat my run on WahalaVerse: Assume Their Life' },
      { id: 'strongman', title: 'Strongman', emoji: '🪖',
        test: (c) => c.vars.institutionsTrust < 35 && c.vars.unrest < 50,
        blurb: 'You kept order by bending the institutions to your will. Stable, for now — and fragile underneath.',
        share: 'I ruled with an iron hand 🪖 — WahalaVerse: Assume Their Life' },
      { id: 'caretaker', title: 'Caretaker', emoji: '📋',
        test: () => true,
        blurb: 'No transformation, no collapse — a year of keeping the lights on. The real tests are still ahead.',
        share: 'A quiet year in office 📋 — WahalaVerse: Assume Their Life' },
    ],
  };
});
