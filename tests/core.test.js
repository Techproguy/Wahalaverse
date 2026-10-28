// Unit tests for the pure logic in core.js. Run with: npm run test:unit
// (node --test). No browser, no network, no Supabase required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

const VALID_ANSWERS = [2, 1, 2, 1, 2, 0, 1];

test('QUESTION_COUNT matches the question list (7)', () => {
  assert.equal(C.QUESTION_COUNT, 7);
  assert.equal(C.Q.length, 7);
});

test('encode/decode round-trips a challenge (incl. emoji + diacritics)', () => {
  const ch = { owner_name: 'Tọlá 😭', title: 'How well do you know Tọlá?', answers: VALID_ANSWERS };
  const token = C.encodeChallenge(ch);
  const back = C.decodeChallenge(token);
  assert.equal(back.owner_name, ch.owner_name);
  assert.equal(back.title, ch.title);
  assert.deepEqual(back.answers, ch.answers);
  assert.equal(back.type, 'guest');
});

test('encoded token is URL-safe base64 (no +, /, or =)', () => {
  const token = C.encodeChallenge({ owner_name: 'Zee', title: 'x', answers: VALID_ANSWERS });
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('decodeChallenge rejects garbage', () => {
  assert.throws(() => C.decodeChallenge('!!!not-base64!!!'));
  assert.throws(() => C.decodeChallenge(''));
});

test('decodeChallenge rejects wrong answer length', () => {
  const bad = C.encodeChallenge({ owner_name: 'Z', title: 'x', answers: [0, 1, 2] });
  assert.throws(() => C.decodeChallenge(bad), /Bad challenge/);
});

test('decodeChallenge rejects out-of-range answers', () => {
  const bad = C.encodeChallenge({ owner_name: 'Z', title: 'x', answers: [0, 1, 2, 3, 0, 1, 2] });
  assert.throws(() => C.decodeChallenge(bad), /Bad challenge/);
});

test('decodeChallenge rejects oversized token', () => {
  assert.throws(() => C.decodeChallenge('a'.repeat(3501)), /Bad link/);
});

test('decodeChallenge rejects overlong owner name', () => {
  const bad = C.encodeChallenge({ owner_name: 'x'.repeat(40), title: 'x', answers: VALID_ANSWERS });
  assert.throws(() => C.decodeChallenge(bad), /Bad challenge/);
});

test('scoreQuiz counts exact matches', () => {
  assert.equal(C.scoreQuiz(VALID_ANSWERS, VALID_ANSWERS), 7);
  assert.equal(C.scoreQuiz([0, 0, 0, 0, 0, 0, 0], VALID_ANSWERS), 1); // only index 5 (answer 0) matches
  assert.equal(C.scoreQuiz([], VALID_ANSWERS), 0);
});

test('applySimChoice clamps money >= 0 and peace/street to 0..100', () => {
  const out = C.applySimChoice({ money: 5000, peace: 95, street: 5 }, { money: -9999, peace: 20, street: -20 });
  assert.deepEqual(out, { money: 0, peace: 100, street: 0 });
});

test('applySimChoice applies deltas within range', () => {
  const out = C.applySimChoice({ money: 180000, peace: 55, street: 40 }, { money: -45000, peace: 15, street: 20 });
  assert.deepEqual(out, { money: 135000, peace: 70, street: 60 });
});

test('a full Survive Naija run (first choice each round) is deterministic and non-negative', () => {
  let stats = { ...C.SIM_START };
  for (const scene of C.SCENES) {
    stats = C.applySimChoice(stats, scene.choices[0]);
  }
  assert.ok(stats.money >= 0);
  assert.ok(stats.peace >= 0 && stats.peace <= 100);
  assert.ok(stats.street >= 0 && stats.street <= 100);
});

test('syncableActivities: nothing syncs without a user id', () => {
  const items = [{ synced: false, owner: null }];
  assert.equal(C.syncableActivities(items, null).length, 0);
  assert.equal(C.syncableActivities(items, undefined).length, 0);
});

test('syncableActivities: only unsynced + (unowned or own) items are eligible', () => {
  const items = [
    { id: 1, synced: false, owner: null },   // guest, this session -> eligible for A
    { id: 2, synced: false, owner: 'A' },    // owned by A -> eligible for A
    { id: 3, synced: false, owner: 'B' },    // owned by B -> NOT for A (leak prevented)
    { id: 4, synced: true, owner: 'A' },     // already synced -> NOT re-uploaded
  ];
  const eligible = C.syncableActivities(items, 'A').map(x => x.id);
  assert.deepEqual(eligible, [1, 2]);
});

test('syncableActivities: a guest item, once synced to A, is never eligible for B', () => {
  // Guest plays (unowned), then A signs in and syncs it.
  let item = { id: 9, synced: false, owner: null };
  assert.equal(C.syncableActivities([item], 'A').length, 1); // eligible for A
  // Simulate the post-sync stamp applied by app.js.
  item = { ...item, synced: true, owner: 'A' };
  assert.equal(C.syncableActivities([item], 'A').length, 0); // already synced
  assert.equal(C.syncableActivities([item], 'B').length, 0); // and never leaks to B
});

test('syncableActivities: B can never pick up A-owned items from a shared queue', () => {
  const sharedQueue = [
    { id: 1, synced: false, owner: 'A' },
    { id: 2, synced: true, owner: 'A' },
    { id: 3, synced: false, owner: 'B' },
    { id: 4, synced: false, owner: null },
  ];
  const forB = C.syncableActivities(sharedQueue, 'B').map(x => x.id).sort();
  assert.deepEqual(forB, [3, 4]); // B's own + the unowned guest item only — never A's (ids 1,2)
});

test('escapeHtml neutralizes HTML metacharacters', () => {
  assert.equal(C.escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
  assert.equal(C.escapeHtml(null), '');
});

test('formatNaira formats with the naira sign and grouping', () => {
  assert.equal(C.formatNaira(180000), '₦180,000');
  assert.equal(C.formatNaira(0), '₦0');
});
