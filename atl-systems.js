/* WahalaVerse — "Assume Their Life" shared role SUB-SYSTEMS.
   Reusable, pure, deterministic helpers that role packs drive from inside
   `choice.ops(run)` / `pack.derive(run)`. The engine stays role-agnostic; these
   model the ownership/finance realities that distinguish the core roles.

   Authored once, reused by multiple packs:
     • capTable  — ownership %, fundraising dilution, option pools, liquidation
                   preferences, exit distribution. Used by Founder, CEO, Billionaire.
     (portfolio / budget / voteCount land here as the CEO/Billionaire/Political
      packs are built — same module, same contract.)

   Exposes window.WAHALA_ATL_SYSTEMS (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WAHALA_ATL_SYSTEMS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Cap table ------------------------------------------------------------
  // A cap table is { holders: [{ id, shares, invested, prefMult }] }.
  // `invested` is cash put in; `prefMult` is a liquidation-preference multiple
  // (0 = common stock). Share counts are arbitrary integers; only ratios matter.

  function capFound(splits) {
    return { holders: splits.map(s => ({ id: s.id, shares: s.shares, invested: s.invested || 0, prefMult: s.prefMult || 0 })) };
  }
  const capTotal = (cap) => cap.holders.reduce((t, h) => t + h.shares, 0);
  function capOwnership(cap, id) {
    const t = capTotal(cap); const h = cap && cap.holders.find(x => x.id === id);
    return t > 0 && h ? h.shares / t : 0;
  }

  // Priced round: issue new shares to `id` at an implied price of preMoney/total.
  // Everyone else is diluted pro-rata. Mutates and returns the cap table.
  function capRaise(cap, { id, amount, preMoney, prefMult = 1 }) {
    const total = capTotal(cap);
    if (total <= 0 || preMoney <= 0 || amount <= 0) return cap;
    const newShares = Math.round(amount * total / preMoney);
    const existing = cap.holders.find(h => h.id === id);
    if (existing) { existing.shares += newShares; existing.invested += amount; existing.prefMult = Math.max(existing.prefMult, prefMult); }
    else cap.holders.push({ id, shares: newShares, invested: amount, prefMult });
    return cap;
  }

  // Create/extend an option pool sized to `pct` of the POST-money table (dilutive
  // to everyone else). pct is a fraction (0.10 = 10%).
  function capPool(cap, { pct }) {
    const total = capTotal(cap);
    if (pct <= 0 || pct >= 1) return cap;
    const poolShares = Math.round(total * pct / (1 - pct));
    const existing = cap.holders.find(h => h.id === 'optionPool');
    if (existing) existing.shares += poolShares;
    else cap.holders.push({ id: 'optionPool', shares: poolShares, invested: 0, prefMult: 0 });
    return cap;
  }

  // Full exit WATERFALL honouring liquidation-preference TERMS: claim seniority,
  // conversion election, and participation. Returns a { holderId: proceeds } map whose
  // values sum to exitValue (proceeds conserved). Holder fields used:
  //   prefMult (0 = common), invested, seniority (higher = paid first; default 1),
  //   participating (bool; takes pref AND shares the common pool), prefCap (×invested
  //   total cap for a participating holder; optional).
  // Rules:
  //  1) A NON-participating preferred holder ELECTS to convert to common if its
  //     as-converted share of the whole exit beats its preference (claim = prefMult×invested).
  //  2) Remaining (non-converted) preferences are paid by SENIORITY tier, senior first;
  //     if a tier is underwater, that tier shares what's left pro-rata by claim and juniors
  //     + common get nothing.
  //  3) Whatever remains splits among the COMMON POOL (common + converters + PARTICIPATING
  //     preferred) by shares. Participating holders thus take pref AND participate; a
  //     prefCap clamps their total and redistributes the excess.
  function capExitWaterfall(cap, exitValue) {
    const out = {};
    cap.holders.forEach(h => { out[h.id] = 0; });
    if (exitValue <= 0) return out;
    const total = capTotal(cap);
    const isPref = h => h.prefMult > 0 && h.invested > 0;
    const claim = h => h.prefMult * h.invested;

    // 1) conversion election (non-participating only)
    const converter = new Set();
    for (const h of cap.holders) {
      if (isPref(h) && !h.participating && (h.shares / total) * exitValue > claim(h)) converter.add(h.id);
    }
    // 2) pay preferences by seniority (descending); converted holders skip the stack
    const payHolders = cap.holders.filter(h => isPref(h) && !converter.has(h.id));
    const tiers = [...new Set(payHolders.map(h => h.seniority || 1))].sort((a, b) => b - a);
    let remaining = exitValue;
    for (const tier of tiers) {
      if (remaining <= 0) break;
      const group = payHolders.filter(h => (h.seniority || 1) === tier);
      const groupClaim = group.reduce((t, h) => t + claim(h), 0);
      if (remaining < groupClaim) {                    // tier underwater -> pro-rata, stop
        for (const h of group) out[h.id] += claim(h) / groupClaim * remaining;
        remaining = 0; break;
      }
      for (const h of group) out[h.id] += claim(h);
      remaining -= groupClaim;
    }
    // 3) common pool = common + converters + participating preferred, by shares
    if (remaining > 0) {
      const pool = cap.holders.filter(h => !isPref(h) || converter.has(h.id) || h.participating);
      const distribute = (amount, members) => {
        const sh = members.reduce((t, h) => t + h.shares, 0);
        for (const h of members) out[h.id] += sh > 0 ? (h.shares / sh) * amount : 0;
      };
      distribute(remaining, pool);
      // 4) participation cap: clamp participating holders, redistribute excess once
      let excess = 0; const uncapped = [];
      for (const h of pool) {
        if (h.participating && h.prefCap > 0) {
          const capAmt = h.prefCap * h.invested;
          if (out[h.id] > capAmt) { excess += out[h.id] - capAmt; out[h.id] = capAmt; }
          else uncapped.push(h);
        } else uncapped.push(h);
      }
      if (excess > 0 && uncapped.length) distribute(excess, uncapped);
    }
    return out;
  }

  // Board removal vote (explicit governance rule). Each director votes to REMOVE when
  // confidence falls below their tolerance (activists are quickest to pull the trigger,
  // allied directors the slowest). Removal needs a majority of the seats.
  function boardRemovalVote(board, confidence, tol) {
    const t = Object.assign({ friendly: 40, independent: 50, activist: 75 }, tol || {});
    const seats = (board.friendly || 0) + (board.independent || 0) + (board.activist || 0);
    let remove = 0;
    if (confidence < t.friendly) remove += (board.friendly || 0);
    if (confidence < t.independent) remove += (board.independent || 0);
    if (confidence < t.activist) remove += (board.activist || 0);
    const majority = Math.floor(seats / 2) + 1;
    return { seats, remove, keep: seats - remove, majority, removed: remove >= majority };
  }

  // Convenience: integer proceeds for a single holder from the waterfall.
  function capExitProceeds(cap, exitValue, id) {
    return Math.max(0, Math.round(capExitWaterfall(cap, exitValue)[id] || 0));
  }

  // ---- Portfolio (Billionaire) ---------------------------------------------
  // A portfolio is an array of holdings { id, value, liquidity (0..1), volatility }.
  // Models the gap between PAPER net worth and spendable CASH: illiquid assets sell at a
  // discount, and volatile assets swing hardest in a shock.
  const pfValue = (pf) => pf.reduce((t, h) => t + h.value, 0);

  // Sell a fraction of a holding; returns cash proceeds AFTER an illiquidity discount
  // (liquid assets fetch ~full value, illiquid ones much less). Mutates the holding.
  function pfSell(pf, id, fraction) {
    const h = pf.find(x => x.id === id);
    if (!h) return 0;
    const f = Math.max(0, Math.min(1, fraction));
    const sold = h.value * f;
    const proceeds = sold * (0.6 + 0.4 * h.liquidity); // 60%–100% depending on liquidity
    h.value = Math.max(0, h.value - sold);
    return Math.round(proceeds);
  }

  // Apply a market shock (e.g. -0.3). Volatility amplifies the move. Mutates values.
  function pfApplyShock(pf, shockPct) {
    for (const h of pf) h.value = Math.max(0, Math.round(h.value * (1 + shockPct * h.volatility)));
    return pf;
  }

  const netWorth = (cash, pf, debt) => cash + pfValue(pf) - (debt || 0);

  // ---- Legislature (Political) ---------------------------------------------
  // Whether a bill passes: your bloc votes yes; independents are won over in
  // proportion to your `support` (coalition strength 0..100); the opposition votes no.
  // Passing needs a seat majority — so an unpopular-with-the-aisle bill fails even if you
  // want it, and passing is NOT the same as implementing it (see the packs' capacity roll).
  function legislativeVote(leg, support) {
    const gov = leg.gov || 0, opp = leg.opp || 0, ind = leg.ind || 0;
    const total = gov + opp + ind;
    const indYes = Math.round(ind * Math.max(0, Math.min(100, support)) / 100);
    const yes = gov + indYes;
    const majority = Math.floor(total / 2) + 1;
    return { yes, no: total - yes, majority, passed: yes >= majority };
  }

  return {
    capFound, capTotal, capOwnership, capRaise, capPool, capExitWaterfall, capExitProceeds, boardRemovalVote,
    pfValue, pfSell, pfApplyShock, netWorth,
    legislativeVote,
  };
});
