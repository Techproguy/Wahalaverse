/* WahalaVerse — "Assume Their Life" ROLE PACK: Billionaire Life.
   A fictional self-made billionaire. ILLUSTRATIVE FICTION — no real person. DISTINCT
   from Founder (0→1 builder) and CEO (hired operator): this is a CAPITAL/OWNERSHIP life.
   You are rich on paper but your wealth is locked in illiquid holdings — a cash call can
   squeeze you even with a nine-figure net worth.

   Distinctive mechanics (atl-systems portfolio):
     • A PORTFOLIO of holdings (value, liquidity, volatility) — paper net worth vs cash.
     • Liquidity squeeze: raising cash means selling (illiquid → at a discount) or borrowing.
     • DEBT / leverage / collateral → margin-call risk in a downturn.
     • Family interests, influence, legal exposure; economic crises; preserve or lose wealth.

   Exposes window.WAHALA_ATL_BILLIONAIRE (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const S = (typeof module === 'object' && module.exports) ? require('./atl-systems.js') : root.WAHALA_ATL_SYSTEMS;
  const pack = factory(S);
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_ATL_BILLIONAIRE = pack;
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';
  const B = 1000000000; // ₦1bn

  return {
    id: 'billionaire-life',
    role: 'A self-made billionaire',
    title: 'Paper & Power',
    horizonWeeks: 52,
    startEvent: 'E1',

    vars: {
      liquidCash:    { label: 'Liquid cash',  emoji: '💵', start: 500000000, min: 0, max: 999999999999, fmt: 'naira' },
      netWorth:      { label: 'Net worth',    emoji: '💎', start: 0, min: -999999999999, max: 999999999999, fmt: 'naira' }, // derived
      debt:          { label: 'Debt',         emoji: '🏦', start: 0, min: 0, max: 999999999999, fmt: 'naira' },
      influence:     { label: 'Influence',    emoji: '🤝', start: 70, min: 0, max: 100, fmt: 'pct' },
      familyTrust:   { label: 'Family trust', emoji: '👪', start: 60, min: 0, max: 100, fmt: 'pct' },
      legalExposure: { label: 'Legal risk',   emoji: '⚠️', start: 20, min: 0, max: 100, fmt: 'pct' },
    },
    stakeholders: ['family', 'coInvestors', 'banker', 'regulator', 'press'],

    // Initialise the holdings once; keep net worth = cash + holdings − debt in sync.
    derive(run) {
      if (!run.custom.portfolio) run.custom.portfolio = [
        { id: 'publicStake', value: 40 * B, liquidity: 0.9, volatility: 1.2 }, // listed, liquid, swingy
        { id: 'privateEmpire', value: 30 * B, liquidity: 0.2, volatility: 0.8 }, // core private businesses
        { id: 'realEstate', value: 15 * B, liquidity: 0.3, volatility: 0.5 },
        { id: 'ventures', value: 10 * B, liquidity: 0.1, volatility: 1.6 }, // illiquid, high-beta bets
      ];
      run.vars.netWorth = S.netWorth(run.vars.liquidCash, run.custom.portfolio, run.vars.debt);
    },

    briefing: {
      hook: 'On paper you are worth nearly ₦100bn. In your current account: a rounding error. This year the difference between those two numbers will be tested.',
      control: 'You decide what to sell, what to borrow against, where to invest, how to handle family and how to wield influence.',
      cannot: 'You can’t spend paper wealth, can’t stop a market crash, and can’t make illiquid assets sell at full price on short notice.',
      tension: 'A ₦2bn obligation just landed and you hold only ₦500m in cash. Everything else is locked in holdings.',
      goal: 'No single “win”: preserve and grow the fortune, protect the family and your name, or overreach and lose it. Leverage cuts both ways.',
    },

    events: {
      E1: {
        week: 1, arc: 'The Squeeze',
        title: 'A ₦2bn cash call — and you’re cash-poor',
        body: 'A capital call plus a tax bill: ₦2bn due in days. Your net worth is enormous, but almost none of it is cash. How do you find the money?',
        choices: [
          { id: 'A', label: 'Sell some listed stock (fast, near full value)',
            reaction: 'Clean and quick — but your public stake (and the control it carries) shrinks.',
            ops(r){ r.vars.liquidCash += S.pfSell(r.custom.portfolio, 'publicStake', 0.06); },
            effects: { liquidCash: -2000000000, influence: -4 }, next: 'E2' },
          { id: 'B', label: 'Borrow against the empire (margin loan)',
            reaction: 'You keep everything — and pledge it as collateral. Leverage is a loaded gun.',
            effects: { debt: 2000000000, liquidCash: 0 }, sets: { levered: true },
            seeds: [{ id: 'S_margincall', fireWeek: 30, cond: (r) => r.vars.debt >= 6000000000 && r.vars.liquidCash < 2000000000,
              effects: { influence: -8, legalExposure: 6 },
              cause: 'the margin loan you took against your holdings', note: 'The downturn triggered a margin call on the loan from Week 1 — the bank forced sales at the worst time.' }],
            next: 'E2' },
          { id: 'C', label: 'Fire-sale an illiquid venture at a steep discount',
            reaction: 'You dump a private holding for far below its mark. Cash now, value gone forever.',
            ops(r){ r.vars.liquidCash += S.pfSell(r.custom.portfolio, 'ventures', 0.6); },
            effects: { liquidCash: -2000000000, influence: -2 }, next: 'E2' },
        ],
      },

      E2: {
        week: 8, arc: 'Family',
        title: 'The family wants in',
        body: 'A relative pitches a business and wants ₦1.5bn of your capital; an elder hints about succession and who really controls the empire.',
        choices: [
          { id: 'D', label: 'Back the family venture generously',
            reaction: 'Loyalty bought — with capital that may or may not come back.',
            ops(r){ r.custom.portfolio.push({ id: 'familyVenture', value: 1500000000, liquidity: 0.1, volatility: 1.8 }); },
            effects: { liquidCash: -1500000000, familyTrust: 12 }, next: 'E3' },
          { id: 'E', label: 'Set up a family trust instead (structure, not cash)',
            reaction: 'Fair and durable; nobody gets a blank cheque.',
            effects: { liquidCash: -200000000, familyTrust: 6, legalExposure: -4 }, next: 'E3' },
          { id: 'F', label: 'Refuse — keep business and family separate',
            reaction: 'Disciplined, and quietly resented.',
            effects: { familyTrust: -12 },
            seeds: [{ id: 'S_familyfallout', fireWeek: 36, cond: (r) => r.vars.familyTrust < 45,
              effects: { influence: -8, legalExposure: 8 },
              cause: 'shutting the family out', note: 'A family feud spilled into public — a relative contested control and dragged your name in.' }],
            next: 'E3' },
        ],
      },

      E3: {
        week: 16, arc: 'Allocation',
        title: 'A once-in-a-cycle investment',
        body: 'A rare asset is for sale — potentially transformative, definitely illiquid. Everyone wants in.',
        choices: [
          { id: 'G', label: 'Go big — lever up to buy it',
            reaction: 'A bold bet funded with the bank’s money. If the cycle turns, it bites.',
            ops(r){ r.custom.portfolio.push({ id: 'trophyAsset', value: 8000000000, liquidity: 0.2, volatility: 1.4 }); },
            effects: { debt: 6000000000, liquidCash: -2000000000, influence: 6 }, sets: { levered: true },
            seeds: [{ id: 'S_margincall', fireWeek: 30, cond: (r) => r.vars.debt >= 6000000000 && r.vars.liquidCash < 2000000000,
              effects: { influence: -8, legalExposure: 6 }, cause: 'levering up for the trophy asset', note: 'The leverage behind the trophy purchase triggered a margin call when values fell.' }],
            next: 'E4' },
          { id: 'H', label: 'Take a measured minority stake (cash only)',
            reaction: 'Skin in the game without betting the house.',
            ops(r){ r.custom.portfolio.push({ id: 'minorityStake', value: 2000000000, liquidity: 0.3, volatility: 1.1 }); },
            effects: { liquidCash: -2000000000 }, next: 'E4' },
          { id: 'I', label: 'Pass — keep your powder dry',
            reaction: 'Patience. Liquidity is its own position.',
            effects: { liquidCash: 200000000 }, next: 'E4' },
        ],
      },

      E4: {
        week: 24, arc: 'The Crisis',
        title: 'The market cracks',
        body: 'A global shock hits. Risk assets fall hard; the most volatile holdings fall hardest; lenders get nervous about their collateral.',
        choices: [
          { id: 'J', label: 'Deleverage — sell into the fall to repay debt',
            reaction: 'You lock in losses but you survive the margin desk’s phone call.',
            ops(r){ S.pfApplyShock(r.custom.portfolio, -0.15); const raise = S.pfSell(r.custom.portfolio, 'publicStake', 0.3); const pay = Math.min(raise, r.vars.debt); r.vars.debt -= pay; r.vars.liquidCash += (raise - pay); },
            effects: { influence: -4 }, next: 'E5' },
          { id: 'K', label: 'Hold the line — ride it out',
            reaction: 'Diamond hands. If you’re levered, the bank may decide for you.',
            ops(r){ S.pfApplyShock(r.custom.portfolio, -0.35); },
            effects: {}, next: 'E5' },
          { id: 'L', label: 'Buy the dip — press your advantage',
            reaction: 'Greedy when others are fearful — on borrowed money.',
            ops(r){ S.pfApplyShock(r.custom.portfolio, -0.20); r.custom.portfolio.push({ id: 'dipBuys', value: 5000000000, liquidity: 0.4, volatility: 1.5 }); },
            effects: { debt: 5000000000, influence: 4 }, sets: { levered: true },
            seeds: [{ id: 'S_margincall', fireWeek: 40, cond: (r) => r.vars.debt >= 10000000000 && r.vars.liquidCash < 2000000000,
              effects: { influence: -8, legalExposure: 6 }, cause: 'buying the dip with leverage', note: 'Doubling down on margin backfired — a second leg down forced liquidations.' }],
            next: 'E5' },
        ],
      },

      E5: {
        week: 32, arc: 'Power',
        title: 'Money into influence',
        body: 'You can convert wealth into standing — through giving, lobbying, or simply staying out of the headlines.',
        choices: [
          { id: 'M', label: 'Launch a major philanthropic foundation',
            reaction: 'Goodwill, access and a cleaner name — funded in cash.',
            effects: { liquidCash: -1000000000, influence: 10, legalExposure: -6, familyTrust: 3 }, next: 'E6' },
          { id: 'N', label: 'Lobby aggressively for your interests',
            reaction: 'Doors open — and so do files.',
            effects: { influence: 12, legalExposure: 12 },
            seeds: [{ id: 'S_legalprobe', fireWeek: 44, cond: (r) => r.vars.legalExposure > 40,
              effects: { legalExposure: 10, influence: -8, liquidCash: -1500000000 },
              cause: 'the aggressive lobbying', note: 'A regulatory probe opened over the lobbying — legal bills and a bruised reputation followed.' }],
            next: 'E6' },
          { id: 'O', label: 'Keep a low profile',
            reaction: 'No new friends, no new enemies.',
            effects: { legalExposure: -3 }, next: 'E6' },
        ],
      },

      E6: {
        week: 40, arc: 'Consequences',
        title: 'The bills come due',
        body: 'The year’s leverage, family choices and headlines are landing. A margin call means the bank sells your best assets at the worst price unless you act.',
        choices: [
          { id: 'P', label: 'Meet the calls — raise cash from the portfolio',
            reaction: 'You sell what you must and keep control of the rest.',
            ops(r){ const need = Math.max(0, r.vars.debt - 2000000000); if (need > 0) { const got = S.pfSell(r.custom.portfolio, 'privateEmpire', 0.3); const pay = Math.min(got, r.vars.debt); r.vars.debt -= pay; r.vars.liquidCash += got - pay; } },
            effects: { influence: -3 }, next: 'E7' },
          { id: 'Q', label: 'Restructure the debt with the bankers',
            reaction: 'You buy time by giving the lenders more say — and more collateral.',
            effects: { debt: -2000000000, liquidCash: -500000000, influence: -2 }, memory: { banker: 1 }, next: 'E7' },
          { id: 'R', label: 'Call in favours — let your influence carry you',
            reaction: 'Relationships paper over the cracks… if you have enough of them.',
            ops(r){ if (r.vars.influence < 55) { r.vars.debt += 1000000000; } },
            effects: { influence: -6 }, next: 'E7' },
        ],
      },

      E7: {
        week: 50, arc: 'The Finale',
        title: 'Year-end — preserve, press, or cash out',
        body: 'The fortune is whatever your decisions made it. One last move defines the year.',
        choices: [
          { id: 'S', label: 'De-risk and preserve the fortune',
            reaction: 'You cut leverage and lock in what you have. Boring is the point.',
            ops(r){ const raise = S.pfSell(r.custom.portfolio, 'publicStake', 0.2); const pay = Math.min(raise, r.vars.debt); r.vars.debt -= pay; r.vars.liquidCash += raise - pay; },
            sets: { preserved: true }, next: 'END' },
          { id: 'T', label: 'Make a legacy mega-bet',
            reaction: 'You swing for a defining deal — with the balance sheet behind it.',
            ops(r){ r.custom.portfolio.push({ id: 'legacyBet', value: 12000000000, liquidity: 0.2, volatility: 1.7 }); r.vars.debt += 8000000000; },
            effects: { influence: 6 }, sets: { megabet: true }, next: 'END' },
          { id: 'U', label: 'Cash out — liquidate to safety',
            reaction: 'You sell down to cash and bonds. Safe, smaller, and out of the game.',
            ops(r){ for (const h of r.custom.portfolio) { r.vars.liquidCash += S.pfSell(r.custom.portfolio, h.id, 1); } const pay = Math.min(r.vars.liquidCash, r.vars.debt); r.vars.debt -= pay; r.vars.liquidCash -= pay; },
            sets: { cashedout: true }, next: 'END' },
          { id: 'V', label: 'Hand the empire to the next generation',
            reaction: 'You step back and pass control to the family.',
            effects: { familyTrust: 10, influence: -4 }, sets: { succession: true }, next: 'END' },
        ],
      },
    },

    endings: [
      { id: 'wiped_out', title: 'Wiped Out', emoji: '💥',
        test: (c) => c.vars.netWorth < 35000000000 || c.vars.debt > c.vars.liquidCash + S.pfValue(c.run.custom.portfolio),
        blurb: 'Leverage is a two-way street and it ran you over. The empire couldn’t cover its debts.',
        share: 'I levered up and lost the empire 💥 — WahalaVerse: Assume Their Life' },
      { id: 'liquidity_crisis', title: 'Rich on Paper, Broke in Cash', emoji: '🧊',
        test: (c) => c.vars.netWorth >= 40000000000 && c.vars.liquidCash < 500000000 && c.fired.includes('S_margincall'),
        blurb: 'Still a paper fortune — but a cash squeeze forced fire-sales at the worst time. Net worth isn’t money in the bank.',
        share: 'Billions on paper, broke in cash 🧊 — WahalaVerse: Assume Their Life' },
      { id: 'empire_grown', title: 'Fortune Multiplied', emoji: '📈',
        test: (c) => c.vars.netWorth >= 90000000000 && c.vars.debt < 10000000000,
        blurb: 'You read the cycle, used leverage wisely, and came out far richer than you started.',
        share: 'I grew the fortune 📈 — beat my run on WahalaVerse: Assume Their Life' },
      { id: 'cashed_out', title: 'Cashed Out', emoji: '🏦',
        test: (c) => c.flags.cashedout,
        blurb: 'You converted the empire to safety. Smaller, liquid, and no longer a player — but it’s yours and it’s real.',
        share: 'I cashed out the empire 🏦 — WahalaVerse: Assume Their Life' },
      { id: 'dynasty', title: 'Dynasty Secured', emoji: '🏛️',
        test: (c) => c.vars.familyTrust >= 70 && c.vars.netWorth >= 65000000000 && c.vars.legalExposure < 40,
        blurb: 'Wealth preserved, family aligned, name clean. You built something that outlasts you.',
        share: 'Dynasty secured 🏛️ — WahalaVerse: Assume Their Life' },
      { id: 'quiet_power', title: 'Quiet Power', emoji: '🕶️',
        test: (c) => c.vars.influence >= 75 && c.vars.netWorth >= 60000000000,
        blurb: 'Not the richest headline, but the one everyone calls. Influence compounded as quietly as the money.',
        share: 'Quiet power 🕶️ — WahalaVerse: Assume Their Life' },
      { id: 'steady_fortune', title: 'Steady Fortune', emoji: '💼',
        test: () => true,
        blurb: 'The fortune survived the year roughly intact. No disaster, no transformation — preserved, for now.',
        share: 'Fortune intact 💼 — WahalaVerse: Assume Their Life' },
    ],
  };
});
