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
// --- Controller tests: F-2..F-5 (stale-response invalidation, busy hygiene) --
function makeController(overrides = {}) {
  const state = Object.assign({ authOpen: true, authStage: 'form', authEmail: '', authName: '', authOpId: 0, authSending: false, authVerifying: false }, overrides.state || {});
  const sendD = []; const verifyD = [];
  const ops = {
    send: () => { const d = makeDeferred(); sendD.push(d); return d.promise; },
    verify: () => { const d = makeDeferred(); verifyD.push(d); return d.promise; },
  };
  const toasts = []; let signedIn = 0; let persisted = [];
  const ctl = Auth.createController({
    state, ops,
    persistPending: (x) => persisted.push(x),
    render: () => {},
    toast: (m) => toasts.push(m),
    focusDialog: () => {},
    onSignedIn: () => { signedIn++; },
  });
  return { ctl, state, sendD, verifyD, toasts, persisted, signedIn: () => signedIn };
}

test('F-5: a verify response that resolves after the dialog is superseded is ignored', async () => {
  const h = makeController({ state: { authEmail: 'a@test.com' } });
  const p = h.ctl.verify({ token: '123456' });
  await tick();
  assert.equal(h.state.authVerifying, true);
  // User closes the dialog / changes email / signs out -> op id bumped elsewhere.
  h.state.authOpId++;
  h.verifyD[0].resolve({ ok: true, session: { user: { id: 'A' } } });
  const res = await p;
  assert.equal(res.superseded, true);
  assert.equal(h.signedIn(), 0, 'stale success must NOT sign the user in');
  assert.equal(h.state.authOpen, true, 'stale success must not mutate dialog state');
});

test('F-3: a stale response does not clear a newer attempt\'s busy flag', async () => {
  const h = makeController({ state: { authEmail: 'a@test.com' } });
  const p1 = h.ctl.verify({ token: '111111' });   // op 1
  await tick();
  const p2 = h.ctl.verify({ token: '222222' });   // op 2 (newer) -> authVerifying true
  await tick();
  assert.equal(h.state.authVerifying, true);
  h.verifyD[0].resolve({ ok: false, message: 'late' }); // op1 resolves late
  await p1;
  assert.equal(h.state.authVerifying, true, "the newer attempt's busy flag survives the stale resolution");
  h.verifyD[1].resolve({ ok: true, session: {} });
  await p2;
  assert.equal(h.state.authVerifying, false);
});

test('F-4: a thrown (network) rejection never leaves the busy flag stuck', async () => {
  const state = { authOpen: true, authStage: 'form', authEmail: 'a@test.com', authName: '', authOpId: 0, authSending: false, authVerifying: false };
  const ops = { send: () => Promise.reject(new Error('network down')), verify: () => Promise.reject(new Error('network down')) };
  const toasts = [];
  const ctl = Auth.createController({ state, ops, persistPending: () => {}, render: () => {}, toast: (m) => toasts.push(m) });
  await ctl.signIn({ name: 'A', email: 'a@test.com' });
  assert.equal(state.authSending, false, 'send: busy cleared after a thrown rejection');
  await ctl.verify({ token: '123456' });
  assert.equal(state.authVerifying, false, 'verify: busy cleared after a thrown rejection');
  assert.ok(toasts.length >= 1);
});

// --- B-2: sign-out renders cleared state synchronously + honest failure -------
function makeSignOut(signOutImpl) {
  const state = {
    user: { id: 'A' }, profile: { display_name: 'Alice' },
    cloudActivities: [{ id: 1 }], cloudChallenges: [{ id: 2 }], loadingAccount: false,
    profileDraft: 'half', savingProfile: true,
    authEmail: 'a@test.com', authName: 'A', authSending: false, authVerifying: false,
    authEpoch: 1, authOpId: 1,
    supabase: { auth: { signOut: signOutImpl } },
  };
  let renders = 0; const toasts = []; let cleared = 0; let localCleared = 0;
  const ctl = Auth.createController({
    state, ops: { send: () => {}, verify: () => {} },
    persistPending: () => {}, render: () => { renders++; },
    toast: (m) => toasts.push(m),
    clearAccountState: () => { cleared++; state.profile = null; state.cloudActivities = []; state.cloudChallenges = []; state.profileDraft = null; state.savingProfile = false; },
    clearLocal: () => { localCleared++; },
  });
  return { ctl, state, toasts, rendersAt: () => renders, cleared: () => cleared, localCleared: () => localCleared };
}

test('B-2: sign-out clears + renders BEFORE awaiting the backend (deferred)', async () => {
  const d = makeDeferred();
  const h = makeSignOut(() => d.promise);
  const p = h.ctl.signOut();
  // Synchronously (before the signOut promise resolves) the UI is already cleared + rendered.
  assert.equal(h.state.user, null);
  assert.equal(h.state.profile, null);
  assert.equal(h.state.profileDraft, null);
  assert.deepEqual(h.state.cloudActivities, []);
  assert.ok(h.rendersAt() >= 1, 'render happened before awaiting signOut');
  assert.equal(h.cleared(), 1);
  assert.equal(h.localCleared(), 1);
  d.resolve({ error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.deepEqual(h.toasts, ['Signed out successfully']);
});

test('B-2: a REJECTED sign-out still clears locally and does not claim success', async () => {
  const h = makeSignOut(() => Promise.reject(new Error('network down')));
  const res = await h.ctl.signOut();
  assert.equal(res.ok, false);
  assert.equal(h.state.user, null, 'local session state is cleared regardless of backend failure');
  assert.equal(h.state.profile, null);
  assert.ok(!h.toasts.includes('Signed out successfully'), 'must NOT falsely claim a successful sign-out');
  assert.ok(h.toasts.some(m => /this device|could not be confirmed/i.test(m)), 'reports an honest local-only sign-out');
});

test('B-2: a signOut returning {error} is treated as failure', async () => {
  const h = makeSignOut(() => Promise.resolve({ error: { message: 'server error' } }));
  const res = await h.ctl.signOut();
  assert.equal(res.ok, false);
  assert.ok(!h.toasts.includes('Signed out successfully'));
});

test('F-2/happy: a successful verify clears email + name and signs in', async () => {
  const h = makeController({ state: { authEmail: 'a@test.com', authName: 'Ada' } });
  const p = h.ctl.verify({ token: '123456' });
  await tick();
  h.verifyD[0].resolve({ ok: true, session: { user: { id: 'A' } } });
  await p;
  assert.equal(h.state.authEmail, '');
  assert.equal(h.state.authName, '');
  assert.equal(h.state.authOpen, false);
  assert.equal(h.signedIn(), 1);
});

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
