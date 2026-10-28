// Deterministic tests for the account state machine (account.js) using a mocked
// Supabase client whose every query resolves via a DEFERRED promise the test
// controls. This lets us reproduce delayed responses, account switching,
// sign-out, and failed refreshes without any real backend or timing.
// Run with: node --test tests/account.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const Account = require('../account.js');

// --- Mock Supabase client --------------------------------------------------
// Records every terminal query as a pending deferred. Tests resolve/reject them
// by (table, op) in order, so ordering and timing are fully controlled.
function makeDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function createMockSupabase() {
  const pending = []; // { table, op, args, resolve, reject }
  function term(table, op, args) {
    const d = makeDeferred();
    pending.push({ table, op, args, resolve: d.resolve, reject: d.reject });
    return d.promise;
  }
  const client = {
    from(table) {
      const b = {};
      b.upsert = (row) => { b._row = row; return b; };
      b.update = (row) => { b._row = row; return b; };
      b.insert = (row) => term(table, 'insert', row); // awaited directly
      b.select = () => b;
      b.eq = (col, val) => { b._eq = { col, val }; return b; };
      b.order = () => b;
      b.maybeSingle = () => term(table, 'maybeSingle', b._row);
      b.single = () => term(table, 'single', b._row);
      b.limit = (n) => term(table, 'limit', { table, n, eq: b._eq });
      b.delete = () => { b._del = true; return b; };
      // Thenable: awaiting the builder WITHOUT a terminal (e.g. select().eq().order())
      // resolves a 'select' op — mirrors PostgREST's awaitable query builder.
      b.then = (onF, onR) => term(table, b._del ? 'delete' : 'select', b._eq).then(onF, onR);
      return b;
    },
    functions: {
      invoke: (name, opts) => term('fn:' + name, 'invoke', opts),
    },
  };
  // Resolve the first pending op matching (table, op) with a Supabase-style result.
  function settle(table, op, result, mode = 'resolve') {
    const idx = pending.findIndex(p => p.table === table && p.op === op);
    if (idx === -1) throw new Error(`no pending ${table}.${op} (pending: ${pending.map(p => p.table + '.' + p.op)})`);
    const p = pending.splice(idx, 1)[0];
    p[mode](result);
    return p;
  }
  return { client, pending, settle };
}

function baseState(over = {}) {
  return Object.assign({
    user: { id: 'A', email: 'a@x.com', user_metadata: {} },
    supabase: null, authEpoch: 1, page: 'account',
    profile: null, cloudActivities: [], cloudChallenges: [], loadingAccount: false,
  }, over);
}

function memStorage(initial = []) {
  let arr = initial.slice();
  return { getRecent: () => arr.map(x => ({ ...x })), setRecent: (a) => { arr = a.map(x => ({ ...x })); }, dump: () => arr };
}

function makeAccount(state, storage, sessionId = 's1', pending = {}) {
  const mock = createMockSupabase();
  state.supabase = mock.client;
  const pendingCalls = { get: [], cleared: 0 };
  const mgr = Account.create({
    state, core: C, storage,
    getSessionId: () => sessionId,
    getPendingName: (email) => { pendingCalls.get.push(email); return pending.name !== undefined ? pending.name : null; },
    clearPendingName: () => { pendingCalls.cleared++; },
    render: () => {},
  });
  return { mgr, mock, pendingCalls };
}

const tick = () => new Promise(r => setImmediate(r));

// --- Finding 1: stale profile response --------------------------------------
test('ensureProfile discards a delayed response after the account changes', async () => {
  const state = baseState();
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.ensureProfile();            // awaits profiles.single (deferred)
  await tick();
  // Account switches to B while A's profile request is still in flight.
  state.user = { id: 'B', email: 'b@x.com', user_metadata: {} };
  state.authEpoch = 2;
  mgr.clearAccountState();
  mock.settle('profiles', 'single', { data: { display_name: 'Alice' }, error: null });
  await p;
  assert.equal(state.profile, null, "A's profile must not be applied after switching to B");
});

