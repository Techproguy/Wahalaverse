/* WahalaVerse — "Assume Their Life" causal simulation ENGINE.
   Pure, framework-free, role-agnostic. Loaded as a classic <script>
   (exposes window.WahalaATL) OR required in Node (module.exports).
   No DOM, no network, no randomness, no Date — fully deterministic so a run
   is reproducible and unit-testable.

   The engine knows NOTHING about Afrobeats, billionaires, CEOs or politics.
   All role-specific reality lives in a *role pack* (see atl-pack-afrobeats.js).
   A pack declares its own state variables, stakeholders, events, delayed
   consequences ("seeds") and endings. This is the extensibility contract that
   lets future role packs (Billionaire, CEO/Founder, Celebrity, Political) add
   role-specific systems — ownership structures, cap tables, portfolios — WITHOUT
   changing this engine:
     • pack.vars        — each role defines its own meters (ranges + formatting).
     • choice.effects   — additive deltas to vars (clamped to each var's range).
     • choice.memory    — deltas to stakeholder relationship memory.
     • choice.sets      — boolean/scalar flags the world remembers.
     • choice.commit    — long-term commitments the engine checks later.
     • choice.ops(run)  — ESCAPE HATCH for arbitrary role-specific transitions
                          (e.g. a CEO cap-table dilution, a billionaire asset
                          sale). Reads/writes run.custom freely.
     • choice.seeds     — delayed consequences planted now, fired weeks later.
     • pack.derive(run) — optional: recompute derived vars after every step
                          (e.g. netWorth = cash + Σ holdings).
*/
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaATL = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Evaluate a seed's fire condition against the current run (fire-time check,
  // so a consequence only lands if its precondition still holds — e.g. "fans
  // turn on you ONLY IF your credibility is still low when it would surface").
  function condOk(cond, run) {
    if (!cond) return true;                      // unconditional seed
    if (typeof cond === 'function') return !!cond(run);
    // declarative: {var,op,value} or {flag,is}
    if (cond.flag) return !!run.flags[cond.flag] === (cond.is !== false);
    const cur = run.vars[cond.var];
    switch (cond.op) {
      case '<':  return cur <  cond.value;
      case '<=': return cur <= cond.value;
      case '>':  return cur >  cond.value;
      case '>=': return cur >= cond.value;
      case '==': return cur === cond.value;
      default:   return false;
    }
  }

  function applyEffects(pack, run, effects) {
    if (!effects) return;
    for (const k of Object.keys(effects)) {
      const def = pack.vars[k];
      if (!def) continue;                        // ignore unknown var keys
      run.vars[k] = clamp((run.vars[k] || 0) + effects[k], def.min, def.max);
    }
  }

  function applyMemory(run, mem) {
    if (!mem) return;
    for (const who of Object.keys(mem)) {
      run.memory[who] = (run.memory[who] || 0) + mem[who];
    }
  }

  // Fire every armed seed whose fireWeek has arrived and whose condition holds.
  // Seeds whose condition no longer holds quietly expire (they never happened).
  function fireDueSeeds(pack, run, uptoWeek) {
    for (const s of run.seeds) {
      if (s.status !== 'armed') continue;
      if (s.fireWeek > uptoWeek) continue;
      if (condOk(s.cond, run)) {
        applyEffects(pack, run, s.effects);
        applyMemory(run, s.memory);
        s.status = 'fired';
        s.firedWeek = uptoWeek;
        run.fired.push(s);                       // chronological record for the Reckoning trace
      } else {
        s.status = 'expired';
      }
    }
  }

  function createRun(pack) {
    const vars = {}, start = {};
    for (const k of Object.keys(pack.vars)) { vars[k] = pack.vars[k].start; start[k] = pack.vars[k].start; }
    const memory = {};
    for (const who of (pack.stakeholders || [])) memory[who] = 0;
    const first = pack.events[pack.startEvent];
    const run = {
      packId: pack.id, role: pack.role, title: pack.title,
      horizonWeeks: pack.horizonWeeks,
      week: first.week,
      vars, start, memory,
      flags: {}, commitments: [],
      seeds: [], fired: [], history: [],
      custom: {},                                // role-specific scratch (cap tables, portfolios…)
      currentEventId: pack.startEvent,
      ended: false, ending: null,
    };
    if (pack.derive) pack.derive(run);
    return run;
  }

  const currentEvent = (pack, run) => (run.ended ? null : pack.events[run.currentEventId] || null);
  const isEnded = (run) => !!run.ended;

  function choose(pack, run, choiceId) {
    if (run.ended) throw new Error('Run has already ended');
    const ev = pack.events[run.currentEventId];
    if (!ev) throw new Error('No current event: ' + run.currentEventId);
    const choice = (ev.choices || []).find(c => c.id === choiceId);
    if (!choice) throw new Error('Unknown choice "' + choiceId + '" at ' + run.currentEventId);

    // 1) immediate consequences, in a stable order
    applyEffects(pack, run, choice.effects);
    applyMemory(run, choice.memory);
    if (choice.sets) Object.assign(run.flags, choice.sets);
    if (choice.commit) run.commitments.push(...(Array.isArray(choice.commit) ? choice.commit : [choice.commit]));
    if (typeof choice.ops === 'function') choice.ops(run);        // role-specific escape hatch

    // 2) plant delayed consequences
    const planted = [];
    for (const spec of (choice.seeds || [])) {
      run.seeds.push(Object.assign({ status: 'armed' }, spec));
      planted.push(spec.id);
    }

    // 3) remember exactly what the player did (drives the Reckoning trace)
    run.history.push({
      eventId: run.currentEventId, week: run.week,
      choiceId, label: choice.label, reaction: choice.reaction || '',
      arc: ev.arc || '', planted,
    });

    if (pack.derive) pack.derive(run);

    // 4) advance time / resolve the next situation from state + history
    const next = typeof choice.next === 'function' ? choice.next(run) : choice.next;
    if (!next || next === 'END') {
      fireDueSeeds(pack, run, pack.horizonWeeks);  // settle remaining commitments at year-end
      if (pack.derive) pack.derive(run);
      run.ended = true;
      run.ending = resolveEnding(pack, run);
      return run;
    }
    const nextEv = pack.events[next];
    if (!nextEv) throw new Error('Choice points to missing event: ' + next);
    run.currentEventId = next;
    run.week = nextEv.week;                       // time moves forward
    fireDueSeeds(pack, run, run.week);            // delayed consequences surface as time passes
    if (pack.derive) pack.derive(run);
    return run;
  }

  function resolveEnding(pack, run) {
    const ctx = {
      vars: run.vars, flags: run.flags, memory: run.memory,
      fired: run.fired.map(f => f.id), run,
    };
    for (const e of pack.endings) {
      if (e.test(ctx)) {
        return {
          id: e.id, title: e.title, emoji: e.emoji || '🎬',
          blurb: typeof e.blurb === 'function' ? e.blurb(ctx) : e.blurb,
          share: e.share ? (typeof e.share === 'function' ? e.share(ctx) : e.share) : '',
        };
      }
    }
    const last = pack.endings[pack.endings.length - 1];
    return { id: last.id, title: last.title, emoji: last.emoji || '🎬',
      blurb: typeof last.blurb === 'function' ? last.blurb(ctx) : last.blurb, share: '' };
  }

  // The 3–5 decisions that actually mattered: the opener, the finale, and any
  // choice that planted a consequence which later fired (cause → effect).
  function pivotalDecisions(run) {
    const firedByCause = {};
    for (const f of run.fired) firedByCause[f.id] = f;
    const picks = [];
    run.history.forEach((h, i) => {
      const firstOrLast = (i === 0) || (i === run.history.length - 1);
      const causedFired = h.planted.filter(id => firedByCause[id]);
      if (firstOrLast || causedFired.length) {
        let why;
        if (causedFired.length) why = firedByCause[causedFired[0]].note;
        else if (i === 0) why = 'This opening move set your whole year in motion.';
        else why = 'Your closing move for the year.';
        picks.push({ week: h.week, label: h.label, why });
      }
    });
    // de-dup by week+label, cap at 5 (keep opener, then most consequential, then finale)
    const seen = new Set(); const out = [];
    for (const p of picks) { const k = p.week + '|' + p.label; if (seen.has(k)) continue; seen.add(k); out.push(p); }
    return out.slice(0, 5);
  }

  function reckoning(pack, run) {
    const deltas = Object.keys(pack.vars).map(k => ({
      key: k, label: pack.vars[k].label, emoji: pack.vars[k].emoji || '',
      fmt: pack.vars[k].fmt || 'num', min: pack.vars[k].min, max: pack.vars[k].max,
      start: run.start[k], end: run.vars[k], change: run.vars[k] - run.start[k],
    }));
    const surprises = run.fired.map(f => ({ week: f.firedWeek, note: f.note, cause: f.cause }));
    return {
      role: run.role, title: run.title, weeks: pack.horizonWeeks,
      ending: run.ending, deltas, surprises,
      pivotal: pivotalDecisions(run),
      commitments: run.commitments.slice(),
    };
  }

  return { createRun, currentEvent, choose, isEnded, reckoning, resolveEnding, pivotalDecisions, clamp };
});
