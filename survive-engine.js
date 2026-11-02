/* WahalaVerse — "Survive Naija 2.0" ENGINE.
   A short-form, resource-SURVIVAL engine (distinct from Assume Their Life, which is a
   causal role-STORY engine). Here you are an ordinary Nigerian juggling competing needs
   over a 7-day run under seeded-random pressure, leaning on named people around you.

   Pure, framework-free, SEEDED-deterministic (no Date, no Math.random — a run is fully
   reproducible from its seed + choice sequence, yet varies run-to-run). Loaded as a
   classic <script> (window.WahalaSurvive) OR required in Node (module.exports).

   Scenario-agnostic: all content (starting background, resources, named NPCs, standing
   actions, the event deck, delayed consequences and endings) lives in a SCENARIO PACK
   (survive-pack-*.js), so "7 Days to Payday", "7 Days of Hustle" and "Campus Survival"
   are all the same engine with different packs.

   Design notes honoured:
   - BROAD survival, not a payday/finance sim: cash/debt + wellbeing + safety + livelihood
     + social support, plus food (meals) / power (days) as ACTUAL QUANTITIES and causal flags.
   - A day is NOT one fixed event + a score change: each day you have limited ACTION POINTS
     and choose among standing actions, drawn events, NPC calls and recovery — a continuous
     loop with competing needs, negotiation, delay/refusal, and delayed consequences.
*/
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaSurvive = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clampPct = (v) => Math.max(0, Math.min(100, v));
  // Quantity resources (cash may go negative = debt; food/power never below 0).
  const QUANTITY = { cash: { min: -1e12 }, food: { min: 0 }, power: { min: 0 } };
  const PCT = new Set(['wellbeing', 'safety', 'livelihood']);

  // --- seeded RNG (mulberry32); deterministic, advances run._s -------------------
  function rngFloat(run) {
    let t = (run._s = (run._s + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rngInt = (run, a, b) => a + Math.floor(rngFloat(run) * (b - a + 1));

  function applyDelta(run, key, delta) {
    if (delta == null) return;
    if (PCT.has(key)) { run.res[key] = clampPct((run.res[key] || 0) + delta); return; }
    const q = QUANTITY[key];
    let v = (run.res[key] || 0) + delta;
    if (q && v < q.min) v = q.min;
    run.res[key] = v;
  }

  // Context handed to a pack's apply()/precondition() — the only way packs touch state.
  function makeCtx(pack, run) {
    return {
      run,
      rng: () => rngFloat(run),
      randInt: (a, b) => rngInt(run, a, b),
      add: (key, delta) => applyDelta(run, key, delta),
      get: (key) => run.res[key],
      set: (key, val) => { run.res[key] = PCT.has(key) ? clampPct(val) : val; },
      npc: (id, delta) => { if (run.npcs[id]) run.npcs[id].goodwill += delta; },
      npcGoodwill: (id) => (run.npcs[id] ? run.npcs[id].goodwill : 0),
      flag: (k, v = true) => { run.flags[k] = v; },
      has: (k) => !!run.flags[k],
      counter: (k, d = 1) => { run.counters[k] = (run.counters[k] || 0) + d; return run.counters[k]; },
      count: (k) => run.counters[k] || 0,
      seed: (spec) => run.seeds.push(Object.assign({ status: 'armed' }, spec)),
      react: (s) => { run.lastReaction = s; },
      support: () => socialSupport(run),
    };
  }

  // Social support (a CORE indicator) is DERIVED from named-NPC goodwill, not a free meter.
  function socialSupport(run) {
    const vals = Object.values(run.npcs).map((n) => n.goodwill);
    if (!vals.length) return 0;
    const sum = vals.reduce((t, v) => t + v, 0);
    return clampPct(50 + sum * 6); // neutral 50; each goodwill point ~6
  }

  function createRun(pack, opts) {
    const o = opts || {};
    const run = {
      packId: pack.id, scenario: pack.scenario, title: pack.title,
      seed: (o.seed != null ? o.seed : 1) | 0,
      _s: (o.seed != null ? o.seed : 1) | 0,
      day: 1, maxDays: pack.maxDays || 7,
      ap: pack.apPerDay || 3, apUsed: 0, apMax: pack.apPerDay || 3,
      res: Object.assign({}, pack.start.res),
      npcs: {}, flags: {}, counters: {},
      seeds: [], fired: [], history: [], log: [],
      today: { events: [], done: {} },
      lastReaction: '', ended: false, outcome: null,
    };
    for (const n of pack.npcs) run.npcs[n.id] = { id: n.id, name: n.name, role: n.role || '', goodwill: n.goodwill || 0 };
    if (pack.onStart) pack.onStart(run, makeCtx(pack, run));
    drawEvents(pack, run); // day 1
    return run;
  }

  // Draw the day's events from the deck (seeded). Scenario packs may also SCRIPT an event
  // on a given day. Events are situations addressed via their choices during the day.
  function drawEvents(pack, run) {
    run.today = { events: [], done: {} };
    const ctx = makeCtx(pack, run);
    const scripted = (pack.scripted && pack.scripted[run.day]) || [];
    for (const id of scripted) {
      const ev = pack.deck.find((e) => e.id === id);
      if (ev && (!ev.precondition || ev.precondition(run, ctx))) pushEvent(run, ev);
    }
    const n = typeof pack.eventsPerDay === 'function' ? pack.eventsPerDay(run.day) : (pack.eventsPerDay || 1);
    let guard = 0;
    while (run.today.events.length < n && guard++ < 50) {
      const pool = pack.deck.filter((e) => !e.scriptedOnly
        && !(e.oncePerRun && run.counters['ev_' + e.id])
        && !run.today.events.some((x) => x.id === e.id)
        && (!e.precondition || e.precondition(run, ctx)));
      if (!pool.length) break;
      const total = pool.reduce((t, e) => t + (e.weight || 1), 0);
      let r = rngFloat(run) * total, pick = pool[0];
      for (const e of pool) { r -= (e.weight || 1); if (r <= 0) { pick = e; break; } }
      pushEvent(run, pick);
    }
  }
  function pushEvent(run, ev) {
    run.counters['ev_' + ev.id] = (run.counters['ev_' + ev.id] || 0) + 1;
    run.today.events.push({ id: ev.id, title: ev.title, body: ev.body, mandatory: !!ev.mandatory, resolved: false, _ref: ev });
  }

  // All tappable options for the current day: unresolved event choices, standing actions,
  // and NPC "calls" — each with an AP + resource cost and an availability reason.
  function options(pack, run) {
    if (run.ended) return [];
    const ctx = makeCtx(pack, run);
    const out = [];
    for (const ev of run.today.events) {
      if (ev.resolved) continue;
      for (const c of ev._ref.choices) {
        if (c.show && !c.show(run, ctx)) continue;
        out.push(decorate(run, 'ev:' + ev.id + ':' + c.id, c, 'event', ev.title));
      }
    }
    for (const a of pack.actions) {
      if (a.available && !a.available(run, ctx)) continue;
      out.push(decorate(run, 'act:' + a.id, a, a.group || 'action'));
    }
    for (const n of pack.npcAsks || []) {
      if (n.available && !n.available(run, ctx)) continue;
      out.push(decorate(run, 'npc:' + n.id, n, 'call', run.npcs[n.npc] && run.npcs[n.npc].name));
    }
    return out;
  }
  function decorate(run, id, def, group, sub) {
    const cost = def.cost || {};
    let disabled = false, reason = '';
    if ((cost.ap || 0) > (run.ap - run.apUsed)) { disabled = true; reason = 'No energy left today'; }
    for (const k of ['cash', 'food', 'power']) {
      if (cost[k] && (run.res[k] || 0) < cost[k]) { disabled = true; reason = reason || ('Not enough ' + k); }
    }
    return {
      id, group, sub,
      label: typeof def.label === 'function' ? def.label(run) : def.label,
      cost, disabled, reason,
    };
  }

  function findOption(pack, run, optionId) {
    const parts = optionId.split(':');
    if (parts[0] === 'ev') {
      const ev = run.today.events.find((e) => e.id === parts[1] && !e.resolved);
      const c = ev && ev._ref.choices.find((x) => x.id === parts[2]);
      return c ? { def: c, ev } : null;
    }
    if (parts[0] === 'act') { const a = pack.actions.find((x) => x.id === parts[1]); return a ? { def: a } : null; }
    if (parts[0] === 'npc') { const a = (pack.npcAsks || []).find((x) => x.id === parts[1]); return a ? { def: a } : null; }
    return null;
  }

  function choose(pack, run, optionId) {
    if (run.ended) throw new Error('Run is over');
    const found = findOption(pack, run, optionId);
    if (!found) throw new Error('Unknown option ' + optionId);
    const def = found.def, cost = def.cost || {};
    if ((cost.ap || 0) > (run.ap - run.apUsed)) throw new Error('Not enough AP');
    for (const k of ['cash', 'food', 'power']) if (cost[k] && (run.res[k] || 0) < cost[k]) throw new Error('Cannot afford ' + k);
    // pay costs
    run.apUsed += (cost.ap || 0);
    for (const k of ['cash', 'food', 'power']) if (cost[k]) applyDelta(run, k, -cost[k]);
    run.lastReaction = '';
    const ctx = makeCtx(pack, run);
    // declarative effects
    if (def.effects) for (const k of Object.keys(def.effects)) applyDelta(run, k, def.effects[k]);
    if (def.npc) for (const id of Object.keys(def.npc)) ctx.npc(id, def.npc[id]);
    if (def.sets) Object.assign(run.flags, def.sets);
    if (def.seeds) for (const s of def.seeds) ctx.seed(s);
    if (def.reaction) run.lastReaction = typeof def.reaction === 'function' ? def.reaction(run) : def.reaction;
    // imperative apply (randomness, negotiation outcomes, etc.)
    if (def.apply) def.apply(run, ctx);
    if (found.ev) found.ev.resolved = true;
    run.history.push({ day: run.day, optionId, label: typeof def.label === 'function' ? def.label(run) : def.label, reaction: run.lastReaction });
    return run;
  }

  function fireDueSeeds(pack, run, uptoDay) {
    const ctx = makeCtx(pack, run);
    for (const s of run.seeds) {
      if (s.status !== 'armed' || s.fireDay > uptoDay) continue;
      if (s.cond && !s.cond(run, ctx)) { s.status = 'expired'; continue; }
      if (s.effects) for (const k of Object.keys(s.effects)) applyDelta(run, k, s.effects[k]);
      if (s.npc) for (const id of Object.keys(s.npc)) ctx.npc(id, s.npc[id]);
      if (s.sets) Object.assign(run.flags, s.sets);
      if (s.apply) s.apply(run, ctx);
      s.status = 'fired'; s.firedDay = uptoDay;
      run.fired.push(s);
    }
  }

  // Overnight: eat, drain, debt interest, work/livelihood, delayed seeds, SETBACK+recovery,
  // advance the day, then either resolve (payday) or draw tomorrow's events.
  function endDay(pack, run) {
    if (run.ended) return run;
    const ctx = makeCtx(pack, run);
    const night = { day: run.day, setbacks: [], notes: [] };

    // essential needs consumed overnight (actual quantities)
    if ((run.res.food || 0) > 0) applyDelta(run, 'food', -1);
    else { applyDelta(run, 'wellbeing', -12); const h = ctx.counter('hungryNights'); if (h >= 2) ctx.seed({ id: 'sick_hunger', fireDay: run.day + 1, effects: { wellbeing: -10, safety: 0 }, note: 'Going hungry for days wore you down — you fell sick.', cause: 'skipping meals to save money' }); night.notes.push('You slept hungry.'); }
    if ((run.res.power || 0) > 0) applyDelta(run, 'power', -1);
    else { run.flags.noPower = true; applyDelta(run, 'wellbeing', -3); }

    applyDelta(run, 'wellbeing', -3); // fatigue
    if ((run.res.cash || 0) < 0) applyDelta(run, 'cash', -Math.round(Math.abs(run.res.cash) * 0.05)); // debt interest

    if (pack.onNight) pack.onNight(run, ctx, night);
    fireDueSeeds(pack, run, run.day);

    // recoverable setbacks (never instant game-over)
    let apPenalty = 0;
    if (run.res.wellbeing <= 0) { run.res.wellbeing = 22; applyDelta(run, 'cash', -4000); apPenalty = 1; night.setbacks.push({ id: 'collapse', text: 'You collapsed from exhaustion. A clinic visit set you back ₦4,000 and tomorrow starts slow.' }); ctx.counter('collapses'); }
    if (run.res.safety <= 0) { run.res.safety = 25; applyDelta(run, 'wellbeing', -8); night.setbacks.push({ id: 'incident', text: 'A scary incident shook you. You pulled through, but it rattled your week.' }); ctx.counter('incidents'); }

    run.log.push(night);
    run.day += 1;
    run.ap = Math.max(1, run.apMax - apPenalty); run.apUsed = 0;

    if (run.day > run.maxDays) { resolve(pack, run); return run; }
    drawEvents(pack, run);
    return run;
  }

  function resolve(pack, run) {
    const ctx = makeCtx(pack, run);
    if (pack.onPayday) pack.onPayday(run, ctx); // e.g. salary lands (scaled by livelihood)
    fireDueSeeds(pack, run, run.maxDays + 1);
    run.ended = true;
    const c = endingCtx(run);
    for (const e of pack.endings) { if (e.test(c)) { run.outcome = outObj(e, c); return; } }
    const last = pack.endings[pack.endings.length - 1];
    run.outcome = outObj(last, c);
  }
  function endingCtx(run) {
    return { res: run.res, flags: run.flags, counters: run.counters, npcs: run.npcs, support: socialSupport(run), fired: run.fired.map((f) => f.id), run };
  }
  const outObj = (e, c) => ({ id: e.id, title: e.title, emoji: e.emoji || '🎬', blurb: typeof e.blurb === 'function' ? e.blurb(c) : e.blurb, share: e.share ? (typeof e.share === 'function' ? e.share(c) : e.share) : '' });

  const isOver = (run) => !!run.ended;

  function reckoning(pack, run) {
    const indicators = (pack.indicators || []).map((ind) => ({
      key: ind.key, label: ind.label, emoji: ind.emoji, fmt: ind.fmt || 'num',
      start: pack.start.res[ind.key] != null ? pack.start.res[ind.key] : (ind.derived ? null : 0),
      end: ind.key === 'support' ? socialSupport(run) : run.res[ind.key],
    }));
    return {
      scenario: run.scenario, title: run.title, days: run.maxDays,
      outcome: run.outcome, indicators,
      people: Object.values(run.npcs).map((n) => ({ name: n.name, role: n.role, goodwill: n.goodwill })),
      surprises: run.fired.filter((f) => f.note).map((f) => ({ day: f.firedDay, note: f.note, cause: f.cause })),
      pivotal: pivotal(run),
      setbacks: run.log.flatMap((l) => l.setbacks.map((s) => ({ day: l.day, text: s.text }))),
    };
  }
  function pivotal(run) {
    // decisions that planted a consequence that later fired, plus the first and last.
    const firedIds = new Set(run.fired.map((f) => f.id));
    const picks = [];
    run.history.forEach((h, i) => {
      const first = i === 0, last = i === run.history.length - 1;
      if (first || last || (h.seedIds && h.seedIds.some((s) => firedIds.has(s)))) picks.push({ day: h.day, label: h.label });
    });
    const seen = new Set(); const out = [];
    for (const p of picks) { const k = p.day + '|' + p.label; if (!seen.has(k)) { seen.add(k); out.push(p); } }
    return out.slice(0, 6);
  }

  return { createRun, options, choose, endDay, isOver, reckoning, socialSupport, _rngFloat: rngFloat };
});
