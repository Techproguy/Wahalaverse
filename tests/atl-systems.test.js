// Deterministic tests for the shared role sub-systems (cap table).
// Run with: npm run test:unit
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../atl-systems.js');

test('capFound + capOwnership: a 50/50 split is 50% each', () => {
  const cap = S.capFound([{ id: 'founder', shares: 500000 }, { id: 'cofounder', shares: 500000 }]);
  assert.equal(S.capOwnership(cap, 'founder'), 0.5);
  assert.equal(S.capOwnership(cap, 'cofounder'), 0.5);
});

test('capRaise dilutes everyone pro-rata (₦20m at ₦80m pre = 20% to the investor)', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'angel', amount: 20000000, preMoney: 80000000, prefMult: 1 });
  assert.equal(Math.round(S.capOwnership(cap, 'angel') * 100), 20);
  assert.equal(Math.round(S.capOwnership(cap, 'founder') * 100), 80);
});

test('capPool creates a 10% option pool, diluting existing holders', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capPool(cap, { pct: 0.10 });
  assert.equal(Math.round(S.capOwnership(cap, 'optionPool') * 100), 10);
  assert.equal(Math.round(S.capOwnership(cap, 'founder') * 100), 90);
});

test('capExitProceeds: a 3× pref EATS a small exit (founder ≈ nothing)', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'vc', amount: 200000000, preMoney: 300000000, prefMult: 3 }); // vc ~40%
  // Small exit below the 600m preference stack → vc takes it all, founder gets ~0.
  const founder = S.capExitProceeds(cap, 500000000, 'founder');
  assert.equal(founder, 0);
});

test('capExitProceeds: on a big exit the pref CONVERTS and the founder shares the upside', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'vc', amount: 200000000, preMoney: 300000000, prefMult: 3 });
  const exit = 5000000000; // ₦5bn — as-converted beats the 600m preference
  const founder = S.capExitProceeds(cap, exit, 'founder');
  // founder owns 60%, so ≈ 60% of the exit
  assert.ok(founder > 0.5 * exit, 'founder gets the majority on a large exit');
});

test('capExitProceeds: 1× clean pref holder converts and shares pro-rata', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'vc', amount: 60000000, preMoney: 240000000, prefMult: 1 }); // vc 20%
  const exit = 1000000000;
  const founder = S.capExitProceeds(cap, exit, 'founder');
  assert.equal(Math.round(founder / exit * 100), 80); // founder 80% as-converted
});
