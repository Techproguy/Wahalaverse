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

  // Distribute an exit value with NON-PARTICIPATING liquidation preferences:
  // each preferred holder takes the greater of (prefMult × invested) or its
  // as-converted common share; the remainder splits among the rest by shares.
  // Returns the integer proceeds for `id` (this is how a 3× down-round can leave
  // a founder with almost nothing on a real exit).
  function capExitProceeds(cap, exitValue, id) {
    if (exitValue <= 0) return 0;
    const total = capTotal(cap);
    const taking = {};
    let remaining = exitValue;
    for (const h of cap.holders) {
      if (h.prefMult > 0 && h.invested > 0) {
        const asConverted = (h.shares / total) * exitValue;
        const prefAmount = h.prefMult * h.invested;
        if (prefAmount > asConverted) { taking[h.id] = prefAmount; remaining -= prefAmount; }
      }
    }
    if (remaining < 0) remaining = 0;
    const common = cap.holders.filter(h => !(h.id in taking));
    const commonShares = common.reduce((t, h) => t + h.shares, 0);
    for (const h of common) taking[h.id] = commonShares > 0 ? (h.shares / commonShares) * remaining : 0;
    return Math.max(0, Math.round(taking[id] || 0));
  }

  return { capFound, capTotal, capOwnership, capRaise, capPool, capExitProceeds };
});
