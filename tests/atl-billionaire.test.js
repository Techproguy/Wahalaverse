// Deterministic tests for the Billionaire Life role pack on the shared engine.
// Run with: npm run test:unit
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../atl-engine.js');
const PACK = require('../atl-pack-billionaire.js');

function play(seq) { const r = E.createRun(PACK); for (const id of seq) E.choose(PACK, r, id); return r; }

const DYNASTY = ['A', 'D', 'H', 'J', 'M', 'Q', 'V'];
const LIQUIDITY = ['B', 'F', 'G', 'K', 'N', 'R', 'T']; // leverage + hold through the crash
const CASHOUT = ['A', 'E', 'I', 'J', 'O', 'P', 'U'];
const PRUDENT = ['A', 'E', 'H', 'J', 'M', 'P', 'S'];

test('SIGNATURE: starts rich on PAPER but poor in CASH', () => {
  const run = E.createRun(PACK);
  assert.ok(run.vars.netWorth > 90000000000, 'net worth ~₦95bn');
  assert.equal(run.vars.liquidCash, 500000000, 'only ₦500m liquid');
  assert.ok(run.vars.netWorth > run.vars.liquidCash * 100, 'paper wealth dwarfs cash');
});

test('a ₦2bn cash call forces a real trade-off (sell a holding OR take on debt)', () => {
  const sell = E.createRun(PACK); const before = sell.custom.portfolio.find(h => h.id === 'publicStake').value;
  E.choose(PACK, sell, 'A');
  assert.ok(sell.custom.portfolio.find(h => h.id === 'publicStake').value < before, 'sold part of the stake');
  const borrow = E.createRun(PACK);
  E.choose(PACK, borrow, 'B');
  assert.equal(borrow.vars.debt, 2000000000, 'or took on debt instead');
});

test('Billionaire variables are capital/ownership metrics (distinct from Founder/CEO)', () => {
  assert.deepEqual(Object.keys(PACK.vars).sort(),
    ['debt', 'familyTrust', 'influence', 'legalExposure', 'liquidCash', 'netWorth'].sort());
});

test('net worth is DERIVED from cash + holdings − debt', () => {
  const S = require('../atl-systems.js');
  const run = play(DYNASTY);
  assert.equal(run.vars.netWorth, S.netWorth(run.vars.liquidCash, run.custom.portfolio, run.vars.debt));
});

test('SIGNATURE liquidity crisis: huge net worth, ~zero cash, margin-called', () => {
  const run = play(LIQUIDITY);
  assert.equal(run.ending.id, 'liquidity_crisis');
  assert.ok(run.vars.netWorth >= 40000000000, 'still a paper fortune');
  assert.ok(run.vars.liquidCash < 500000000, 'but basically no cash');
  assert.ok(run.fired.some(f => f.id === 'S_margincall'), 'leverage triggered a margin call');
});

test('DELAYED consequences trace back to leverage', () => {
  const run = play(LIQUIDITY);
  const mc = run.fired.find(f => f.id === 'S_margincall');
  assert.ok(mc && mc.firedWeek > 1 && /margin|lever|dip|loan/i.test(mc.cause));
});

test('DIVERGENT outcomes: preserve vs over-lever vs cash out', () => {
  assert.equal(play(DYNASTY).ending.id, 'dynasty');
  assert.equal(play(CASHOUT).ending.id, 'cashed_out');
  assert.equal(play(PRUDENT).ending.id, 'steady_fortune');
  assert.notEqual(play(DYNASTY).ending.id, play(LIQUIDITY).ending.id);
});

test('cashing out converts the empire to liquid cash', () => {
  const run = play(CASHOUT);
  assert.ok(run.vars.liquidCash > 40000000000, 'mostly cash now');
  const S = require('../atl-systems.js');
  assert.ok(S.pfValue(run.custom.portfolio) < 1000000000, 'holdings liquidated');
});

test('deterministic: same choices -> identical net worth and ending', () => {
  const a = play(LIQUIDITY), b = play(LIQUIDITY);
  assert.equal(a.vars.netWorth, b.vars.netWorth);
  assert.equal(a.ending.id, b.ending.id);
});

test('Reckoning explains the fortune (deltas, traced surprises, pivotal decisions)', () => {
  const r = E.reckoning(PACK, play(LIQUIDITY));
  assert.equal(r.deltas.length, Object.keys(PACK.vars).length);
  assert.ok(r.surprises.length >= 1 && r.surprises.every(s => s.cause && s.note));
  assert.ok(r.pivotal.length >= 2 && r.pivotal.every(p => p.label && p.why));
});
