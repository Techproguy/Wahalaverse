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
      b.insert = (row) => term(table, 'insert', row); // awaited directly
      b.select = () => b;
      b.eq = (col, val) => { b._eq = { col, val }; return b; };
      b.order = () => b;
      b.maybeSingle = () => term(table, 'maybeSingle', b._row);
      b.single = () => term(table, 'single', b._row);
      b.limit = (n) => term(table, 'limit', { table, n, eq: b._eq });
      return b;
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

function makeAccount(state, storage, sessionId = 's1') {
  const mock = createMockSupabase();
  state.supabase = mock.client;
  const mgr = Account.create({
    state, core: C, storage,
    getSessionId: () => sessionId,
    getPendingName: () => null,
    render: () => {},
  });
  return { mgr, mock };
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

// --- clearAccountState -------------------------------------------------------
test('clearAccountState wipes profile + account data immediately', () => {
  const state = baseState({ profile: { display_name: 'Alice' }, cloudActivities: [{ id: 1 }], cloudChallenges: [{ id: 2 }], loadingAccount: true });
  const { mgr } = makeAccount(state, memStorage());
  mgr.clearAccountState();
  assert.equal(state.profile, null);
  assert.deepEqual(state.cloudActivities, []);
  assert.deepEqual(state.cloudChallenges, []);
  assert.equal(state.loadingAccount, false);
});