test('ensureProfile applies the profile when identity is stable', async () => {
  const state = baseState();
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.ensureProfile();
  await tick();
  mock.settle('profiles', 'single', { data: { display_name: 'Alice' }, error: null });
  await p;
  assert.deepEqual(state.profile, { display_name: 'Alice' });
});

test('ensureProfile reads the pending name for THIS email and always clears it (F-1)', async () => {
  const state = baseState({ user: { id: 'A', email: 'ada@test.com', user_metadata: {} } });
  const { mgr, mock, pendingCalls } = makeAccount(state, memStorage(), 's1', { name: 'Ada' });
  const p = mgr.ensureProfile();
  await tick();
  // The upsert row is seeded from the pending name, scoped to this user's email...
  const upsertRow = mock.pending.find(o => o.table === 'profiles').args;
  assert.equal(upsertRow.display_name, 'Ada');
  assert.deepEqual(pendingCalls.get, ['ada@test.com']); // looked up by this email only
  assert.equal(pendingCalls.cleared, 1);                 // ...and cleared (single-use)
  mock.settle('profiles', 'single', { data: { display_name: 'Ada' }, error: null });
  await p;
});

test('ensureProfile clears a non-matching pending name without using it (F-1)', async () => {
  const state = baseState({ user: { id: 'B', email: 'bola@test.com', user_metadata: {} } });
  // getPendingName returns null (email mismatch) but the stored value must still be cleared.
  const { mgr, mock, pendingCalls } = makeAccount(state, memStorage(), 's1', { name: null });
  const p = mgr.ensureProfile();
  await tick();
  const upsertRow = mock.pending.find(o => o.table === 'profiles').args;
  assert.equal(upsertRow.display_name, 'bola');  // falls back to email prefix, NOT a foreign name
  assert.equal(pendingCalls.cleared, 1);          // foreign/stale pending removed
  mock.settle('profiles', 'single', { data: { display_name: 'bola' }, error: null });
  await p;
});

// --- Finding 2: stale account data ------------------------------------------
test('refreshAccount discards results after the account changes mid-fetch', async () => {
  const state = baseState();
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.refreshAccount();           // awaits activities.limit + challenges.limit
  await tick();
  state.user = { id: 'B' }; state.authEpoch = 2; mgr.clearAccountState();
  mock.settle('activities', 'limit', { data: [{ id: 'act-A' }], error: null });
  mock.settle('challenges', 'limit', { data: [{ id: 'ch-A' }], error: null });
  await p;
  assert.deepEqual(state.cloudActivities, [], "A's activities must not land after switch");
  assert.deepEqual(state.cloudChallenges, []);
});

test('a FAILED refresh never exposes a previous account\'s data', async () => {
  // B is signed in but still carries A's data in state (simulating a race).
  const state = baseState({ user: { id: 'B' }, cloudActivities: [{ id: 'act-A' }], cloudChallenges: [{ id: 'ch-A' }] });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.refreshAccount();
  await tick();
  mock.settle('activities', 'limit', { data: null, error: { message: 'network down' } });
  mock.settle('challenges', 'limit', { data: null, error: { message: 'network down' } });
  await p;
  assert.deepEqual(state.cloudActivities, [], 'failed refresh must clear stale data');
  assert.deepEqual(state.cloudChallenges, []);
  assert.equal(state.loadingAccount, false);
});

