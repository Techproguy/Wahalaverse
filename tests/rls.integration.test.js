// Two-account RLS integration tests — PREPARED for Milestone 2, run against a
// live Supabase TEST project. These are SKIPPED unless the required env vars are
// set, so they never run in CI (which stays credential-free) and never touch a
// real backend by accident.
//
// ── How to run (owner, against the TEST project only) ──────────────────────────
//   1. npm i --no-save @supabase/supabase-js    (only needed to run this file)
//   2. Sign in two test accounts once and copy each one's access token (JWT):
//      Supabase dashboard → Auth, or from the app's session after an OTP sign-in.
//   3. Export and run:
//      SUPABASE_TEST_URL=https://xxxx.supabase.co \
//      SUPABASE_TEST_ANON_KEY=eyJ... \
//      SUPABASE_TEST_A_JWT=<user A access token> \
//      SUPABASE_TEST_A_ID=<user A uuid> \
//      SUPABASE_TEST_B_JWT=<user B access token> \
//      SUPABASE_TEST_B_ID=<user B uuid> \
//      node --test tests/rls.integration.test.js
//
// NEVER put the service_role/secret key here or in CI. These probes use only the
// anon key + each user's own JWT, exactly as the browser would.
const { test } = require('node:test');
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
// A PostgREST client scoped to a specific user via their bearer token → RLS uses
// that user's auth.uid(). Passing no token = anonymous.
function userClient(createClient, jwt) {
  const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
  return createClient(URL, ANON, { global: { headers }, auth: { persistSession: false, autoRefreshToken: false } });
}

test('RLS: profiles are readable only by their owner', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  const a = userClient(createClient, A_JWT);
  const anon = userClient(createClient, null);

  const own = await a.from('profiles').select('user_id,display_name');
  assert.equal(own.error, null, 'A can read its own profile');
  for (const row of own.data || []) assert.equal(row.user_id, A_ID, 'A only ever sees its own profile');

  const bViaA = await a.from('profiles').select('user_id').eq('user_id', B_ID);
  assert.deepEqual(bViaA.data || [], [], "A must not be able to read B's profile");

  const anonRead = await anon.from('profiles').select('user_id');
  assert.deepEqual(anonRead.data || [], [], 'anon must not read any profile');
});

test('RLS: activities are readable/insertable only by their owner', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  const a = userClient(createClient, A_JWT);

  const acts = await a.from('activities').select('user_id');
  assert.equal(acts.error, null);
  for (const row of acts.data || []) assert.equal(row.user_id, A_ID, 'A only sees its own activities');

  // A tries to insert an activity attributed to B -> RLS with-check must reject.
  const forged = await a.from('activities').insert({ user_id: B_ID, kind: 'simulator_completed', details: {} });
  assert.notEqual(forged.error, null, "A must not be able to insert an activity as B");
});

test('RLS: challenge enumeration (Phase C target)', { skip }, async (t) => {
  const createClient = await loadClient();
  if (!createClient) return t.skip('npm i --no-save @supabase/supabase-js to run');
  const anon = userClient(createClient, null);
  const listed = await anon.from('challenges').select('id').limit(1000);
  // Before Phase C (current schema uses `using(true)`), anon CAN list the table.
  // After Phase C (get_challenge RPC + dropped table grant), this must be
  // empty/denied. This probe documents the gate and will be flipped to a hard
  // assertion in Phase C.
  t.diagnostic(`challenges enumerable by anon: ${(listed.data || []).length} rows, error=${listed.error ? listed.error.message : 'none'} (Phase C must make this 0/denied)`);
});
