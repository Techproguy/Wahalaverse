/* WahalaVerse — "Assume Their Life" ROLE PACK: CEO Life.
   A fictional HIRED chief executive of an already-operating company. ILLUSTRATIVE
   FICTION — no real person. Deliberately DISTINCT from Founder Life: you did not
   start this company and you own very little of it; a BOARD can remove you, activist
   shareholders can seize seats, and you answer for operating performance you inherited.

   Distinctive mechanics:
     • Board composition + voting + REMOVAL (custom.board seats; majority can oust you).
     • Operating performance: revenue, market share, cash flow.
     • Executive team / employees + shareholders (cap table; your stake is small).
     • Acquisitions, buybacks, fundraising — strategic swings with delayed fallout.

   Exposes window.WAHALA_ATL_CEO (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const S = (typeof module === 'object' && module.exports) ? require('./atl-systems.js') : root.WAHALA_ATL_SYSTEMS;
  const pack = factory(S);
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_ATL_CEO = pack;
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';

  // Removal follows an explicit board VOTE (atl-systems.boardRemovalVote): each director
  // votes to remove when confidence is below their tolerance, and a seat majority ousts the
  // CEO. Activists are quickest to vote you out, so an activist-heavy board ousts at higher
  // confidence than an allied one — a valid, legible governance rule rather than a heuristic.
  const isRemoved = (c) => !c.flags.sold && !c.flags.resigned &&
    S.boardRemovalVote(c.run.custom.board, c.vars.boardConfidence).removed;

  return {
    id: 'ceo-life',
    role: 'A hired CEO of a public company',
    title: 'Corner Office',
    horizonWeeks: 52,
    startEvent: 'E1',

    vars: {
      cash:            { label: 'Company cash', emoji: '🏦', start: 2000000000, min: 0, max: 99999999999, fmt: 'naira' },
      revenue:         { label: 'Revenue',      emoji: '📈', start: 58, min: 0, max: 100, fmt: 'pct' },
      marketShare:     { label: 'Market share', emoji: '🥇', start: 42, min: 0, max: 100, fmt: 'pct' },
      morale:          { label: 'Org morale',   emoji: '👥', start: 60, min: 0, max: 100, fmt: 'pct' },
      reputation:      { label: 'Reputation',   emoji: '📰', start: 60, min: 0, max: 100, fmt: 'pct' },
      boardConfidence: { label: 'Board confidence', emoji: '⚖️', start: 55, min: 0, max: 100, fmt: 'pct' },
    },
    stakeholders: ['chair', 'cfo', 'activist', 'keyCustomer', 'staff'],

    // Initialise the board and (small) CEO cap-table stake once.
    derive(run) {
      if (!run.custom.board) run.custom.board = { friendly: 3, independent: 2, activist: 0 };
      if (!run.custom.cap) run.custom.cap = S.capFound([
        { id: 'ceo', shares: 50000 }, { id: 'founders', shares: 500000 }, { id: 'public', shares: 450000 },
      ]);
    },

    briefing: {
      hook: 'The board just handed you the keys to a company you didn’t build. Shareholders expect numbers, the press expects a story, and the directors who hired you can fire you.',
      control: 'You set strategy, the budget, who sits on the executive team, and how you handle the board and the market.',
      cannot: 'You don’t own the company (your stake is tiny), you can’t ignore the board, and shareholders and activists act on their own interests.',
      tension: 'Growth is slowing, an activist is circling, and every quarter is a referendum on whether you keep the job.',
      goal: 'No single “win”: turn the business around, build an empire, or at least survive the board — each path trades something (and the board is always counting votes).',
    },

    events: {
      E1: {
        week: 1, arc: 'The Mandate',
        title: 'The board wants your plan for the year',
        body: 'Your first board meeting. They inherited a slowing business and they want to know your play. Growth, discipline, or steady hands?',
        choices: [
          { id: 'A', label: 'Bet big on growth — invest to take share',
            reaction: 'A bold vision. The directors lean in; the treasury takes the hit.',
            effects: { cash: -400000000, marketShare: 8, revenue: 5, morale: 5, reputation: 3, boardConfidence: 5 }, next: 'E2' },
          { id: 'B', label: 'Impose margin discipline — restructure and cut',
            reaction: 'Shareholders love the numbers. The building goes quiet and cold.',
            effects: { cash: 300000000, morale: -18, reputation: -8, boardConfidence: 8 },
            seeds: [{ id: 'S_moralecrash', fireWeek: 30, cond: (r) => r.vars.morale < 40,
              effects: { revenue: -8, reputation: -6 },
              cause: 'the deep layoffs you ordered', note: 'Talent fled and execution slipped — the Q1 cuts hollowed the org out.' }],
            next: 'E2' },
          { id: 'C', label: 'A balanced plan — steady improvement',
            reaction: 'No fireworks. The board nods, unconvinced either way.',
            effects: { revenue: 3, marketShare: 2, morale: 2 }, next: 'E2' },
        ],
      },

      E2: {
        week: 10, arc: 'The Team',
        title: 'A rival is poaching your star CFO',
        body: 'The CFO the market trusts has an offer. Lose them now and confidence wobbles.',
        choices: [
          { id: 'D', label: 'Retain with a big equity grant (expand the option pool)',
            reaction: 'They stay, energised — everyone’s shares get a touch diluted.',
            ops(r){ S.capPool(r.custom.cap, { pct: 0.03 }); },
            effects: { morale: 10, boardConfidence: 4 }, memory: { cfo: 2 }, next: 'E3' },
          { id: 'E', label: 'Let them walk, promote from within',
            reaction: 'A loyal internal steps up — unproven to the market.',
            effects: { morale: -5, reputation: -4 }, memory: { cfo: -1 },
            seeds: [{ id: 'S_execgap', fireWeek: 26, cond: (r) => r.vars.morale < 45,
              effects: { revenue: -6, boardConfidence: -6 },
              cause: 'losing your CFO without a strong bench', note: 'The finance gap showed up in a messy quarter — the market noticed.' }],
            next: 'E3' },
          { id: 'F', label: 'Match the cash offer (no dilution)',
            reaction: 'Expensive, but the table stays clean.',
            effects: { cash: -200000000, morale: 6 }, memory: { cfo: 1 }, next: 'E3' },
        ],
      },

      E3: {
        week: 20, arc: 'Operations',
        title: 'Growth is stalling — the quarter looks soft',
        body: 'Analysts are sharpening pencils. You can fix the engine, force the number, or ride it out.',
        choices: [
          { id: 'G', label: 'Invest in the core product and R&D',
            reaction: 'Slower now, but you’re building something that lasts.',
            effects: { cash: -300000000, morale: 4 },
            seeds: [{ id: 'S_productpays', fireWeek: 40,
              effects: { revenue: 12, marketShare: 6, reputation: 5 },
              cause: 'the R&D investment you protected', note: 'The product bets paid off — a strong release lifted revenue and share.' }],
            next: 'E4' },
          { id: 'H', label: 'Push the sales machine — pull revenue forward',
            reaction: 'You hit the number. Some of it was borrowed from next year.',
            effects: { revenue: 10, reputation: -5 },
            seeds: [{ id: 'S_channelstuff', fireWeek: 38,
              effects: { revenue: -12, reputation: -8 },
              cause: 'pulling revenue forward to hit a quarter', note: 'The pulled-forward sales reversed — a nasty miss and a credibility hit.' }],
            next: 'E4' },
          { id: 'I', label: 'Hold and optimise what works',
            reaction: 'Unspectacular, defensible.',
            effects: { revenue: 3, cash: 50000000 }, next: 'E4' },
        ],
      },

      E4: {
        week: 28, arc: 'The Activist',
        title: 'An activist investor builds a stake',
        body: 'A famous activist fund discloses a position and a public letter: board seats, a buyback, and “urgency.”',
        choices: [
          { id: 'J', label: 'Appease them — announce a huge buyback',
            reaction: 'The stock pops; the treasury drains; they take a seat anyway.',
            ops(r){ r.custom.board.activist += 1; r.custom.board.independent -= 1; },
            effects: { cash: -600000000, reputation: 3, boardConfidence: -5 }, memory: { activist: -1 }, next: 'E5' },
          { id: 'K', label: 'Fight them in a public proxy battle',
            reaction: 'A bruising, public war. Win or lose, you’re bloodied.',
            ops(r){ r.custom.board.activist += 2; r.custom.board.independent -= 2; },
            effects: { reputation: -8, boardConfidence: -10, morale: -5 }, memory: { activist: -2 }, next: 'E5' },
          { id: 'L', label: 'Negotiate — one seat and governance tweaks',
            reaction: 'A measured settlement. One new voice at the table.',
            ops(r){ r.custom.board.activist += 1; r.custom.board.independent -= 1; },
            effects: { boardConfidence: 4, reputation: 2 }, memory: { activist: 1 }, next: 'E5' },
        ],
      },

      E5: {
        week: 36, arc: 'The Swing',
        title: 'A transformative acquisition is on the table',
        body: 'You can buy a fast-growing rival and remake the company — or play it safer.',
        choices: [
          { id: 'M', label: 'Make the acquisition (debt-funded)',
            reaction: 'Overnight you’re much bigger. Now you have to make it work.',
            ops(r){ r.custom.acquired = true; },
            effects: { cash: -800000000, marketShare: 15, revenue: 8, boardConfidence: 4 }, sets: { acquired: true },
            seeds: [{ id: 'S_integration', fireWeek: 46, cond: (r) => r.vars.morale < 50,
              effects: { marketShare: -10, revenue: -8, cash: -200000000, reputation: -6 },
              cause: 'acquiring while morale was low', note: 'The integration failed — culture clash and attrition erased the deal’s gains.' }],
            next: 'E6' },
          { id: 'N', label: 'Raise equity to fund organic growth',
            reaction: 'A clean balance sheet and room to run — new shares issued.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'public', amount: 500000000, preMoney: 4500000000, prefMult: 0 }); },
            effects: { cash: 500000000, marketShare: 5 }, next: 'E6' },
          { id: 'O', label: 'Return cash to shareholders, stay the course',
            reaction: 'Disciplined and popular with owners — rivals keep moving.',
            effects: { reputation: 4, boardConfidence: 4, marketShare: -3 }, next: 'E6' },
        ],
      },

      E6: {
        week: 44, arc: 'The Board Vote',
        title: 'The board takes your measure',
        body: 'The year’s decisions have landed. Before the final quarter, the directors meet to decide whether they still believe in you.',
        choices: [
          { id: 'P', label: 'Rally the board with a credible plan',
            reaction: 'You make the case on the numbers. It only works if the numbers are there.',
            ops(r){ if (r.vars.revenue >= 55 && r.vars.marketShare >= 45) r.vars.boardConfidence = Math.min(100, r.vars.boardConfidence + 15); else r.vars.boardConfidence = Math.max(0, r.vars.boardConfidence - 10); },
            next: 'E7' },
          { id: 'Q', label: 'Preempt with a shareholder-friendly special dividend',
            reaction: 'You buy some goodwill with the owners’ own money.',
            effects: { cash: -400000000, boardConfidence: 10, reputation: 3, morale: -4 }, next: 'E7' },
          { id: 'R', label: 'Concede — hand the activist a co-chair',
            reaction: 'Peace, at the price of your grip on the company.',
            ops(r){ r.custom.board.activist += 1; r.custom.board.independent -= 1; },
            effects: { boardConfidence: 8 }, sets: { conceded: true }, next: 'E7' },
        ],
      },

      E7: {
        week: 50, arc: 'The Finale',
        title: 'Year-end — the verdict',
        body: 'The results are in and the board has the votes it has. How does your year as CEO end?',
        choices: [
          { id: 'S', label: 'Deliver the results and stay the course',
            reaction: 'You stand on your record and keep leading — if they let you.',
            sets: { delivered: true }, next: 'END' },
          { id: 'T', label: 'Sell the company to a strategic buyer',
            reaction: 'You engineer an exit. As a hired CEO you own little — your payout is mostly your parachute.',
            ops(r){
              const deal = Math.round((r.vars.revenue * 0.5 + r.vars.marketShare * 0.5) / 100 * 8000000000);
              r.custom.dealValue = deal;
              r.custom.ceoProceeds = S.capExitProceeds(r.custom.cap, deal, 'ceo') + 200000000; // + golden parachute
              r.vars.cash += r.custom.ceoProceeds;
            },
            sets: { sold: true }, next: 'END' },
          { id: 'U', label: 'Resign on your own terms',
            reaction: 'Before they can push, you step down with your head up.',
            sets: { resigned: true }, next: 'END' },
        ],
      },
    },

    endings: [
      { id: 'ousted_by_board', title: 'Ousted by the Board', emoji: '🪑',
        test: (c) => isRemoved(c),
        blurb: 'The directors who hired you fired you. The votes were never really yours — and this year you lost them.',
        share: 'The board fired me 🪑 — could you survive the vote? WahalaVerse: Assume Their Life' },
      { id: 'sold_the_company', title: 'Sold the Company', emoji: '🤝',
        test: (c) => c.flags.sold,
        blurb: 'You handed the owners an exit. As the hired boss you owned little of it — the win was theirs more than yours.',
        share: 'I sold the company I ran 🤝 — WahalaVerse: Assume Their Life' },
      { id: 'empire_builder', title: 'Empire Builder', emoji: '🏛️',
        test: (c) => c.flags.acquired && c.vars.marketShare >= 60 && !isRemoved(c),
        blurb: 'You bought big and made it work. The company is far larger than the one you inherited.',
        share: 'I built an empire as CEO 🏛️ — WahalaVerse: Assume Their Life' },
      { id: 'turnaround_hero', title: 'Turnaround Hero', emoji: '🚀',
        test: (c) => c.vars.revenue >= 68 && c.vars.marketShare >= 52 && c.vars.boardConfidence >= 55 && !isRemoved(c),
        blurb: 'You took a slowing company and made it grow again — with the board firmly behind you.',
        share: 'I turned the company around 🚀 — beat my run on WahalaVerse: Assume Their Life' },
      { id: 'short_term_winner', title: 'Short-Term Winner, Long-Term Cost', emoji: '📺',
        test: (c) => (c.vars.reputation < 42 || c.vars.morale < 40) && (c.vars.revenue >= 58 || c.vars.marketShare >= 50) && !isRemoved(c),
        blurb: 'The numbers looked good on the call — but you spent the culture and the reputation to get them.',
        share: 'Great quarter, gutted company 📺 — WahalaVerse: Assume Their Life' },
      { id: 'resigned', title: 'Stepped Down on Your Terms', emoji: '🎓',
        test: (c) => c.flags.resigned,
        blurb: 'You read the room and left with your dignity — before the board could take the decision from you.',
        share: 'I stepped down on my terms 🎓 — WahalaVerse: Assume Their Life' },
      { id: 'value_destroyer', title: 'Value Destroyer', emoji: '📉',
        test: (c) => c.vars.revenue < 42 && c.vars.marketShare < 35,
        blurb: 'Revenue and share both went backwards. Whatever the plan was, it didn’t work.',
        share: 'I ran the company into the ground 📉 — think you’d do better? WahalaVerse: Assume Their Life' },
      { id: 'steady_steward', title: 'Steady Steward', emoji: '📊',
        test: () => true,
        blurb: 'No disaster, no transformation — you kept the ship steady and the board patient. For now.',
        share: 'A steady year in the corner office 📊 — WahalaVerse: Assume Their Life' },
    ],
  };
});
