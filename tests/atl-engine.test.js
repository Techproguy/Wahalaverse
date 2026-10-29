// Deterministic tests for the "Assume Their Life" engine + Afrobeats role pack.
// Run with: npm run test:unit  (node --test). No browser, no network, no randomness.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../atl-engine.js');
const PACK = require('../atl-pack-afrobeats.js');

// Helper: play a fixed sequence of choice ids from a fresh run.
function play(seq) {
  const run = E.createRun(PACK);
  for (const id of seq) E.choose(PACK, run, id);
  return run;
}

// Two reference playthroughs (also documented in the design doc):
const CHASE_THE_BAG = ['A', 'A1', 'F1', 'D2', 'G2']; // sign 360 -> pop single -> beef -> double down -> hold album
const BUILD_IT_RIGHT = ['B', 'B1', 'F2', 'D3', 'G1']; // independent -> keep team -> humble -> go dark -> drop album

test('a fresh run starts at E1 with the pack’s starting state', () => {
  const run = E.createRun(PACK);
  assert.equal(run.currentEventId, 'E1');
  assert.equal(run.week, 1);
  assert.equal(run.vars.control, 90);
  assert.equal(run.vars.cash, 250000);
  assert.equal(run.ended, false);
  assert.deepEqual(run.fired, []);
});

test('state transitions apply the chosen effects (and time moves forward)', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'A'); // sign the 360 deal
  assert.equal(run.vars.cash, 15250000);   // +15,000,000
  assert.equal(run.vars.control, 45);      // -45
  assert.equal(run.vars.buzz, 87);         // +15
  assert.equal(run.flags.signed360, true);
  assert.equal(run.week, 3);               // advanced E1(w1) -> E2A(w3)
  assert.equal(run.currentEventId, 'E2A');
  assert.equal(run.commitments.length, 1); // "deliver album in 12 months"
});

test('variables are clamped to each var’s range (no overflow, never negative cash)', () => {
  const run = play(CHASE_THE_BAG);
  for (const k of Object.keys(PACK.vars)) {
    assert.ok(run.vars[k] >= PACK.vars[k].min, `${k} >= min`);
    assert.ok(run.vars[k] <= PACK.vars[k].max, `${k} <= max`);
  }
  // buzz was pushed well past 100 (72+15+10+12...) — it must cap at 100, not exceed.
  const peak = E.createRun(PACK);
  E.choose(PACK, peak, 'A'); E.choose(PACK, peak, 'A1'); E.choose(PACK, peak, 'F1');
  assert.equal(peak.vars.buzz, 100, 'buzz clamps at 100');
});

test('DELAYED consequence: a seed planted early fires weeks later and traces back', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'A');   // week 1: nothing fired yet
  E.choose(PACK, run, 'A1');  // week 3: plants S_sellout (fires W14 if cred<55); cred now 53
  assert.equal(run.fired.length, 0, 'nothing has fired at week 3');
  E.choose(PACK, run, 'F1');  // advances to E4 (week 20) -> due seeds fire
  const sellout = run.fired.find(f => f.id === 'S_sellout');
  assert.ok(sellout, 'S_sellout fired');
  assert.ok(sellout.firedWeek > 3, 'it fired AFTER the week it was planted (delayed)');
  assert.match(sellout.cause, /pop single/, 'the consequence names the earlier action that caused it');
});

test('AT LEAST TWO delayed consequences fire and are traceable in one run', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'A'); E.choose(PACK, run, 'A1'); E.choose(PACK, run, 'F1');
  const ids = run.fired.map(f => f.id);
  assert.ok(ids.includes('S_sellout'), 'sellout fired');
  assert.ok(ids.includes('S_beefescalates'), 'beef cascade fired');
  assert.ok(run.fired.length >= 2, 'two or more delayed consequences');
  // every fired consequence carries a human-readable cause for the Reckoning trace
  for (const f of run.fired) assert.ok(f.cause && f.note, 'fired seed has cause + note');
});

