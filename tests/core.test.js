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

test('encode/decode round-trips a v1 challenge (incl. emoji + diacritics)', async () => {
  const ch = { owner_name: 'Tọlá 😭', title: 'How well do you know Tọlá?', answers: VALID_ANSWERS };
  const back = await C.decodeChallenge(C.encodeChallenge(ch));
  assert.equal(back.owner_name, ch.owner_name);
  assert.equal(back.title, ch.title);
  assert.deepEqual(back.answers, ch.answers);
  assert.equal(back.type, 'guest');
  assert.equal(back.template_version, 1);
});

test('v1 encoded token is URL-safe base64 (no +, /, or =)', () => {
  const token = C.encodeChallenge({ owner_name: 'Zee', title: 'x', answers: VALID_ANSWERS });
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('decodeChallenge rejects garbage', async () => {
  await assert.rejects(() => C.decodeChallenge('!!!not-base64!!!'));
  await assert.rejects(() => C.decodeChallenge(''));
});

test('decodeChallenge rejects wrong answer length', async () => {
  const bad = C.encodeChallenge({ owner_name: 'Z', title: 'x', answers: [0, 1, 2] });
  await assert.rejects(() => C.decodeChallenge(bad), /Bad challenge/);
});

test('decodeChallenge rejects out-of-range answers', async () => {
  const bad = C.encodeChallenge({ owner_name: 'Z', title: 'x', answers: [0, 1, 2, 3, 0, 1, 2] });
  await assert.rejects(() => C.decodeChallenge(bad), /Bad challenge/);
});

test('decodeChallenge rejects oversized token', async () => {
  await assert.rejects(() => C.decodeChallenge('a'.repeat(4001)), /Bad link/);
});

test('decodeChallenge rejects overlong owner name', async () => {
  const bad = C.encodeChallenge({ owner_name: 'x'.repeat(40), title: 'x', answers: VALID_ANSWERS });
  await assert.rejects(() => C.decodeChallenge(bad), /Bad challenge/);
});

// --- Create Your Own Wahala (v2 custom challenges) ---------------------------
const CUSTOM = {
  owner_name: 'Tolu 😎',
  title: 'Guess my vibes',
  questions: [
    { q: 'Fav jollof?', a: ['Party', 'Home', 'Both'] },
    { q: 'Lagos or Abuja?', a: ['Lagos', 'Abuja'] },
    { q: 'Owambe or Netflix?', a: ['Owambe', 'Netflix', 'Depends'] },
  ],
  answers: [2, 0, 1],
};

test('validateCustomChallenge accepts a well-formed custom challenge', () => {
  assert.deepEqual(C.validateCustomChallenge(CUSTOM), { ok: true });
});

test('custom challenge (v2) round-trips (compressed) incl. emoji + authored text', async () => {
  const token = await C.encodeCustomChallenge(CUSTOM);
  assert.equal(token[0], '~', 'v2 tokens are gzip-compressed (~ prefix)');
  const back = await C.decodeChallenge(token);
  assert.equal(back.template_version, 2);
  assert.equal(back.owner_name, 'Tolu 😎');
  assert.equal(back.questions.length, 3);
  assert.deepEqual(back.questions[0].a, ['Party', 'Home', 'Both']);
  assert.deepEqual(back.answers, [2, 0, 1]);
});

test('a heavy 10-question emoji challenge encodes within the cap and round-trips exactly', async () => {
  const mk = (n) => ({ q: `E be like say na you o 😂 Question ${n} — oya choose wisely, no dulling!`, a: ['Na lie o 🙅🏾‍♂️', 'I go gbese small 💀', 'Soft life or nothing ✈️🇳🇬', 'Leave matter jare 😮‍💨'] });
  const big = { owner_name: 'Oga Emeka 😎🔥', title: 'How well you sabi Emeka? 🇳🇬', questions: Array.from({ length: 10 }, (_, i) => mk(i + 1)), answers: Array.from({ length: 10 }, (_, i) => i % 4) };
  assert.deepEqual(C.validateCustomChallenge(big), { ok: true });
  const token = await C.encodeCustomChallenge(big);
  assert.ok(token.length <= 4000, `token ${token.length} within cap`);
  const back = await C.decodeChallenge(token);
  assert.equal(back.questions.length, 10);          // never silently drops questions
  assert.deepEqual(back.answers, big.answers);      // never alters intended answers
  assert.deepEqual(back.questions, big.questions);  // text/options preserved exactly
});

test('encodeCustomChallenge throws too-long (never truncates) when a challenge cannot fit', async () => {
  // High-entropy, oversized content (incompressible) → the token exceeds the cap, so
  // encode throws 'too-long' rather than dropping questions or altering answers.
  const crypto = require('node:crypto');
  const rnd = (n) => crypto.randomBytes(n).toString('base64').slice(0, n);
  const big = { owner_name: 'Zee', title: 't', questions: Array.from({ length: 10 }, () => ({ q: rnd(1200), a: [rnd(400), rnd(400)] })), answers: Array(10).fill(0) };
  await assert.rejects(() => C.encodeCustomChallenge(big), (e) => e.code === 'too-long');
});

test('v1 Quick Challenge links still decode after v2 was added (back-compat)', async () => {
  const back = await C.decodeChallenge(C.encodeChallenge({ owner_name: 'Zee', title: 'x', answers: VALID_ANSWERS }));
  assert.equal(back.template_version, 1);
  assert.equal('questions' in back, false);
});

test('validateCustomChallenge rejects bad shapes', () => {
  const bad = (over) => C.validateCustomChallenge({ ...CUSTOM, ...over });
  assert.equal(bad({ owner_name: 'x' }).ok, false);                 // name too short
  assert.equal(bad({ questions: CUSTOM.questions.slice(0, 2) }).ok, false); // < 3 questions
  assert.equal(bad({ questions: Array.from({ length: 11 }, () => ({ q: 'q', a: ['a', 'b'] })), answers: Array(11).fill(0) }).ok, false); // > 10
  assert.equal(bad({ answers: [2, 0] }).ok, false);                 // answers length != questions
  assert.equal(C.validateCustomChallenge({ ...CUSTOM, questions: [{ q: 'one option', a: ['only'] }, CUSTOM.questions[1], CUSTOM.questions[2]], answers: [0, 0, 1] }).ok, false); // < 2 options
  assert.equal(C.validateCustomChallenge({ ...CUSTOM, answers: [9, 0, 1] }).ok, false); // answer index out of range
  assert.equal(C.validateCustomChallenge({ ...CUSTOM, questions: [{ q: 'x'.repeat(200), a: ['a', 'b'] }, CUSTOM.questions[1], CUSTOM.questions[2]], answers: [0, 0, 1] }).ok, false); // question too long
  assert.equal(C.validateCustomChallenge({ ...CUSTOM, questions: [{ q: 'ok', a: ['a', 'b', 'c', 'd', 'e'] }, CUSTOM.questions[1], CUSTOM.questions[2]], answers: [0, 0, 1] }).ok, false); // > 4 options
});

test('decodeChallenge rejects a malformed v2 payload', async () => {
  const badToken = await C.encodeCustomChallenge({ owner_name: 'Z', title: 't', questions: [{ q: 'only one', a: ['a', 'b'] }], answers: [0] });
  await assert.rejects(() => C.decodeChallenge(badToken), /Bad challenge/);
});

// --- Create Your Own Wahala draft autosave (pure helpers) --------------------
test('isMeaningfulCustomDraft: pristine blank is NOT saved, any content IS', () => {
  const blank = [{ q: '', a: ['', ''], answer: null }, { q: '', a: ['', ''], answer: null }];
  assert.equal(C.isMeaningfulCustomDraft('', blank), false);
  assert.equal(C.isMeaningfulCustomDraft('  ', blank), false);
  assert.equal(C.isMeaningfulCustomDraft('Tolu', blank), true);         // name typed
  assert.equal(C.isMeaningfulCustomDraft('', [{ q: 'Fav?', a: ['', ''], answer: null }]), true); // question typed
  assert.equal(C.isMeaningfulCustomDraft('', [{ q: '', a: ['Lagos', ''], answer: null }]), true); // option typed
});

test('sanitizeCustomDraft restores an INCOMPLETE draft (no final validation required)', () => {
  const raw = { v: C.CC_DRAFT_VERSION, name: 'Tolu', questions: [{ q: 'Fav jollof?', a: ['Party', ''], answer: null }] };
  const safe = C.sanitizeCustomDraft(raw);
  assert.ok(safe);
  assert.equal(safe.name, 'Tolu');
  assert.equal(safe.questions.length, 1);          // a single, half-finished question is fine
  assert.deepEqual(safe.questions[0].a, ['Party', '']); // empty option preserved
  assert.equal(safe.questions[0].answer, null);
});

test('sanitizeCustomDraft rejects unusable / corrupted blobs', () => {
  assert.equal(C.sanitizeCustomDraft(null), null);
  assert.equal(C.sanitizeCustomDraft('nope'), null);
  assert.equal(C.sanitizeCustomDraft({ v: 999, questions: [{ q: 'x', a: ['a', 'b'] }] }), null); // wrong version
  assert.equal(C.sanitizeCustomDraft({ v: C.CC_DRAFT_VERSION, questions: [] }), null);            // no questions
  assert.equal(C.sanitizeCustomDraft({ v: C.CC_DRAFT_VERSION, questions: 'bad' }), null);
  assert.equal(C.sanitizeCustomDraft({ v: C.CC_DRAFT_VERSION, questions: [null] }), null);        // malformed question
});

test('sanitizeCustomDraft clamps to the field limits (size + structure safety)', () => {
  const L = C.CUSTOM_LIMITS;
  const raw = {
    v: C.CC_DRAFT_VERSION,
    name: 'x'.repeat(200),
    questions: [
      { q: 'y'.repeat(500), a: Array.from({ length: 12 }, (_, i) => 'o'.repeat(200) + i), answer: 99 }, // too many/too long options, bad answer
      { q: 'ok', a: ['only-one'], answer: 0 }, // fewer than min options -> padded
    ].concat(Array.from({ length: 20 }, () => ({ q: 'extra', a: ['a', 'b'], answer: 0 }))), // too many questions
  };
  const safe = C.sanitizeCustomDraft(raw);
  assert.ok(safe.name.length <= L.nameLen);
  assert.ok(safe.questions.length <= L.maxQuestions);                 // question count capped
  assert.ok(safe.questions[0].q.length <= L.questionLen);             // question text clamped
  assert.ok(safe.questions[0].a.length <= L.maxOptions);              // option count capped
  assert.ok(safe.questions[0].a.every(o => o.length <= L.optionLen)); // option text clamped
  assert.equal(safe.questions[0].answer, null);                       // out-of-range answer dropped
  assert.ok(safe.questions[1].a.length >= L.minOptions);              // padded up to the minimum
});

// --- Challenge question perspective (recipient predicts the creator) ----------
test('renderSubject: SELF mode addresses the creator as "you"/"your"', () => {
  assert.equal(C.renderSubject(C.Q[0].q, 'Shege', 'self'),
    'If you just received ₦500,000 by mistake, what would you most likely do?');
  assert.equal(C.renderSubject(C.Q[6].q, 'Shege', 'self'), 'Your ideal Saturday in Nigeria?');
});

test('renderSubject: OTHER mode names the creator (matches the founder example)', () => {
  assert.equal(C.renderSubject(C.Q[0].q, 'Shege', 'other'),
    'If Shege just received ₦500,000 by mistake, what would Shege most likely do?');
  // possessive + sentence-initial
  assert.equal(C.renderSubject(C.Q[6].q, 'Ada', 'other'), "Ada's ideal Saturday in Nigeria?");
  assert.match(C.renderSubject(C.Q[1].q, 'Tunde', 'other'), /^Tunde's crush/);
});

test('renderSubject: no tokens leak in either mode, and plain text passes through', () => {
  for (const q of C.Q) {
    assert.doesNotMatch(C.renderSubject(q.q, 'X', 'self'), /\{(they|their)\}/i);
    assert.doesNotMatch(C.renderSubject(q.q, 'X', 'other'), /\{(they|their)\}/i);
  }
  assert.equal(C.renderSubject('Plain text, no tokens', 'X', 'other'), 'Plain text, no tokens');
});

test('fillName: substitutes ONLY {name}, preserves other authored text (incl. "you")', () => {
  assert.equal(C.fillName('What would {name} do? And you?', 'Shege'), 'What would Shege do? And you?');
  assert.equal(C.fillName('{Name} vs {NAME}', 'Ada'), 'Ada vs Ada'); // case-insensitive token
  assert.equal(C.fillName('No placeholder here', 'Ada'), 'No placeholder here'); // untouched
  assert.equal(C.fillName('', 'Ada'), '');
});

test('BACK-COMPAT: existing v1 links still decode; questions render by the creator name; scoring unchanged', async () => {
  const token = C.encodeChallenge({ owner_name: 'Shege', title: 'How well do you know Shege?', answers: VALID_ANSWERS });
  const ch = await C.decodeChallenge(token);          // old link still works
  assert.equal(ch.template_version, 1);
  const recipientQ = C.renderSubject(C.Q[0].q, ch.owner_name, 'other');
  assert.match(recipientQ, /Shege/);                  // recipient sees the creator's name
  assert.ok(!('questions' in ch));                    // v1 questions come from built-in Q
  assert.equal(C.scoreQuiz(VALID_ANSWERS, ch.answers), C.QUESTION_COUNT); // scoring by index unchanged
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

const SESSION = 's1';

test('syncableActivities: nothing syncs without a user id', () => {
  const items = [{ synced: false, owner: null, session: SESSION }];
  assert.equal(C.syncableActivities(items, null, SESSION).length, 0);
  assert.equal(C.syncableActivities(items, undefined, SESSION).length, 0);
});

test('syncableActivities: only unsynced + (own or this-session guest) items are eligible', () => {
  const items = [
    { id: 1, synced: false, owner: null, session: SESSION }, // guest, this session -> eligible for A
    { id: 2, synced: false, owner: 'A' },                    // owned by A -> eligible for A
    { id: 3, synced: false, owner: 'B' },                    // owned by B -> NOT for A (leak prevented)
    { id: 4, synced: true, owner: 'A' },                     // already synced -> NOT re-uploaded
  ];
  const eligible = C.syncableActivities(items, 'A', SESSION).map(x => x.id);
  assert.deepEqual(eligible, [1, 2]);
});

test('syncableActivities: a guest item, once synced to A, is never eligible for B', () => {
  // Guest plays (unowned, this session), then A signs in and syncs it.
  let item = { id: 9, synced: false, owner: null, session: SESSION };
  assert.equal(C.syncableActivities([item], 'A', SESSION).length, 1); // eligible for A
  // Simulate the post-sync stamp applied by the account manager.
  item = { ...item, synced: true, owner: 'A' };
  assert.equal(C.syncableActivities([item], 'A', SESSION).length, 0); // already synced
  assert.equal(C.syncableActivities([item], 'B', SESSION).length, 0); // and never leaks to B
});

test('syncableActivities: B can never pick up A-owned items from a shared queue', () => {
  const sharedQueue = [
    { id: 1, synced: false, owner: 'A' },
    { id: 2, synced: true, owner: 'A' },
    { id: 3, synced: false, owner: 'B' },
    { id: 4, synced: false, owner: null, session: SESSION },
  ];
  const forB = C.syncableActivities(sharedQueue, 'B', SESSION).map(x => x.id).sort();
  assert.deepEqual(forB, [3, 4]); // B's own + this-session guest item only — never A's (ids 1,2)
});

test('syncableActivities: a guest item from a DIFFERENT session is never auto-attached', () => {
  const items = [
    { id: 1, synced: false, owner: null, session: 'OLD-SESSION' }, // another guest/session
    { id: 2, synced: false, owner: null },                         // legacy, no session
    { id: 3, synced: false, owner: null, session: SESSION },       // this session
  ];
  const eligible = C.syncableActivities(items, 'A', SESSION).map(x => x.id);
  assert.deepEqual(eligible, [3]); // only the current session's guest item
});

test('escapeHtml neutralizes HTML metacharacters', () => {
  assert.equal(C.escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
  assert.equal(C.escapeHtml(null), '');
});

test('formatNaira formats with the naira sign and grouping', () => {
  assert.equal(C.formatNaira(180000), '₦180,000');
  assert.equal(C.formatNaira(0), '₦0');
});
