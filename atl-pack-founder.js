/* WahalaVerse — "Assume Their Life" ROLE PACK: Founder Life.
   A fictional first-time founder building a startup in Lagos. The 0→1 journey:
   formation, early capital, product–market fit, hiring, dilution, growth, survival.
   ILLUSTRATIVE FICTION — no real person. Distinct from CEO Life (which leads an
   already-operating company) and Billionaire Life (capital/ownership).

   Distinctive mechanic: a real CAP TABLE (atl-systems.js) — raising money dilutes
   your ownership, and an aggressive liquidation preference can leave you with
   almost nothing on a "successful" exit. Decisions are actions with trade-offs,
   with delayed cascading consequences — not situation cards with changing meters.

   Exposes window.WAHALA_ATL_FOUNDER (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const S = (typeof module === 'object' && module.exports) ? require('./atl-systems.js') : root.WAHALA_ATL_SYSTEMS;
  const pack = factory(S);
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_ATL_FOUNDER = pack;
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';

  const FOUNDER_SHARES = 1000000;

  return {
    id: 'founder-life',
    role: 'A first-time startup founder in Lagos',
    title: 'Zero to One',
    horizonWeeks: 52,
    startEvent: 'E1',

    vars: {
      cash:      { label: 'Cash',        emoji: '💵', start: 3000000, min: 0, max: 9999999999, fmt: 'naira' },
      traction:  { label: 'Traction',    emoji: '📈', start: 15, min: 0, max: 100, fmt: 'pct' },
      team:      { label: 'Team',        emoji: '🧑🏾‍💻', start: 20, min: 0, max: 100, fmt: 'pct' },
      morale:    { label: 'Morale',      emoji: '🔋', start: 70, min: 0, max: 100, fmt: 'pct' },
      wellbeing: { label: 'Wellbeing',   emoji: '🧠', start: 75, min: 0, max: 100, fmt: 'pct' },
      ownership: { label: 'Your equity', emoji: '🪙', start: 100, min: 0, max: 100, fmt: 'pct' }, // derived from cap table
    },
    stakeholders: ['cofounder', 'investor', 'mentor', 'bigCustomer', 'team'],

    // Keep `ownership` in sync with the cap table after every step.
    derive(run) {
      if (!run.custom.cap) { run.vars.ownership = 100; return; }
      run.vars.ownership = Math.round(S.capOwnership(run.custom.cap, 'founder') * 100);
    },

    briefing: {
      hook: 'You quit the 9–5. You have a laptop, a rough idea, and three months of savings. The goal: turn nothing into something before the money runs out.',
      control: 'You decide the equity splits, who you raise from and on what terms, what you build, who you hire, and how hard you push.',
      cannot: 'You can’t force product–market fit, print cash, or un-sign a term sheet. Investors, cofounders and customers all have their own interests.',
      tension: 'Runway is short, an idea isn’t a business yet, and every naira of funding you take costs you a piece of the company.',
      goal: 'No single “win”: scale big, stay independent and profitable, or at least not lose yourself (and your equity) on the way. Each path costs something.',
    },

    events: {
      E1: {
        week: 1, arc: 'Formation',
        title: 'Form the company — who owns what?',
        body: 'Day one. The biggest decision looks boring but defines everything: who are the founders, and how do you split the equity?',
        choices: [
          { id: 'A', label: 'Go solo — keep 100%',
            reaction: 'All yours. All the weight, all the upside — and nobody to catch you when you fall.',
            ops(r){ r.custom.cap = S.capFound([{ id: 'founder', shares: FOUNDER_SHARES }]); },
            sets: { soloFounder: true }, next: 'E2' },
          { id: 'B', label: 'Bring a technical cofounder, split 50/50',
            reaction: 'A true partner and real firepower — but equal power means deadlock if you ever disagree.',
            ops(r){ r.custom.cap = S.capFound([{ id: 'founder', shares: FOUNDER_SHARES / 2 }, { id: 'cofounder', shares: FOUNDER_SHARES / 2 }]); },
            effects: { team: 15, morale: 5 }, memory: { cofounder: 2 }, sets: { cofounder: true },
            seeds: [{ id: 'S_cofounderfallout', fireWeek: 38, cond: (r) => r.memory.cofounder < 1,
              effects: { team: -20, morale: -15 },
              cause: 'the unresolved cofounder tension', note: 'You and your cofounder fell out — months of unspoken friction finally blew up.' }],
            next: 'E2' },
          { id: 'C', label: 'Bring a cofounder but keep control (70/30)',
            reaction: 'You stay in charge; they notice the imbalance from day one.',
            ops(r){ r.custom.cap = S.capFound([{ id: 'founder', shares: 700000 }, { id: 'cofounder', shares: 300000 }]); },
            effects: { team: 10 }, memory: { cofounder: -1 }, sets: { cofounder: true },
            seeds: [{ id: 'S_cofounderfallout', fireWeek: 38, cond: (r) => r.memory.cofounder < 1,
              effects: { team: -20, morale: -15 },
              cause: 'the lopsided 70/30 split', note: 'Your cofounder never felt like an equal and walked — the equity split from day one was the root.' }],
            next: 'E2' },
        ],
      },

      E2: {
        week: 5, arc: 'Early capital',
        title: 'Fund the first few months',
        body: 'Savings won’t last. How do you fund the build?',
        choices: [
          { id: 'D', label: 'Bootstrap — ramen and revenue',
            reaction: 'No dilution, no masters. Just a very tight belt.',
            effects: { cash: 500000, wellbeing: -8 }, sets: { bootstrapped: true }, next: 'E3' },
          { id: 'E', label: 'Raise ₦20m from an angel (₦80m pre-money)',
            reaction: 'Money in the bank — and your first ~20% gone.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'angel', amount: 20000000, preMoney: 80000000, prefMult: 1 }); },
            effects: { cash: 20000000 }, memory: { investor: 1 }, next: 'E3' },
          { id: 'F', label: 'Join an accelerator (₦10m for ~7%)',
            reaction: 'Less cash, but mentors, network and a demo day.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'accelerator', amount: 10000000, preMoney: 133000000, prefMult: 1 }); },
            effects: { cash: 10000000, team: 5 }, memory: { mentor: 2 }, next: 'E3' },
        ],
      },

      E3: {
        week: 11, arc: 'Product–market fit',
        title: 'The numbers aren’t moving',
        body: 'Three months in. People sign up and leave. Your gut says the vision is right; the data says something’s off.',
        choices: [
          { id: 'G', label: 'Pivot hard to what users actually use',
            reaction: 'Painful, but the new direction finally clicks for people.',
            effects: { traction: 25, team: -5, morale: -5 }, memory: { cofounder: -1 }, next: 'E4' },
          { id: 'H', label: 'Persevere — the market just needs time',
            reaction: 'You hold the line and keep shipping the original vision.',
            effects: { traction: 5 },
            seeds: [{ id: 'S_nopmf', fireWeek: 30, cond: (r) => r.vars.traction < 40,
              effects: { traction: -10, morale: -8 },
              cause: 'persevering without product–market fit', note: 'Users never really showed up — the months spent persevering without PMF finally told.' }],
            next: 'E4' },
          { id: 'I', label: 'Niche down to one desperate segment',
            reaction: 'You shrink the target and the few you keep actually love it.',
            effects: { traction: 15, cash: -500000 }, memory: { bigCustomer: 1 }, next: 'E4' },
        ],
      },

      E4: {
        week: 17, arc: 'Hiring',
        title: 'Growth needs hands',
        body: 'The product is working enough to grow. But you’re the bottleneck.',
        choices: [
          { id: 'J', label: 'Hire fast to catch the wave',
            reaction: 'A real team now — and a burn rate that keeps you up at night.',
            effects: { cash: -4000000, team: 20, morale: 5 },
            seeds: [{ id: 'S_cashcrunch', fireWeek: 29, cond: (r) => r.vars.cash < 1000000,
              effects: { team: -15, morale: -15 },
              cause: 'hiring ahead of revenue', note: 'The burn outran the bank — you had to do layoffs weeks after hiring.' }],
            next: 'E5' },
          { id: 'K', label: 'Stay lean, do most of it yourself',
            reaction: 'Capital-efficient — and you haven’t slept properly in weeks.',
            effects: { team: 5, wellbeing: -10 },
            seeds: [{ id: 'S_burnout', fireWeek: 33, cond: (r) => r.vars.wellbeing < 40,
              effects: { traction: -10, morale: -10, wellbeing: -10 },
              cause: 'running lean and carrying everything yourself', note: 'You burned out doing it all alone — and the product stalled while you recovered.' }],
            next: 'E5' },
          { id: 'L', label: 'Hire a senior lead + set up a 10% option pool',
            reaction: 'Serious talent — paid for with equity everyone (including you) gives up.',
            ops(r){ S.capPool(r.custom.cap, { pct: 0.10 }); },
            effects: { cash: -2000000, team: 15, morale: 8 }, next: 'E5' },
        ],
      },

      E5: {
        week: 26, arc: 'The raise',
        title: 'The round that decides your fate',
        body: 'You’ve got momentum. Now: how do you finance the next leg — and what do you give up for it?',
        choices: [
          { id: 'M', label: 'Take the aggressive VC mega-round (₦200m, 3× liquidation pref)',
            reaction: 'A war chest and a rocket — strapped on with terms that pay them first, hard.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'vc', amount: 200000000, preMoney: 300000000, prefMult: 3 }); },
            effects: { cash: 200000000, traction: 10, morale: -5 }, memory: { investor: 1, cofounder: -1 }, sets: { tookPref: true },
            seeds: [{ id: 'S_liqpref', fireWeek: 52, cond: (r) => r.flags.sold && r.custom.founderProceeds < (r.custom.exitValue || 0) * 0.2,
              effects: {},
              cause: 'the 3× liquidation preference you accepted', note: 'The investors’ 3× preference ate the exit — the Week-26 term sheet decided who actually got paid, and it wasn’t you.' }],
            next: 'E6' },
          { id: 'N', label: 'Raise a smaller clean round (₦60m, standard 1× terms)',
            reaction: 'Less firepower, fair terms, a cleaner table.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'vc', amount: 60000000, preMoney: 240000000, prefMult: 1 }); },
            effects: { cash: 60000000 }, memory: { investor: 1 }, next: 'E6' },
          { id: 'O', label: 'Use revenue-based financing (no dilution)',
            reaction: 'You keep every share — but the repayments start immediately.',
            effects: { cash: 30000000 }, sets: { debt: true },
            seeds: [{ id: 'S_debt', fireWeek: 44, cond: (r) => r.vars.cash < 5000000,
              effects: { morale: -10 },
              cause: 'the revenue-based financing repayments', note: 'Repayments bit hard once cash got tight — the “no dilution” money wasn’t free after all.' }],
            next: 'E6' },
          { id: 'P', label: 'Don’t raise — cut costs and extend runway',
            reaction: 'You stay in control and lean way out. Growth slows to a crawl.',
            effects: { team: -10, traction: -5, wellbeing: -8 }, sets: { lean: true }, next: 'E6' },
        ],
      },

      E6: {
        week: 38, arc: 'The reckoning builds',
        title: 'Everything you set in motion comes due',
        body: 'The decisions from earlier months are landing — some as crises, some as payoffs. How do you steer through it?',
        choices: [
          { id: 'Q', label: 'Rally the team and fix the culture',
            reaction: 'You invest in your people. It costs time and cash, but the room settles.',
            effects: { morale: 12, cash: -1000000, wellbeing: -8 }, memory: { cofounder: 1, team: 1 }, next: 'E7' },
          { id: 'R', label: 'Put your head down and ship',
            reaction: 'You tune out the noise and push the product forward, hard.',
            effects: { traction: 10, wellbeing: -12 }, memory: { cofounder: -1 }, next: 'E7' },
          { id: 'S', label: 'Bring in a seasoned operator (COO), top up the pool',
            reaction: 'Adult supervision and real process — paid for with a little more equity.',
            ops(r){ S.capPool(r.custom.cap, { pct: 0.05 }); },
            effects: { team: 12, cash: -1000000, morale: 5 }, next: 'E7' },
        ],
      },

      E7: {
        week: 50, arc: 'The finale',
        title: 'A year in — what happens to the company?',
        body: 'The runway, the cap table and the traction are what they are. One last decision defines your founder story.',
        choices: [
          { id: 'T', label: 'Sell the company now',
            reaction: 'You take the exit on the table. What you personally walk away with depends on your cap table.',
            ops(r){
              const ev = Math.round((r.vars.traction * 0.6 + r.vars.team * 0.4) / 100 * 2000000000);
              r.custom.exitValue = ev;
              const p = S.capExitProceeds(r.custom.cap, ev, 'founder');
              r.custom.founderProceeds = p;
              r.vars.cash = Math.min(r.vars.cash + p, r.vars.cash + p); // proceeds hit your pocket
            },
            sets: { sold: true }, next: 'END' },
          { id: 'U', label: 'Raise again and go for scale',
            reaction: 'You bet bigger: another huge round, more dilution, swing for the fences.',
            ops(r){ S.capRaise(r.custom.cap, { id: 'growth', amount: 500000000, preMoney: 1500000000, prefMult: 1 }); },
            effects: { cash: 500000000, traction: 10, morale: -5 }, sets: { scaling: true }, next: 'END' },
          { id: 'V', label: 'Grind to profitability — stay independent',
            reaction: 'No more raising. You make the unit economics work and own your destiny.',
            ops(r){ r.vars.cash += Math.round(r.vars.traction / 100 * 50000000); },
            effects: { wellbeing: -10 }, sets: { profitable: true }, next: 'END' },
          { id: 'W', label: 'Wind it down with dignity',
            reaction: 'It didn’t work. You return what you can and close the chapter.',
            ops(r){ r.vars.cash += 2000000; r.vars.traction = Math.min(r.vars.traction, 10); },
            sets: { shutdown: true }, next: 'END' },
        ],
      },
    },

    endings: [
      { id: 'burned_out', title: 'Burned Out, Folded', emoji: '🪫',
        test: (c) => c.vars.wellbeing < 30,
        blurb: 'You had the fight, but not the fuel. You ran yourself down until you couldn’t carry it anymore.',
        share: 'I burned out building my startup 🪫 — try to do better on WahalaVerse: Assume Their Life' },
      { id: 'cofounder_breakup', title: 'Cofounder Breakup', emoji: '💔',
        test: (c) => c.fired.includes('S_cofounderfallout') && c.vars.morale < 45,
        blurb: 'The company didn’t kill it — the partnership did. What you split on day one came back around.',
        share: 'My cofounder and I broke up the company 💔 — WahalaVerse: Assume Their Life' },
      { id: 'diluted_to_nothing', title: 'Diluted to Nothing', emoji: '📉',
        test: (c) => c.flags.sold && (c.run.custom.exitValue || 0) > 200000000 && (c.run.custom.founderProceeds || 0) < (c.run.custom.exitValue || 0) * 0.15,
        blurb: 'On paper, you sold a real company. In your account, almost nothing — the preference stack got paid, you didn’t.',
        share: 'I “sold my startup” and walked away with crumbs 📉 — WahalaVerse: Assume Their Life' },
      { id: 'venture_scaled', title: 'Venture Scaled', emoji: '🚀',
        test: (c) => (c.flags.sold && (c.run.custom.founderProceeds || 0) >= 300000000) || (c.flags.scaling && c.vars.traction >= 70 && c.vars.ownership >= 12),
        blurb: 'You built something real and big — and kept enough of it to matter. A genuine win.',
        share: 'I scaled my startup 🚀 — beat my run on WahalaVerse: Assume Their Life' },
      { id: 'profitable_independent', title: 'Profitable & Independent', emoji: '👑',
        test: (c) => c.flags.profitable && c.vars.cash > 0 && c.vars.ownership >= 50 && c.vars.traction >= 30,
        blurb: 'No unicorn headlines — just a real, profitable business you still own and control. Quietly, that’s rare.',
        share: 'Profitable and I still own my company 👑 — WahalaVerse: Assume Their Life' },
      { id: 'acquihired', title: 'Acqui-hired', emoji: '🤝',
        test: (c) => c.flags.sold,
        blurb: 'A modest exit — mostly a soft landing for you and the team. Not the dream, not a failure.',
        share: 'Modest startup exit 🤝 — WahalaVerse: Assume Their Life' },
      { id: 'folded', title: 'Folded', emoji: '🪦',
        test: (c) => c.flags.shutdown || c.vars.cash <= 0 || c.vars.traction < 20,
        blurb: 'It didn’t make it. Most don’t — and you learned more than any salary would have taught you.',
        share: 'My startup folded 🪦 — think you’d survive? WahalaVerse: Assume Their Life' },
      { id: 'steady_startup', title: 'Steady Startup', emoji: '📊',
        test: () => true,
        blurb: 'Still standing, still building. No triumph, no disaster — a real company finding its feet.',
        share: 'Still building, still here 📊 — WahalaVerse: Assume Their Life' },
    ],
  };
});