test('a seed whose condition no longer holds EXPIRES instead of firing', () => {
  // On the "build it right" path energy never drops below 45, so S_burnout (planted
  // by choice B) must expire, not fire.
  const run = play(BUILD_IT_RIGHT);
  const burnout = run.seeds.find(s => s.id === 'S_burnout');
  assert.ok(burnout, 'burnout seed was planted');
  assert.equal(burnout.status, 'expired');
  assert.ok(!run.fired.some(f => f.id === 'S_burnout'));
});

test('a broken year-end COMMITMENT fires at the horizon (engine remembers promises)', () => {
  // Chase-the-bag signs the 360 (promising an album in 12 months) but HOLDS the
  // album at the finale -> the album-dispute seed must fire at week 52.
  const run = play(CHASE_THE_BAG);
  const dispute = run.fired.find(f => f.id === 'S_albumdispute');
  assert.ok(dispute, 'album-dispute consequence fired at year-end');
  assert.equal(dispute.firedWeek, 52);
});

test('DIVERGENT OUTCOMES: different early decisions produce different endings', () => {
  const bag = play(CHASE_THE_BAG);
  const right = play(BUILD_IT_RIGHT);
  assert.ok(bag.ended && right.ended);
  assert.notEqual(bag.ending.id, right.ending.id);
  assert.equal(bag.ending.id, 'cancelled');        // reputation cascade caught up
  assert.equal(right.ending.id, 'global_breakout'); // kept team + ownership + humility
});

test('the engine is deterministic: same choices -> identical final state', () => {
  const a = play(CHASE_THE_BAG);
  const b = play(CHASE_THE_BAG);
  assert.deepEqual(a.vars, b.vars);
  assert.deepEqual(a.fired.map(f => f.id), b.fired.map(f => f.id));
  assert.equal(a.ending.id, b.ending.id);
});

test('player AGENCY: declining/stepping back is a real, valid path with consequences', () => {
  // Choose the "hold out" (decline) and "step back to protect your peace" actions.
  const run = play(['C', 'C2', 'F3', 'D3', 'G4']);
  assert.ok(run.ended);
  assert.ok(run.vars.energy > E.createRun(PACK).vars.energy, 'stepping back preserved energy');
  assert.ok(run.ending && run.ending.id, 'a declining path still reaches a real ending');
});

test('Reckoning explains WHAT happened, WHY, and WHICH decisions mattered', () => {
  const run = play(CHASE_THE_BAG);
  const r = E.reckoning(PACK, run);
  // what happened: before/after per variable
  assert.equal(r.deltas.length, Object.keys(PACK.vars).length);
  const cash = r.deltas.find(d => d.key === 'cash');
  assert.equal(cash.start, 250000);
  assert.equal(cash.end, run.vars.cash);
  // why: the surprises are the delayed consequences, each with a cause
  assert.ok(r.surprises.length >= 2);
  assert.ok(r.surprises.every(s => s.cause && s.note));
  // which decisions mattered: 3–5 pivotal choices incl. an explanation
  assert.ok(r.pivotal.length >= 2 && r.pivotal.length <= 5);
  assert.ok(r.pivotal.every(p => p.label && p.why));
  // the ending is explainable
  assert.ok(r.ending.title && r.ending.blurb);
});

test('stakeholder memory accumulates across decisions', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'B');   // memory.producer +1, manager +1
  E.choose(PACK, run, 'B1');  // memory.producer +3, manager +2, oldSquad +2
  assert.equal(run.memory.producer, 4);
  assert.equal(run.memory.manager, 3);
  assert.equal(run.memory.oldSquad, 2);
});

test('the role pack exposes six interacting variables', () => {
  const keys = Object.keys(PACK.vars);
  assert.deepEqual(keys.sort(), ['buzz', 'cash', 'cred', 'control', 'energy', 'fans'].sort());
});