// --- Cross-account isolation under async races ------------------------------
test('account switch mid-sync never uploads one account\'s item under another', async () => {
  const storage = memStorage([{ id: 'x1', kind: 'friendship_completed', details: {}, created_at: 't', synced: false, owner: null, session: 's1' }]);
  const state = baseState();
  const { mgr, mock } = makeAccount(state, storage);
  const p = mgr.syncActivities();           // eligible guest item -> awaits activities.insert
  await tick();
  const insertOp = mock.pending.find(o => o.table === 'activities' && o.op === 'insert');
  assert.ok(insertOp, 'an insert should be pending');
  assert.equal(insertOp.args.user_id, 'A', 'insert must use the captured user id (A), not live state');
  // Switch to B while the insert is in flight.
  state.user = { id: 'B' }; state.authEpoch = 2;
  mock.settle('activities', 'insert', { error: null });
  await p;
  assert.equal(storage.dump()[0].synced, false, 'item must NOT be marked synced after a mid-sync switch');
  assert.equal(storage.dump()[0].owner, null, 'item must NOT be re-owned by B');
});

test('sign-out mid-sync does not resurrect the cleared local queue', async () => {
  const storage = memStorage([{ id: 'x1', kind: 'friendship_completed', details: {}, created_at: 't', synced: false, owner: null, session: 's1' }]);
  const state = baseState();
  const { mgr, mock } = makeAccount(state, storage);
  const p = mgr.syncActivities();
  await tick();
  // Sign-out: clear the queue + bump epoch (mirrors the app's sign-out handler).
  storage.setRecent([]); state.user = null; state.authEpoch = 2;
  mock.settle('activities', 'insert', { error: null });
  await p;
  assert.deepEqual(storage.dump(), [], 'cleared queue must stay cleared (no resurrection)');
});

// --- Finding 3: cross-session guest data ------------------------------------
test('a guest item from a different session is never synced to a signed-in account', async () => {
  const storage = memStorage([{ id: 'old', kind: 'friendship_completed', details: {}, created_at: 't', synced: false, owner: null, session: 'OTHER-SESSION' }]);
  const state = baseState();
  const { mgr, mock } = makeAccount(state, storage, 's1'); // current session is s1
  await mgr.syncActivities();
  assert.equal(mock.pending.filter(o => o.op === 'insert').length, 0, 'no upload for another session\'s guest item');
  assert.equal(storage.dump()[0].synced, false);
});

test('a guest item from THIS session syncs and is stamped with the owner', async () => {
  const storage = memStorage([{ id: 'mine', kind: 'simulator_completed', details: {}, created_at: 't', synced: false, owner: null, session: 's1' }]);
  const state = baseState({ page: 'home' });
  const { mgr, mock } = makeAccount(state, storage, 's1');
  const p = mgr.syncActivities();
  await tick();
  mock.settle('activities', 'insert', { error: null });
  await p;
  assert.equal(storage.dump()[0].synced, true);
  assert.equal(storage.dump()[0].owner, 'A');
  assert.equal(storage.dump()[0].session, undefined, 'session tag dropped once owned');
});

// --- Phase B: secure profile update -----------------------------------------
test('updateProfile updates only the signed-in user\'s own row and applies the result', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@test.com' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.updateProfile('New Name');
  await tick();
  const upd = mock.pending.find(o => o.table === 'profiles');
  assert.ok(upd, 'an update should be pending');
  assert.equal(upd.args.display_name, 'New Name');
  mock.settle('profiles', 'single', { data: { display_name: 'New Name' }, error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.deepEqual(state.profile, { display_name: 'New Name' });
});

test('updateProfile rejects a too-short name without calling the backend', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@test.com' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const res = await mgr.updateProfile('x');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'too-short');
  assert.equal(mock.pending.length, 0, 'no backend call for an invalid name');
});

test('updateProfile discards its response if the account changed mid-update', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@test.com' }, profile: null });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.updateProfile('New Name');
  await tick();
  state.user = { id: 'B' }; state.authEpoch = 2; // switch mid-update
  mock.settle('profiles', 'single', { data: { display_name: 'New Name' }, error: null });
  const res = await p;
  assert.equal(res.ok, false);
  assert.equal(res.error, 'superseded');
  assert.equal(state.profile, null, "A's updated name must not be applied after switching to B");
});

