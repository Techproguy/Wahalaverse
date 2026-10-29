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

// --- cap-table waterfall: conservation, elections and edge cases --------------
const sumWaterfall = (w) => Object.values(w).reduce((t, v) => t + v, 0);

test('exit waterfall CONSERVES proceeds (sum === exitValue) across holders', () => {
  const cap = S.capFound([{ id: 'founder', shares: 600000 }, { id: 'cofounder', shares: 400000 }]);
  S.capRaise(cap, { id: 'seed', amount: 50000000, preMoney: 200000000, prefMult: 1 });
  S.capRaise(cap, { id: 'vcA', amount: 200000000, preMoney: 800000000, prefMult: 2 });
  S.capPool(cap, { pct: 0.1 });
  for (const exit of [0, 100000000, 500000000, 1000000000, 5000000000]) {
    const w = S.capExitWaterfall(cap, exit);
    assert.ok(Math.abs(sumWaterfall(w) - exit) < 1e-6, `conserved at exit ${exit}`);
    assert.ok(Object.values(w).every(v => v >= 0), 'no negative proceeds');
  }
});

test('underwater exit: preference stack shares it ALL pro-rata, common gets 0', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'vc', amount: 200000000, preMoney: 300000000, prefMult: 3 }); // 600m stack
  const w = S.capExitWaterfall(cap, 400000000); // < 600m
  assert.equal(Math.round(w.founder), 0);
  assert.ok(Math.abs(w.vc - 400000000) < 1e-6); // vc takes the whole (underwater) exit
});

test('two preferred holders share an underwater exit pro-rata by claim', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'a', amount: 100000000, preMoney: 400000000, prefMult: 1 }); // claim 100m
  S.capRaise(cap, { id: 'b', amount: 100000000, preMoney: 500000000, prefMult: 3 }); // claim 300m
  const w = S.capExitWaterfall(cap, 200000000); // stack 400m > 200m -> pro-rata by claim (1:3)
  assert.ok(Math.abs(w.a - 50000000) < 1, 'a gets 1/4');
  assert.ok(Math.abs(w.b - 150000000) < 1, 'b gets 3/4');
  assert.equal(Math.round(w.founder), 0);
});

test('conversion ELECTION: a 1× holder converts on a big exit but takes pref on a small one', () => {
  const cap = S.capFound([{ id: 'founder', shares: 1000000 }]);
  S.capRaise(cap, { id: 'vc', amount: 100000000, preMoney: 100000000, prefMult: 1 }); // vc 50%, claim 100m
  const big = S.capExitWaterfall(cap, 1000000000);   // as-converted 500m > 100m -> converts
  assert.ok(Math.abs(big.vc - 500000000) < 1, 'converts to 50% on a big exit');
  const small = S.capExitWaterfall(cap, 150000000);  // as-converted 75m < 100m -> takes pref
  assert.ok(Math.abs(small.vc - 100000000) < 1, 'takes the 1× preference on a small exit');
});

test('edge cases: zero exit pays nobody; a no-pref table splits purely by shares', () => {
  const cap = S.capFound([{ id: 'founder', shares: 700000 }, { id: 'cofounder', shares: 300000 }]);
  assert.equal(sumWaterfall(S.capExitWaterfall(cap, 0)), 0);
  const w = S.capExitWaterfall(cap, 1000000000);
  assert.ok(Math.abs(w.founder - 700000000) < 1 && Math.abs(w.cofounder - 300000000) < 1);
});
