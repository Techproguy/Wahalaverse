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

  // Full exit WATERFALL with NON-PARTICIPATING liquidation preferences. Returns a
  // { holderId: proceeds } map whose values sum to exitValue (proceeds are conserved).
  //  - If the exit can't cover the preference stack, preferred holders share the whole
  //    exit pro-rata by their preference claim; common holders get nothing.
  //  - Otherwise each preferred holder ELECTS the better of its preference
  //    (prefMult × invested) or CONVERTING to common; non-converters take their pref,
  //    and the remainder is split among common + converters by shares.
  // This is the mechanic by which a 3× down-round can leave a founder with ~nothing on
  // a real exit, while a big exit makes preferred holders convert and share the upside.
  function capExitWaterfall(cap, exitValue) {
    const out = {};
    cap.holders.forEach(h => { out[h.id] = 0; });
    if (exitValue <= 0) return out;
    const total = capTotal(cap);
    const isPref = h => h.prefMult > 0 && h.invested > 0;
    const claim = h => h.prefMult * h.invested;
    const prefHolders = cap.holders.filter(isPref);
    const stack = prefHolders.reduce((t, h) => t + claim(h), 0);

    if (exitValue <= stack) {                           // preference stack underwater
      for (const h of prefHolders) out[h.id] = stack > 0 ? claim(h) / stack * exitValue : 0;
      return out;                                       // common gets 0
    }
    // Conversion election: convert if as-converted share of the whole exit beats the pref.
    const converter = new Set();
    for (const h of prefHolders) {
      if ((h.shares / total) * exitValue > claim(h)) converter.add(h.id);
    }
    let taken = 0;
    for (const h of prefHolders) if (!converter.has(h.id)) { out[h.id] = claim(h); taken += claim(h); }
    const remaining = exitValue - taken;
    const pool = cap.holders.filter(h => !isPref(h) || converter.has(h.id)); // common + converters
    const poolShares = pool.reduce((t, h) => t + h.shares, 0);
    for (const h of pool) out[h.id] += poolShares > 0 ? (h.shares / poolShares) * remaining : 0;
    return out;
  }

  // Convenience: integer proceeds for a single holder from the waterfall.
  function capExitProceeds(cap, exitValue, id) {
    return Math.max(0, Math.round(capExitWaterfall(cap, exitValue)[id] || 0));
  }

  return { capFound, capTotal, capOwnership, capRaise, capPool, capExitWaterfall, capExitProceeds };
});
