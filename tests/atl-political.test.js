// Deterministic tests for the Political Leadership role pack on the shared engine.
// Run with: npm run test:unit
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../atl-engine.js');
const S = require('../atl-systems.js');
const PACK = require('../atl-pack-political.js');

function play(seq) { const r = E.createRun(PACK); for (const id of seq) E.choose(PACK, r, id); return r; }

const REFORMER = ['C', 'D', 'I', 'K', 'O', 'R', 'S'];
const INSTITUTION = ['C', 'D', 'I', 'K', 'M', 'R', 'S'];
const APPROVE_NO_IMPL = ['B', 'D', 'I', 'K', 'M', 'P', 'U'];
const FISCAL_RUIN = ['A', 'E', 'G', 'L', 'O', 'Q', 'T'];

test('Political variables are governance metrics (distinct from the business roles)', () => {
  assert.deepEqual(Object.keys(PACK.vars).sort(),
    ['approval', 'coalition', 'institutionsTrust', 'serviceDelivery', 'treasury', 'unrest'].sort());
});

test('legislativeVote respects the numbers: passes with support, fails without', () => {
  const leg = { gov: 40, opp: 35, ind: 25 }; // 100 seats, majority 51
  assert.equal(S.legislativeVote(leg, 80).passed, true);
  assert.equal(S.legislativeVote(leg, 30).passed, false); // can't win enough independents
  assert.equal(S.legislativeVote(leg, 80).majority, 51);
});

test('CONSTRAINT — a popular choice is not automatically affordable (budget bites)', () => {
  const run = E.createRun(PACK);
  const t0 = run.vars.treasury;
  E.choose(PACK, run, 'A'); // big popular spend
  assert.ok(run.vars.treasury < t0, 'popular spending drains the treasury');
  // and over a spendthrift year it ends in fiscal ruin despite high approval
  const ruin = play(FISCAL_RUIN);
  assert.equal(ruin.ending.id, 'fiscal_ruin');
  assert.ok(ruin.vars.approval >= 55, 'still popular…');
  assert.ok(ruin.vars.treasury <= 0, '…but the money is gone');
});

test('CONSTRAINT — approving a reform does NOT guarantee implementation', () => {
  const run = play(APPROVE_NO_IMPL);
  assert.equal(run.flags.reformPassed, true, 'the reform passed the house');
  assert.ok(run.fired.some(f => f.id === 'S_implementfail'), 'but weak capacity failed to implement it');
  assert.ok(run.vars.serviceDelivery < 50, 'service delivery never materialised');
});

test('state CAPACITY scales how much a passed reform actually delivers', () => {
  const hi = E.createRun(PACK); E.choose(PACK, hi, 'C'); const svc0 = hi.vars.serviceDelivery; E.choose(PACK, hi, 'D'); // capacity 70
  const lo = E.createRun(PACK); E.choose(PACK, lo, 'B'); E.choose(PACK, lo, 'D'); // capacity 45
  assert.ok(hi.custom.capacity > lo.custom.capacity);
  assert.ok((hi.vars.serviceDelivery - svc0) >= (lo.vars.serviceDelivery - 40), 'more capacity -> more delivery from the same law');
});

test('DIVERGENT outcomes across governing styles', () => {
  assert.equal(play(REFORMER).ending.id, 'reformer');
  assert.equal(play(INSTITUTION).ending.id, 'institution_builder');
  assert.equal(play(FISCAL_RUIN).ending.id, 'fiscal_ruin');
  assert.notEqual(play(REFORMER).ending.id, play(FISCAL_RUIN).ending.id);
});

test('DELAYED consequences trace back to earlier governing choices', () => {
  const run = play(FISCAL_RUIN);
  assert.ok(run.fired.length >= 1 && run.fired.every(f => f.cause && f.note && f.firedWeek > 1));
});

test('deterministic: same choices -> identical treasury, delivery and ending', () => {
  const a = play(REFORMER), b = play(REFORMER);
  assert.deepEqual(a.vars, b.vars);
  assert.equal(a.ending.id, b.ending.id);
});

test('Reckoning explains the term (deltas, traced surprises, pivotal decisions)', () => {
  const r = E.reckoning(PACK, play(APPROVE_NO_IMPL));
  assert.equal(r.deltas.length, Object.keys(PACK.vars).length);
  assert.ok(r.surprises.every(s => s.cause && s.note));
  assert.ok(r.pivotal.length >= 2 && r.pivotal.every(p => p.label && p.why));
  assert.ok(r.ending.title && r.ending.blurb);
});
