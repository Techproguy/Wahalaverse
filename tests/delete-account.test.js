// Tests for the delete-account Edge Function's request-handling logic
// (supabase/functions/delete-account/logic.mjs), driven with MOCKED admin
// operations (not only client-side function mocks). Covers CORS/OPTIONS preflight,
// auth failures, the stop-on-error deletion ordering, and success.
// Run: node --test tests/delete-account.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

let L; // loaded lazily (ESM)
async function logic() { return L || (L = await import('../supabase/functions/delete-account/logic.mjs')); }
let D;
async function depsMod() { return D || (D = await import('../supabase/functions/delete-account/deps.mjs')); }

// Mock `createClient` recording how the function is wired (D-5: real wiring test).
function mockCreateClient(behavior) {
  return (u, key, opts) => ({
    _url: u, _key: key, _opts: opts,
    auth: {
      getUser: async (jwt) => { behavior.getUserCalls.push({ jwt, header: opts && opts.global && opts.global.headers && opts.global.headers.Authorization }); return behavior.getUserResult; },
      admin: { deleteUser: async (uid) => { behavior.adminDeletes.push(uid); return behavior.adminDeleteResult || { error: null }; } },
    },
    from: (t) => ({ delete: () => ({ eq: async (c, v) => { behavior.rowDeletes.push({ t, c, v }); return behavior.rowResult || { error: null }; } }) }),
  });
}
function freshBehavior(over = {}) {
  return Object.assign({ getUserCalls: [], adminDeletes: [], rowDeletes: [], getUserResult: { data: { user: { id: 'U1' } }, error: null } }, over);
}

function req(method, { token } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request('https://fn.test/delete-account', { method, headers });
}
// Deps builder with call tracking; each stage configurable to ok or error/throw.
function deps(over = {}) {
  const calls = { getUser: 0, rows: 0, auth: 0 };
  return {
    calls,
    allowOrigin: 'https://app.test',
    log: () => {}, // silence server logs in tests
    getUserFromToken: over.getUserFromToken || (async () => { calls.getUser++; return { user: { id: 'U1' } }; }),
    deleteAppRows: over.deleteAppRows || (async () => { calls.rows++; return {}; }),
    deleteAuthUser: over.deleteAuthUser || (async () => { calls.auth++; return {}; }),
  };
}

test('OPTIONS preflight returns 204 with CORS headers (D-1)', async () => {
  const { handleDeleteAccount } = await logic();
  const res = await handleDeleteAccount(req('OPTIONS'), deps());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://app.test');
  assert.match(res.headers.get('Access-Control-Allow-Methods') || '', /POST/);
  assert.match(res.headers.get('Access-Control-Allow-Headers') || '', /authorization/i);
});

test('every response carries CORS headers (D-1)', async () => {
  const { handleDeleteAccount } = await logic();
  for (const r of [req('GET'), req('POST'), req('POST', { token: 't' })]) {
    const res = await handleDeleteAccount(r, deps());
    assert.ok(res.headers.get('Access-Control-Allow-Origin'), `CORS header present for ${r.method}`);
  }
});

test('non-POST is 405; missing token is 401', async () => {
  const { handleDeleteAccount } = await logic();
  assert.equal((await handleDeleteAccount(req('GET'), deps())).status, 405);
  assert.equal((await handleDeleteAccount(req('POST'), deps())).status, 401);
});

test('invalid token is 401 and never deletes anything', async () => {
  const { handleDeleteAccount } = await logic();
  const d = deps({ getUserFromToken: async () => ({ user: null, error: 'bad' }) });
  const res = await handleDeleteAccount(req('POST', { token: 'x' }), d);
  assert.equal(res.status, 401);
  assert.equal(d.calls.rows, 0);
  assert.equal(d.calls.auth, 0);
});

test('STOP-ON-ERROR: a row-deletion error does NOT delete the auth user (D-3)', async () => {
  const { handleDeleteAccount } = await logic();
  const d = deps({ deleteAppRows: async () => ({ error: { message: 'FK violation on activities' } }) });
  const res = await handleDeleteAccount(req('POST', { token: 't' }), d);
  assert.equal(res.status, 500);
  assert.equal(d.calls.auth, 0, 'auth user must remain (account available for retry)');
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, 'deletion-failed');
  assert.ok(!JSON.stringify(body).includes('FK violation'), 'internal DB error detail must stay server-side');
});

test('STOP-ON-ERROR: a thrown (network) row-deletion also halts before auth delete (D-3)', async () => {
  const { handleDeleteAccount } = await logic();
  const d = deps({ deleteAppRows: async () => { throw new Error('network'); } });
  const res = await handleDeleteAccount(req('POST', { token: 't' }), d);
  assert.equal(res.status, 500);
  assert.equal(d.calls.auth, 0);
});