test('updateProfile caps the display name at 30 characters (improvement)', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@test.com' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.updateProfile('x'.repeat(50));
  await tick();
  const upd = mock.pending.find(o => o.table === 'profiles');
  assert.equal(upd.args.display_name.length, 30, 'display_name is truncated to 30 before the backend call');
  mock.settle('profiles', 'single', { data: { display_name: 'x'.repeat(30) }, error: null });
  await p;
});

// --- Phase D: data export ----------------------------------------------------
test('exportData assembles ONLY the signed-in user\'s own data', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@x.com' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.exportData();
  await tick();
  mock.settle('profiles', 'select', { data: [{ user_id: 'A', display_name: 'Ada', created_at: 't' }], error: null });
  mock.settle('activities', 'select', { data: [{ id: 'x', kind: 'simulator_completed', details: {}, created_at: 't' }], error: null });
  mock.settle('challenges', 'select', { data: [{ id: 'c1', title: 't', answers: [0, 0, 0, 0, 0, 0, 0], template_version: 1, created_at: 't' }], error: null });
  const res = await p;
  assert.equal(res.ok, true);
  assert.equal(res.data.account.user_id, 'A');
  assert.equal(res.data.profile.display_name, 'Ada');
  assert.equal(res.data.activities.length, 1);
  assert.equal(res.data.challenges.length, 1);
});

test('exportData reports failure if any query errors (no partial export)', async () => {
  const state = baseState({ user: { id: 'A', email: 'a@x.com' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.exportData();
  await tick();
  mock.settle('profiles', 'select', { data: [{ user_id: 'A' }], error: null });
  mock.settle('activities', 'select', { data: null, error: { message: 'denied' } });
  mock.settle('challenges', 'select', { data: [], error: null });
  const res = await p;
  assert.equal(res.ok, false);
});

// --- Phase D: account deletion ----------------------------------------------
test('deleteAccount invokes the server function with NO client-supplied user id', async () => {
  const state = baseState({ user: { id: 'A' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.deleteAccount();
  await tick();
  const call = mock.pending.find(o => o.table === 'fn:delete-account');
  assert.ok(call, 'the delete-account Edge Function is invoked');
  assert.deepEqual(call.args, { method: 'POST' }, 'no uid/body is sent; the function derives identity from the JWT');
  mock.settle('fn:delete-account', 'invoke', { data: { ok: true, deleted: 'A' }, error: null });
  const res = await p;
  assert.equal(res.ok, true);
});

test('deleteAccount surfaces a partial-failure from the function (safe to retry)', async () => {
  const state = baseState({ user: { id: 'A' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.deleteAccount();
  await tick();
  mock.settle('fn:delete-account', 'invoke', { data: { ok: false, error: 'partial-failure', details: ['auth: boom'] }, error: null });
  const res = await p;
  assert.equal(res.ok, false);
  assert.equal(res.error, 'partial-failure');
});

test('deleteAccount handles a transport error without claiming success', async () => {
  const state = baseState({ user: { id: 'A' } });
  const { mgr, mock } = makeAccount(state, memStorage());
  const p = mgr.deleteAccount();
  await tick();
  mock.settle('fn:delete-account', 'invoke', { data: null, error: { message: 'network down' } });
  const res = await p;
  assert.equal(res.ok, false);
});

// --- clearAccountState (B-1) -------------------------------------------------
test('clearAccountState wipes profile, account data, AND editing state (B-1)', () => {
  const state = baseState({ profile: { display_name: 'Alice' }, cloudActivities: [{ id: 1 }], cloudChallenges: [{ id: 2 }], loadingAccount: true, profileDraft: 'Ada half-typed', savingProfile: true });
  const { mgr } = makeAccount(state, memStorage());
  mgr.clearAccountState();
  assert.equal(state.profile, null);
  assert.deepEqual(state.cloudActivities, []);
  assert.deepEqual(state.cloudChallenges, []);
  assert.equal(state.loadingAccount, false);
  assert.equal(state.profileDraft, null, "one user's unsaved draft must not survive an identity change");
  assert.equal(state.savingProfile, false);
});
