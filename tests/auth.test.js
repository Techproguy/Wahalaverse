// Deterministic tests for the Phase A auth operations (auth.js) using a mocked
// Supabase auth client whose calls resolve via test-controlled deferred promises.
// No real backend, no network, no timing. Run: node --test tests/auth.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Auth = require('../auth.js');

function makeDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Mock supabase.auth with controllable deferreds for signInWithOtp / verifyOtp.
function mockAuthClient() {
  const calls = { signInWithOtp: [], verifyOtp: [] };
  const pending = [];
  function term(op, args) {
    const d = makeDeferred();
    calls[op].push(args);
    pending.push({ op, args, resolve: d.resolve, reject: d.reject });
    return d.promise;
  }
  const supabase = {
    auth: {
      signInWithOtp: (args) => term('signInWithOtp', args),
      verifyOtp: (args) => term('verifyOtp', args),
    },
  };
  function settle(op, result) {
    const idx = pending.findIndex(p => p.op === op);
    if (idx === -1) throw new Error(`no pending ${op}`);
    pending.splice(idx, 1)[0].resolve(result);
  }
  return { supabase, calls, pending, settle };
}

const tick = () => new Promise(r => setImmediate(r));

test('sendSignInEmail passes email + display_name + redirect and reports success', async () => {
  const mock = mockAuthClient();
  const state = { supabase: mock.supabase };
  const authMgr = Auth.create({ state, getRedirectTo: () => 'https://app.test/' });
  const p = authMgr.sendSignInEmail({ email: '  zee@test.com ', name: 'Zee' });
  await tick();
  assert.equal(mock.calls.signInWithOtp.length, 1);
  const arg = mock.calls.signInWithOtp[0];
  assert.equal(arg.email, 'zee@test.com');               // trimmed
  assert.equal(arg.options.data.display_name, 'Zee');    // carried in the link metadata
  assert.equal(arg.options.emailRedirectTo, 'https://app.test/');
  mock.settle('signInWithOtp', { error: null });
  const res = await p;
  assert.equal(res.ok, true);
});

test('sendSignInEmail maps a rate-limit error to a friendly message', async () => {
  const mock = mockAuthClient();
  const authMgr = Auth.create({ state: { supabase: mock.supabase }, getRedirectTo: () => 'https://app.test/' });
  const p = authMgr.sendSignInEmail({ email: 'z@test.com', name: 'Zee' });
  await tick();
  mock.settle('signInWithOtp', { error: { message: 'For security purposes, you can only request this after 48 seconds' } });
  const res = await p;
  assert.equal(res.ok, false);
  assert.match(res.message, /wait a minute/i);
});

test('verifyEmailOtp verifies a 6-digit code and returns the session', async () => {
  const mock = mockAuthClient();
  const authMgr = Auth.create({ state: { supabase: mock.supabase }, getRedirectTo: () => 'https://app.test/' });
  const p = authMgr.verifyEmailOtp({ email: 'zee@test.com', token: '12 34 56' }); // spaces tolerated
  await tick();
  assert.equal(mock.calls.verifyOtp.length, 1);
  assert.deepEqual(mock.calls.verifyOtp[0], { email: 'zee@test.com', token: '123456', type: 'email' });
  mock.settle('verifyOtp', { data: { session: { user: { id: 'U1' } } }, error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.equal(res.session.user.id, 'U1');
});

test('verifyEmailOtp rejects a malformed code WITHOUT calling the backend', async () => {
  const mock = mockAuthClient();
  const authMgr = Auth.create({ state: { supabase: mock.supabase }, getRedirectTo: () => 'https://app.test/' });
  const res = await authMgr.verifyEmailOtp({ email: 'zee@test.com', token: '99' });
  assert.equal(res.ok, false);
  assert.equal(mock.calls.verifyOtp.length, 0, 'no backend call for an obviously invalid code');
  assert.match(res.message, /6-digit/);
});

test('verifyEmailOtp maps an expired-token error', async () => {
  const mock = mockAuthClient();
  const authMgr = Auth.create({ state: { supabase: mock.supabase }, getRedirectTo: () => 'https://app.test/' });
  const p = authMgr.verifyEmailOtp({ email: 'zee@test.com', token: '000000' });
  await tick();
  mock.settle('verifyOtp', { data: { session: null }, error: { message: 'Token has expired' } });
  const res = await p;
  assert.equal(res.ok, false);
  assert.match(res.message, /expired/i);
});

test('operations no-op cleanly when cloud is not configured', async () => {
  const authMgr = Auth.create({ state: { supabase: null }, getRedirectTo: () => '' });
  assert.equal((await authMgr.sendSignInEmail({ email: 'z@test.com', name: 'Z' })).ok, false);
  assert.equal((await authMgr.verifyEmailOtp({ email: 'z@test.com', token: '123456' })).ok, false);
});

// Account-switching with two test identities: each verifyOtp returns a distinct
// session, confirming the mock models independent accounts (used by the app's
// onAuthStateChange isolation, covered in account.test.js).
test('two test identities verify to independent sessions', async () => {
  const mock = mockAuthClient();
  const authMgr = Auth.create({ state: { supabase: mock.supabase }, getRedirectTo: () => 'https://app.test/' });
  const pA = authMgr.verifyEmailOtp({ email: 'a@test.com', token: '111111' });
  await tick();
  mock.settle('verifyOtp', { data: { session: { user: { id: 'A' } } }, error: null });
  const rA = await pA;
  const pB = authMgr.verifyEmailOtp({ email: 'b@test.com', token: '222222' });
  await tick();
  mock.settle('verifyOtp', { data: { session: { user: { id: 'B' } } }, error: null });
  const rB = await pB;
  assert.equal(rA.session.user.id, 'A');
  assert.equal(rB.session.user.id, 'B');
  assert.notEqual(rA.session.user.id, rB.session.user.id);
});
