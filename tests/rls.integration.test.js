// Two-account RLS integration tests — run against a live Supabase TEST project.
// SKIPPED unless the required env vars are set (CI stays credential-free; no real
// backend is ever touched by accident).
//
// Improvement A: a `before` hook SEEDS one profile + activity + challenge for each
// of two accounts (A, B) via their OWN JWTs, and the tests FAIL (not skip) if,
// when credentials ARE provided, seeding produced no rows / no challenge ids — so
// an empty table or a missing id can never masquerade as a passing isolation test.
//
// ── How to run (owner, TEST project only) ──────────────────────────────────────
//   npm i --no-save @supabase/supabase-js
//   SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... \
//   SUPABASE_TEST_A_JWT=... SUPABASE_TEST_A_ID=... \
//   SUPABASE_TEST_B_JWT=... SUPABASE_TEST_B_ID=... \
//   node --test tests/rls.integration.test.js
// NEVER put the service_role/secret key here or in CI.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const A_JWT = process.env.SUPABASE_TEST_A_JWT;
const A_ID = process.env.SUPABASE_TEST_A_ID;
const B_JWT = process.env.SUPABASE_TEST_B_JWT;
const B_ID = process.env.SUPABASE_TEST_B_ID;
const ready = !!(URL && ANON && A_JWT && A_ID && B_JWT && B_ID);
const skip = ready ? false : 'set SUPABASE_TEST_URL/ANON_KEY and A/B JWT+ID to run (TEST project only)';

async function loadClient() {
  try { return (await import('@supabase/supabase-js')).createClient; }
  catch { return null; }
}
function userClient(createClient, jwt) {
  const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
  return createClient(URL, ANON, { global: { headers }, auth: { persistSession: false, autoRefreshToken: false } });
}

const seed = { done: false, aChallengeId: null, bChallengeId: null };

before(async () => {
  if (!ready) return;
  const createClient = await loadClient();
  if (!createClient) return; // package not installed; tests will t.skip individually
  const a = userClient(createClient, A_JWT);
  const b = userClient(createClient, B_JWT);
  await a.from('profiles').upsert({ user_id: A_ID, display_name: 'A Test' }, { onConflict: 'user_id' });
  await b.from('profiles').upsert({ user_id: B_ID, display_name: 'B Test' }, { onConflict: 'user_id' });
  await a.from('activities').insert({ user_id: A_ID, kind: 'simulator_completed', details: { seed: true } });
  await b.from('activities').insert({ user_id: B_ID, kind: 'simulator_completed', details: { seed: true } });
  const ac = await a.from('challenges').insert({ owner_id: A_ID, owner_name: 'A', title: 'A seed', answers: [0, 0, 0, 0, 0, 0, 0], template_version: 1 }).select('id').single();
  const bc = await b.from('challenges').insert({ owner_id: B_ID, owner_name: 'B', title: 'B seed', answers: [1, 1, 1, 1, 1, 1, 1], template_version: 1 }).select('id').single();
  seed.aChallengeId = ac.data && ac.data.id;
  seed.bChallengeId = bc.data && bc.data.id;
  seed.done = true;
});

// Guard: when creds are provided, seeding MUST have produced rows + ids. This stops
// an empty DB from making the isolation assertions vacuously pass.
function requireSeed() {
  assert.equal(seed.done, true, 'seeding must have run');
  assert.ok(seed.aChallengeId && seed.bChallengeId, 'both accounts must have a seeded challenge id');
}

test('seed produced real two-account fixtures', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
});

test('RLS: profiles readable only by owner (and A actually has one)', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const a = userClient(createClient, A_JWT);
  const anon = userClient(createClient, null);
  const own = await a.from('profiles').select('user_id,display_name');
  assert.equal(own.error, null);
  assert.ok((own.data || []).length >= 1, 'A has a seeded profile (not an empty table)');
  for (const row of own.data) assert.equal(row.user_id, A_ID, 'A only sees its own profile');
  assert.deepEqual((await a.from('profiles').select('user_id').eq('user_id', B_ID)).data || [], [], "A cannot read B's profile");
  assert.deepEqual((await anon.from('profiles').select('user_id')).data || [], [], 'anon reads no profile');
});

test('RLS: activities readable/insertable only by owner', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const a = userClient(createClient, A_JWT);
  const acts = await a.from('activities').select('user_id');
  assert.equal(acts.error, null);
  assert.ok((acts.data || []).length >= 1, 'A has a seeded activity');
  for (const row of acts.data) assert.equal(row.user_id, A_ID);
  const forged = await a.from('activities').insert({ user_id: B_ID, kind: 'simulator_completed', details: {} });
  assert.notEqual(forged.error, null, 'A cannot insert an activity as B');
});

test('RLS: a user cannot UPDATE another user\'s profile', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const a = userClient(createClient, A_JWT);
  const res = await a.from('profiles').update({ display_name: 'hacked' }).eq('user_id', B_ID).select('user_id');
  assert.ok(res.error !== null || (res.data || []).length === 0, "A cannot update B's profile");
  // Confirm B's name is unchanged by reading it back as B.
  const b = userClient(createClient, B_JWT);
  const bProfile = await b.from('profiles').select('display_name').eq('user_id', B_ID).single();
  assert.notEqual(bProfile.data && bProfile.data.display_name, 'hacked');
});

test('RLS: no challenge enumeration for anon OR authenticated', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const anon = userClient(createClient, null);
  const a = userClient(createClient, A_JWT);
  const anonList = await anon.from('challenges').select('id').limit(1000);
  assert.ok(anonList.error !== null || (anonList.data || []).length === 0, 'anon cannot enumerate challenges');
  const aList = await a.from('challenges').select('id,owner_id').limit(1000);
  assert.equal(aList.error, null);
  assert.ok((aList.data || []).length >= 1, 'A sees its own seeded challenge (not an empty table)');
  for (const row of aList.data) assert.equal(row.owner_id, A_ID, 'A only sees its own challenges');
  assert.ok(!(aList.data || []).some(r => r.id === seed.bChallengeId), "A does not see B's challenge via table SELECT");
});

test('RLS: cross-account challenge writes are blocked', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const a = userClient(createClient, A_JWT);
  const forged = await a.from('challenges').insert({ owner_id: B_ID, owner_name: 'B', title: 'x', answers: [0, 0, 0, 0, 0, 0, 0], template_version: 1 });
  assert.notEqual(forged.error, null, 'A cannot insert a challenge owned by B');
  const del = await a.from('challenges').delete().eq('id', seed.bChallengeId).select('id');
  assert.ok(del.error !== null || (del.data || []).length === 0, "A cannot delete B's challenge");
});

test('RLS: a shared challenge is retrievable BY ID via get_challenge (anon + A)', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  requireSeed();
  const CID = seed.bChallengeId; // B's seeded challenge, retrieved by A/anon via the RPC
  const anon = userClient(createClient, null);
  const a = userClient(createClient, A_JWT);
  for (const [who, client] of [['anon', anon], ['A', a]]) {
    const res = await client.rpc('get_challenge', { cid: CID });
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    assert.equal(res.error, null, `${who}: get_challenge succeeds`);
    assert.ok(row && row.id === CID, `${who}: by-link retrieval returns the one challenge`);
    assert.equal('owner_id' in (row || {}), false, `${who}: RPC never returns owner_id`);
  }
  const miss = await anon.rpc('get_challenge', { cid: '00000000-0000-4000-8000-000000000000' });
  assert.equal((Array.isArray(miss.data) ? miss.data[0] : miss.data) || null, null, 'unknown id returns nothing');
});