test('an auth-user deletion error is reported generically (rows already attempted)', async () => {
  const { handleDeleteAccount } = await logic();
  const d = deps({ deleteAuthUser: async () => ({ error: { message: 'admin api down' } }) });
  const res = await handleDeleteAccount(req('POST', { token: 't' }), d);
  assert.equal(res.status, 500);
  assert.equal(d.calls.rows, 1, 'rows were deleted first');
  const body = await res.json();
  assert.equal(body.error, 'deletion-failed');
  assert.ok(!JSON.stringify(body).includes('admin api down'));
});

test('success path: rows then auth user, 200 {ok:true}', async () => {
  const { handleDeleteAccount } = await logic();
  const d = deps();
  const res = await handleDeleteAccount(req('POST', { token: 't' }), d);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true, deleted: 'U1' });
  assert.equal(d.calls.rows, 1);
  assert.equal(d.calls.auth, 1);
});

// --- D-5: real Edge Function wiring (buildDeps), not only the injected handler ---
test('D-5: getUserFromToken passes the bearer JWT EXPLICITLY to getUser', async () => {
  const { buildDeps } = await depsMod();
  const behavior = freshBehavior();
  const d = buildDeps({ createClient: mockCreateClient(behavior), url: 'U', anonKey: 'ANON', serviceKey: 'SERVICE', allowOrigin: 'https://app.test' });
  const r = await d.getUserFromToken('JWT123');
  assert.equal(behavior.getUserCalls.length, 1);
  assert.equal(behavior.getUserCalls[0].jwt, 'JWT123', 'getUser(jwt) receives the token explicitly (not undefined)');
  assert.equal(behavior.getUserCalls[0].header, 'Bearer JWT123');
  assert.equal(r.user.id, 'U1');
  assert.equal(d.allowOrigin, 'https://app.test');
});

test('D-5 wiring: an invalid JWT returns 401 and triggers NO privileged deletion', async () => {
  const { handleDeleteAccount } = await logic();
  const { buildDeps } = await depsMod();
  const behavior = freshBehavior({ getUserResult: { data: { user: null }, error: { message: 'bad jwt' } } });
  const d = buildDeps({ createClient: mockCreateClient(behavior), url: 'U', anonKey: 'ANON', serviceKey: 'SERVICE', allowOrigin: '*' });
  const res = await handleDeleteAccount(req('POST', { token: 'bad' }), d);
  assert.equal(res.status, 401);
  assert.equal(behavior.rowDeletes.length, 0, 'no row deletion for an invalid token');
  assert.equal(behavior.adminDeletes.length, 0, 'no auth-user deletion for an invalid token');
});

test('D-5 wiring: a missing JWT returns 401 and never calls getUser/admin', async () => {
  const { handleDeleteAccount } = await logic();
  const { buildDeps } = await depsMod();
  const behavior = freshBehavior();
  const d = buildDeps({ createClient: mockCreateClient(behavior), url: 'U', anonKey: 'ANON', serviceKey: 'SERVICE', allowOrigin: '*' });
  const res = await handleDeleteAccount(req('POST'), d); // no Authorization header
  assert.equal(res.status, 401);
  assert.equal(behavior.getUserCalls.length, 0);
  assert.equal(behavior.adminDeletes.length, 0);
});

test('D-5 wiring: a valid JWT deletes app rows then the auth user via real deps', async () => {
  const { handleDeleteAccount } = await logic();
  const { buildDeps } = await depsMod();
  const behavior = freshBehavior();
  const d = buildDeps({ createClient: mockCreateClient(behavior), url: 'U', anonKey: 'ANON', serviceKey: 'SERVICE', allowOrigin: '*' });
  const res = await handleDeleteAccount(req('POST', { token: 'good' }), d);
  assert.equal(res.status, 200);
  assert.equal(behavior.getUserCalls[0].jwt, 'good', 'verification used the explicit token');
  assert.deepEqual(behavior.rowDeletes.map(r => r.t), ['activities', 'challenges', 'profiles']);
  assert.deepEqual(behavior.adminDeletes, ['U1']);
});

test('D-5 wiring: a row-delete error stops before the auth user (via real deps)', async () => {
  const { handleDeleteAccount } = await logic();
  const { buildDeps } = await depsMod();
  const behavior = freshBehavior({ rowResult: { error: { message: 'db down' } } });
  const d = buildDeps({ createClient: mockCreateClient(behavior), url: 'U', anonKey: 'ANON', serviceKey: 'SERVICE', allowOrigin: '*' });
  const res = await handleDeleteAccount(req('POST', { token: 'good' }), d);
  assert.equal(res.status, 500);
  assert.equal(behavior.rowDeletes.length, 1, 'stopped at the first failing table');
  assert.equal(behavior.adminDeletes.length, 0, 'auth user NOT deleted');
});
