// Deterministic tests for the email+password auth operations (auth.js) using a
// mocked Supabase auth client with test-controlled deferred promises. No real
// backend, no network. Run: node --test tests/auth.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Auth = require('../auth.js');

function makeDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Mock supabase.auth with controllable deferreds, recording args per method.
function mockAuthClient() {
  const calls = { signUp: [], signInWithPassword: [], resetPasswordForEmail: [], updateUser: [], signOut: [] };
  const pending = [];
  function term(op, args) {
    const d = makeDeferred();
    calls[op].push(args);
    pending.push({ op, resolve: d.resolve, reject: d.reject });
    return d.promise;
  }
  const supabase = {
    auth: {
      signUp: (a) => term('signUp', a),
      signInWithPassword: (a) => term('signInWithPassword', a),
      resetPasswordForEmail: (email, opts) => term('resetPasswordForEmail', { email, opts }),
      updateUser: (a) => term('updateUser', a),
      signOut: (a) => term('signOut', a),
    },
  };
  function settle(op, result, mode = 'resolve') {
    const i = pending.findIndex(p => p.op === op);
    if (i === -1) throw new Error(`no pending ${op}`);
    pending.splice(i, 1)[0][mode](result);
  }
  return { supabase, calls, pending, settle };
}
const tick = () => new Promise(r => setImmediate(r));

