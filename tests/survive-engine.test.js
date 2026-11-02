// Deterministic tests for Survive Naija 2.0 (engine + "7 Days to Payday" pack).
// Run with: npm run test:unit  (node --test). Seeded — no Date, no Math.random.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../survive-engine.js');
const PACK = require('../survive-pack-payday.js');

const opt = (o, id) => o.find((x) => x.id === id);
const anyEv = (o) => o.find((x) => x.id.startsWith('ev:'));

// Drive a full run with a policy (returns the finished run + whether a setback occurred).
function play(seed, policy) {
  const run = E.createRun(PACK, { seed });
  let guard = 0, setback = false;
  while (!run.ended && guard++ < 400) {
    if (run.log.some((l) => l.setbacks.length)) setback = true;
    const opts = E.options(PACK, run).filter((o) => !o.disabled);
    const mand = run.today.events.find((ev) => ev.mandatory && !ev.resolved);
    let pick = null;
    if (mand) pick = opts.find((o) => o.id.startsWith('ev:' + mand.id + ':'));
    if (!pick) pick = policy(run, opts);
    if (pick) E.choose(PACK, run, pick.id); else E.endDay(PACK, run);
  }
  return { run, setback: setback || run.log.some((l) => l.setbacks.length) };
}
const greedy = (r, o) => opt(o, 'act:work') || (r.res.food <= 1 && opt(o, 'act:buyfood')) || (r.res.cash < 4000 && opt(o, 'act:hustle')) || (r.res.wellbeing < 40 && opt(o, 'act:rest')) || anyEv(o) || null;
const careful = (r, o) => {
  if (r.res.wellbeing < 55 && opt(o, 'act:rest')) return opt(o, 'act:rest');
  if (E.socialSupport(r) < 62) { for (const a of ['npc:mummy_greet', 'npc:mama_greet', 'npc:chidi_hang']) if (opt(o, a)) return opt(o, a); }
  if (r.res.food <= 1 && opt(o, 'act:buyfood')) return opt(o, 'act:buyfood');
  if (!r.today.done.work && r.day <= 5 && opt(o, 'act:work')) return opt(o, 'act:work');
  if (r.res.cash < 30000 && opt(o, 'act:hustle')) return opt(o, 'act:hustle');
  return anyEv(o) || null;
};
const skipWork = (r, o) => (r.res.wellbeing < 35 && opt(o, 'act:rest')) || anyEv(o) || opt(o, 'act:hustle') || null;

test('starts broke and scarce (not a ₦180k buffer) — survival is real', () => {
  const r = E.createRun(PACK, { seed: 1 });
  assert.equal(r.res.cash, 9000);
  assert.equal(r.res.food, 3);
  assert.equal(r.day, 1);
  assert.ok(E.options(PACK, r).length > 0);
});

test('REPRODUCIBLE: same seed + same choices -> identical final state and ending', () => {
  const a = play(5, greedy).run, b = play(5, greedy).run;
  assert.deepEqual(a.res, b.res);
  assert.equal(a.outcome.id, b.outcome.id);
  assert.deepEqual(a.fired.map((f) => f.id), b.fired.map((f) => f.id));
});

test('TWO RUNS DIFFER: different seeds produce substantially different experiences', () => {
  const a = play(1, greedy).run, b = play(3, greedy).run;
  const diff = a.outcome.id !== b.outcome.id
    || JSON.stringify(a.res) !== JSON.stringify(b.res)
    || a.fired.map((f) => f.id).sort().join() !== b.fired.map((f) => f.id).sort().join();
  assert.ok(diff, 'seed 1 and seed 3 should differ');
});

test('ACTUAL QUANTITIES: food is meals (consumed overnight); buying food adds meals + costs cash', () => {
  const r = E.createRun(PACK, { seed: 1 });
  const f0 = r.res.food, c0 = r.res.cash;
  E.choose(PACK, r, 'act:buyfood');
  assert.equal(r.res.food, f0 + 4);
  assert.equal(r.res.cash, c0 - 3000);
  const f1 = r.res.food;
  E.endDay(PACK, r);              // overnight eats one meal
  assert.equal(r.res.food, f1 - 1);
});

test('WORK matters (livelihood), not just cash: going to work raises the job meter', () => {
  const r = E.createRun(PACK, { seed: 1 });
  const lv = r.res.livelihood;
  E.choose(PACK, r, 'act:work');
  assert.ok(r.res.livelihood > lv);
  assert.equal(r.today.done.work, true);
  assert.equal(r.counters.workedDays, 1);
});

test('LIVELIHOOD can be lost: never going to work -> Sacked (cash alone does not save you)', () => {
  assert.equal(play(1, skipWork).run.outcome.id, 'sacked');
});

test('RELATIONSHIPS are memory: greeting an NPC builds goodwill and derived support, and it persists', () => {
  const r = E.createRun(PACK, { seed: 1 });
  const s0 = E.socialSupport(r);
  E.choose(PACK, r, 'npc:mama_greet');
  assert.ok(r.npcs.mama.goodwill >= 2);
  assert.ok(E.socialSupport(r) > s0);
  const gw = r.npcs.mama.goodwill;
  E.endDay(PACK, r);
  assert.equal(r.npcs.mama.goodwill, gw); // remembered across days
});

