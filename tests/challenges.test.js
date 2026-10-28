// Unit tests for challenge retrieval (challenges.js) with a mocked Supabase
// client. Covers shared-link retrieval via the get_challenge RPC, "not found",
// and transport errors. Run: node --test tests/challenges.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Challenges = require('../challenges.js');

function mockRpc(impl) {
  const calls = [];
  return { client: { rpc: (name, args) => { calls.push({ name, args }); return impl(name, args); } }, calls };
}

const ROW = { id: 'c1', owner_name: 'Ada', title: 'How well do you know Ada?', answers: [0, 1, 2, 0, 1, 2, 0], template_version: 1, created_at: 't' };

test('getChallenge retrieves a shared challenge by id via the get_challenge RPC', async () => {
  const m = mockRpc(() => Promise.resolve({ data: [ROW], error: null }));
  const row = await Challenges.getChallenge(m.client, 'c1');
  assert.deepEqual(m.calls[0], { name: 'get_challenge', args: { cid: 'c1' } }); // RPC, not a table select
  assert.equal(row.id, 'c1');
  assert.equal(row.owner_name, 'Ada');
  assert.equal('owner_id' in row, false, 'the RPC row never exposes owner_id');
});

test('getChallenge tolerates a single-object (non-array) RPC result', async () => {
  const m = mockRpc(() => Promise.resolve({ data: ROW, error: null }));
  const row = await Challenges.getChallenge(m.client, 'c1');
  assert.equal(row.id, 'c1');
});

test('getChallenge returns null for an unknown id (no rows)', async () => {
  const m = mockRpc(() => Promise.resolve({ data: [], error: null }));
  const row = await Challenges.getChallenge(m.client, 'missing');
  assert.equal(row, null);
});

test('getChallenge throws on a transport/DB error so the caller can show "couldn\'t load"', async () => {
  const m = mockRpc(() => Promise.resolve({ data: null, error: { message: 'boom' } }));
  await assert.rejects(() => Challenges.getChallenge(m.client, 'c1'));
});

test('getChallenge no-ops without a client or id (never calls the backend)', async () => {
  const m = mockRpc(() => Promise.resolve({ data: [ROW], error: null }));
  assert.equal(await Challenges.getChallenge(null, 'c1'), null);
  assert.equal(await Challenges.getChallenge(m.client, ''), null);
  assert.equal(m.calls.length, 0);
});