// --- Low-level ops -----------------------------------------------------------
test('signUp passes email/password/display_name and signs in immediately (no verification)', async () => {
  const m = mockAuthClient();
  const a = Auth.create({ state: { supabase: m.supabase }, getRedirectTo: () => 'https://app.test/' });
  const p = a.signUp({ email: ' z@test.com ', password: 'secretpw', name: 'Zee' });
  await tick();
  const arg = m.calls.signUp[0];
  assert.equal(arg.email, 'z@test.com');          // trimmed
  assert.equal(arg.password, 'secretpw');
  assert.equal(arg.options.data.display_name, 'Zee'); // name stored in auth metadata
  assert.equal('emailRedirectTo' in arg.options, false, 'no confirmation redirect is requested');
  m.settle('signUp', { data: { user: { id: 'U1' }, session: { access_token: 'x' } }, error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.ok(res.session, 'a session is returned (signed in immediately)');
});

test('signUp maps "already registered" to a friendly message', async () => {
  const m = mockAuthClient();
  const a = Auth.create({ state: { supabase: m.supabase }, getRedirectTo: () => '' });
  const p = a.signUp({ email: 'z@test.com', password: 'pw', name: 'Z' });
  await tick();
  m.settle('signUp', { data: null, error: { message: 'User already registered' } });
  const res = await p;
  assert.equal(res.ok, false);
  assert.match(res.message, /already has an account/i);
});

test('logIn succeeds and maps invalid credentials / unconfirmed email', async () => {
  const m = mockAuthClient();
  const a = Auth.create({ state: { supabase: m.supabase }, getRedirectTo: () => '' });
  // success
  let p = a.logIn({ email: 'z@test.com', password: 'pw' });
  await tick();
  assert.deepEqual(m.calls.signInWithPassword[0], { email: 'z@test.com', password: 'pw' });
  m.settle('signInWithPassword', { data: { session: { access_token: 'x' } }, error: null });
  assert.equal((await p).ok, true);
  // invalid credentials
  p = a.logIn({ email: 'z@test.com', password: 'bad' });
  await tick();
  m.settle('signInWithPassword', { data: null, error: { message: 'Invalid login credentials' } });
  const r = await p;
  assert.equal(r.ok, false); assert.match(r.message, /incorrect/i);
});

test('resetPassword emails a reset link with redirect; updatePassword sets a new one', async () => {
  const m = mockAuthClient();
  const a = Auth.create({ state: { supabase: m.supabase }, getRedirectTo: () => 'https://app.test/' });
  let p = a.resetPassword({ email: 'z@test.com' });
  await tick();
  assert.equal(m.calls.resetPasswordForEmail[0].email, 'z@test.com');
  assert.equal(m.calls.resetPasswordForEmail[0].opts.redirectTo, 'https://app.test/');
  m.settle('resetPasswordForEmail', { error: null });
  assert.equal((await p).ok, true);
  p = a.updatePassword({ password: 'newpw123' });
  await tick();
  assert.deepEqual(m.calls.updateUser[0], { password: 'newpw123' });
  m.settle('updateUser', { error: null });
  assert.equal((await p).ok, true);
});

test('ops no-op cleanly when cloud is not configured', async () => {
  const a = Auth.create({ state: { supabase: null }, getRedirectTo: () => '' });
  assert.equal((await a.signUp({ email: 'z@test.com', password: 'pw', name: 'Z' })).ok, false);
  assert.equal((await a.logIn({ email: 'z@test.com', password: 'pw' })).ok, false);
  assert.equal((await a.resetPassword({ email: 'z@test.com' })).ok, false);
});

// --- Controller: busy hygiene, stale-response invalidation -------------------
function makeController(overrides = {}) {
  const state = Object.assign({ authOpen: true, authStage: 'login', authEmail: '', authName: '', authOpId: 0, authBusy: false }, overrides.state || {});
  const d = { signUp: [], logIn: [], resetPassword: [], updatePassword: [] };
  const ops = {
    signUp: () => { const x = makeDeferred(); d.signUp.push(x); return x.promise; },
    logIn: () => { const x = makeDeferred(); d.logIn.push(x); return x.promise; },
    resetPassword: () => { const x = makeDeferred(); d.resetPassword.push(x); return x.promise; },
    updatePassword: () => { const x = makeDeferred(); d.updatePassword.push(x); return x.promise; },
  };
  const toasts = []; let signedIn = 0;
  const ctl = Auth.createController({ state, ops, render: () => {}, toast: (m) => toasts.push(m), focusDialog: () => {}, onSignedIn: () => { signedIn++; } });
  return { ctl, state, d, toasts, signedIn: () => signedIn };
}

test('register: a successful sign-up signs the user in immediately (no verification step)', async () => {
  const h = makeController();
  const p = h.ctl.register({ name: 'Z', email: 'z@test.com', password: 'secretpw' });
  await tick();
  assert.equal(h.state.authBusy, true);
  h.d.signUp[0].resolve({ ok: true, session: { access_token: 'x' } });
  await p;
  assert.equal(h.state.authBusy, false);
  assert.equal(h.state.authOpen, false, 'dialog closes — user is signed in right away');
  assert.equal(h.signedIn(), 1);
  assert.ok(h.toasts.some(t => /welcome/i.test(t)));
  assert.ok(!h.toasts.some(t => /verify|confirm/i.test(t)), 'no verification/confirmation prompt');
});

test('login: success closes the dialog, clears email/name; failure shows message', async () => {
  let h = makeController({ state: { authEmail: 'z@test.com' } });
  let p = h.ctl.login({ email: 'z@test.com', password: 'pw' });
  await tick();
  h.d.logIn[0].resolve({ ok: true, session: { access_token: 'x' } });
  await p;
  assert.equal(h.state.authOpen, false);
  assert.equal(h.state.authEmail, '');
  assert.equal(h.signedIn(), 1);
  h = makeController();
  p = h.ctl.login({ email: 'z@test.com', password: 'bad' });
  await tick();
  h.d.logIn[0].resolve({ ok: false, message: 'Email or password is incorrect.' });
  await p;
  assert.equal(h.state.authOpen, true);
  assert.ok(h.toasts.some(t => /incorrect/i.test(t)));
});

test('F-4: a thrown rejection never leaves the busy flag stuck', async () => {
  const state = { authOpen: true, authStage: 'login', authEmail: '', authName: '', authOpId: 0, authBusy: false };
  const ops = { signUp: () => Promise.reject(new Error('net')), logIn: () => Promise.reject(new Error('net')), resetPassword: () => {}, updatePassword: () => {} };
  const ctl = Auth.createController({ state, ops, render: () => {}, toast: () => {} });
  await ctl.login({ email: 'z@test.com', password: 'pw' });
  assert.equal(state.authBusy, false);
  await ctl.register({ name: 'Z', email: 'z@test.com', password: 'pw' });
  assert.equal(state.authBusy, false);
});

test('F-5: a stale login response (dialog superseded) is ignored', async () => {
  const h = makeController({ state: { authEmail: 'z@test.com' } });
  const p = h.ctl.login({ email: 'z@test.com', password: 'pw' });
  await tick();
  h.state.authOpId++; // superseded (dialog closed / mode changed / sign-out / new attempt)
  h.d.logIn[0].resolve({ ok: true, session: { access_token: 'x' } });
  const res = await p;
  assert.equal(res.superseded, true);
  assert.equal(h.signedIn(), 0, 'stale success must not sign the user in');
  assert.equal(h.state.authOpen, true);
});

test('sendReset routes back to login with a confirmation', async () => {
  const h = makeController({ state: { authStage: 'reset' } });
  const p = h.ctl.sendReset({ email: 'z@test.com' });
  await tick();
  h.d.resetPassword[0].resolve({ ok: true });
  await p;
  assert.equal(h.state.authStage, 'login');
  assert.ok(h.toasts.some(t => /reset link sent/i.test(t)));
});

// --- B-2: sign-out clears + renders before awaiting; honest failure ----------
function makeSignOut(signOutImpl) {
  const signOutArgs = [];
  const state = {
    user: { id: 'A' }, profile: { display_name: 'Alice' }, cloudActivities: [{ id: 1 }], cloudChallenges: [{ id: 2 }],
    loadingAccount: false, profileDraft: 'half', savingProfile: true, authEmail: 'a@test.com', authName: 'A', authBusy: false,
    authEpoch: 1, authOpId: 1, supabase: { auth: { signOut: (arg) => { signOutArgs.push(arg); return signOutImpl(arg); } } },
  };
  let renders = 0; const toasts = []; let cleared = 0;
  const ctl = Auth.createController({
    state, ops: {}, render: () => { renders++; }, toast: (m) => toasts.push(m),
    clearAccountState: () => { cleared++; state.profile = null; state.cloudActivities = []; state.cloudChallenges = []; state.profileDraft = null; state.savingProfile = false; },
    clearLocal: () => {},
  });
  return { ctl, state, toasts, signOutArgs, rendersAt: () => renders, cleared: () => cleared };
}

test('B-2: sign-out clears + renders BEFORE awaiting; uses global scope', async () => {
  const d = makeDeferred();
  const h = makeSignOut(() => d.promise);
  const p = h.ctl.signOut();
  assert.equal(h.state.user, null);
  assert.equal(h.state.profile, null);
  assert.ok(h.rendersAt() >= 1);
  assert.equal(h.cleared(), 1);
  d.resolve({ error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.deepEqual(h.signOutArgs[0], { scope: 'global' });
  assert.deepEqual(h.toasts, ['Signed out successfully']);
});

test('B-2: a rejected sign-out still clears locally and does not claim success', async () => {
  const h = makeSignOut(() => Promise.reject(new Error('network down')));
  const res = await h.ctl.signOut();
  assert.equal(res.ok, false);
  assert.equal(h.state.user, null);
  assert.ok(!h.toasts.includes('Signed out successfully'));
  assert.ok(h.toasts.some(m => /this device|could not be confirmed/i.test(m)));
});