test('DELAYED consequence: a Day-1 decision fires later and is traceable', () => {
  const r = E.createRun(PACK, { seed: 2 });
  E.choose(PACK, r, 'npc:mama_credit');                  // take food on credit (plants mama_due @ day+3)
  assert.ok(r.seeds.some((s) => s.id === 'mama_due' && s.status === 'armed'));
  for (let i = 0; i < 4; i++) if (!r.ended) E.endDay(PACK, r); // advance past the due day
  const due = r.fired.find((f) => f.id === 'mama_due');
  assert.ok(due, 'the credit came due later');
  assert.ok(due.note && due.cause, 'the consequence carries a human-readable cause');
});

test('RECOVERABLE setback: you can hit rock bottom (collapse) and still reach an ending', () => {
  // Grind with no eating/resting to force a wellbeing collapse, then keep going to payday.
  const r = E.createRun(PACK, { seed: 4 });
  let guard = 0;
  while (!r.ended && guard++ < 400) {
    const o = E.options(PACK, r).filter((x) => !x.disabled);
    const pick = opt(o, 'act:work') || opt(o, 'act:hustle') || anyEv(o);
    if (pick) E.choose(PACK, r, pick.id); else E.endDay(PACK, r);
  }
  assert.ok(r.log.some((l) => l.setbacks.some((s) => s.id === 'collapse')), 'a collapse setback occurred');
  assert.ok(r.ended && r.outcome, 'the run still completed with an outcome (recovered, not game-over)');
});

test('OPPORTUNITY/SUPPORT matter: careful play can reach a non-cash premium ending', () => {
  const outs = new Set();
  for (let s = 1; s <= 12; s++) outs.add(play(s, careful).run.outcome.id);
  assert.ok(outs.has('soft_life') || outs.has('community'), 'relationships/wellbeing open better endings than cash alone');
});

test('AP economy: a day has limited moves; an action spends energy', () => {
  const r = E.createRun(PACK, { seed: 1 });
  const before = r.ap - r.apUsed;
  E.choose(PACK, r, 'act:rest'); // cost ap 1
  assert.equal((r.ap - r.apUsed), before - 1);
});

test('Reckoning explains the week (indicators, people, traced surprises, outcome)', () => {
  const r = play(1, greedy).run;
  const rec = E.reckoning(PACK, r);
  assert.equal(rec.indicators.length, PACK.indicators.length);
  assert.ok(rec.people.length === PACK.npcs.length);
  assert.ok(rec.outcome && rec.outcome.title && rec.outcome.blurb);
  if (rec.surprises.length) assert.ok(rec.surprises.every((s) => s.note && s.cause));
});

test('SAVE/RESUME: a run survives JSON round-trip (pure data) and continues identically', () => {
  // play a few moves, serialise mid-run, then finish both copies with the same policy.
  const live = E.createRun(PACK, { seed: 6 });
  for (let i = 0; i < 6 && !live.ended; i++) {
    const o = E.options(PACK, live).filter((x) => !x.disabled);
    const pick = greedy(live, o); if (pick) E.choose(PACK, live, pick.id); else E.endDay(PACK, live);
  }
  const saved = JSON.parse(JSON.stringify(live)); // what localStorage would store
  assert.ok(!/function/.test(JSON.stringify(live)), 'no functions leak into the serialised run');
  const finish = (run) => { let g = 0; while (!run.ended && g++ < 400) { const o = E.options(PACK, run).filter((x) => !x.disabled); const p = greedy(run, o); if (p) E.choose(PACK, run, p.id); else E.endDay(PACK, run); } return run; };
  const a = finish(live), b = finish(saved);
  assert.deepEqual(a.res, b.res);
  assert.equal(a.outcome.id, b.outcome.id); // resumed run behaves exactly like the live one
});

test('BETA scenarios (Hustle, Campus) run on the same engine to a reproducible ending', () => {
  for (const pf of ['../survive-pack-hustle.js', '../survive-pack-campus.js']) {
    const P = require(pf);
    const run = (seed) => { const r = E.createRun(P, { seed }); let g = 0; while (!r.ended && g++ < 400) { const o = E.options(P, r).filter((x) => !x.disabled); const m = r.today.events.find((ev) => ev.mandatory && !ev.resolved); const p = (m && o.find((x) => x.id.indexOf('ev:' + m.id + ':') === 0)) || o.find((x) => x.id.startsWith('act:')) || o.find((x) => x.id.startsWith('ev:')); if (p) E.choose(P, r, p.id); else E.endDay(P, r); } return r; };
    const a = run(5), b = run(5);
    assert.ok(a.ended && a.outcome && a.outcome.title, P.title + ' reaches an ending');
    assert.equal(a.outcome.id, b.outcome.id); // reproducible
    assert.equal(a.res.cash, b.res.cash);
  }
});

test('ENDING SPREAD: greedy across seeds yields more than one outcome', () => {
  const outs = new Set();
  for (let s = 1; s <= 10; s++) outs.add(play(s, greedy).run.outcome.id);
  assert.ok(outs.size >= 2, 'outcomes vary by seed');
});
