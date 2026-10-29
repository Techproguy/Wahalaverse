// Deterministic tests for the Founder Life role pack on the shared engine.
// Run with: npm run test:unit
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../atl-engine.js');
const PACK = require('../atl-pack-founder.js');

function play(seq) {
  const run = E.createRun(PACK);
  for (const id of seq) E.choose(PACK, run, id);
  return run;
}

// Reference paths (verified): the cap table makes two "sell the company" runs
// end in completely different founder outcomes.
const DILUTED = ['B', 'D', 'H', 'K', 'M', 'R', 'T']; // aggressive 3x-pref round + small exit
const SCALED  = ['A', 'D', 'G', 'L', 'N', 'Q', 'T']; // solo, clean round, big exit
const PROFITABLE = ['A', 'D', 'G', 'L', 'P', 'Q', 'V']; // bootstrap-ish, stay independent
const FOLD = ['A', 'D', 'H', 'K', 'P', 'R', 'W'];

test('fresh Founder run starts at E1 with 100% ownership and formation state', () => {
  const run = E.createRun(PACK);
  assert.equal(run.currentEventId, 'E1');
  assert.equal(run.vars.ownership, 100);
  assert.equal(run.vars.cash, 3000000);
});

test('six interacting Founder variables are declared', () => {
  assert.deepEqual(Object.keys(PACK.vars).sort(),
    ['cash', 'morale', 'ownership', 'team', 'traction', 'wellbeing'].sort());
});

test('CAP TABLE: raising money dilutes founder ownership (derived var updates)', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'A');           // solo -> 100%
  assert.equal(run.vars.ownership, 100);
  E.choose(PACK, run, 'E');           // angel ₦20m @ ₦80m pre -> ~80%
  assert.equal(run.vars.ownership, 80);
  assert.ok(run.custom.cap.holders.some(h => h.id === 'angel'));
});

test('DELAYED consequences: two seeds fire later and trace back to earlier choices', () => {
  const run = play(DILUTED);
  const ids = run.fired.map(f => f.id);
  assert.ok(ids.includes('S_nopmf'), 'no-PMF consequence fired');
  assert.ok(ids.includes('S_liqpref'), 'liquidation-preference consequence fired');
  assert.ok(run.fired.length >= 2);
  for (const f of run.fired) { assert.ok(f.cause && f.note); assert.ok(f.firedWeek > 1); }
});

test('SIGNATURE: 3x liquidation preference leaves the founder with crumbs on a real exit', () => {
  const run = play(DILUTED);
  assert.equal(run.ending.id, 'diluted_to_nothing');
  assert.ok(run.custom.exitValue > 200000000, 'a real exit happened');
  assert.ok(run.custom.founderProceeds < run.custom.exitValue * 0.15, 'founder got <15% of it');
});

test('DIVERGENT outcomes: same "sell" finale, opposite founder results via the cap table', () => {
  const diluted = play(DILUTED);
  const scaled = play(SCALED);
  assert.equal(diluted.ending.id, 'diluted_to_nothing');
  assert.equal(scaled.ending.id, 'venture_scaled');
  assert.ok(scaled.custom.founderProceeds > diluted.custom.founderProceeds * 10);
});

test('more divergence: staying independent vs folding reach distinct endings', () => {
  assert.equal(play(PROFITABLE).ending.id, 'profitable_independent');
  assert.equal(play(FOLD).ending.id, 'folded');
});

test('player AGENCY: not raising at all keeps 100% ownership (no dilution)', () => {
  const run = play(['A', 'D', 'G', 'K', 'P', 'Q', 'V']); // never takes outside equity
  assert.equal(run.vars.ownership, 100);
});

test('deterministic: same choices -> identical ownership, proceeds and ending', () => {
  const a = play(DILUTED), b = play(DILUTED);
  assert.deepEqual(a.vars, b.vars);
  assert.equal(a.custom.founderProceeds, b.custom.founderProceeds);
  assert.equal(a.ending.id, b.ending.id);
});

test('Reckoning explains the Founder run (deltas, traced surprises, pivotal decisions)', () => {
  const run = play(DILUTED);
  const r = E.reckoning(PACK, run);
  assert.equal(r.deltas.length, Object.keys(PACK.vars).length);
  assert.ok(r.surprises.length >= 2 && r.surprises.every(s => s.cause && s.note));
  assert.ok(r.pivotal.length >= 2 && r.pivotal.every(p => p.label && p.why));
  assert.ok(r.ending.title && r.ending.blurb);
});

test('cofounder stakeholder memory accumulates', () => {
  const run = E.createRun(PACK);
  E.choose(PACK, run, 'B'); // +2 cofounder
  assert.equal(run.memory.cofounder, 2);
});
