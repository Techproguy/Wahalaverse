/* WahalaVerse account manager — the signed-in profile/activity/challenge state
   machine, isolated behind dependency injection so it can be driven by the
   browser app AND by deterministic Node tests (mocked auth/db + deferred
   promises). No direct DOM or network: everything it touches is injected.

   Loaded as a classic <script> (exposes window.WahalaAccount) OR required in
   Node (module.exports).

   Correctness contract (audited for Milestone 1):
   - Every async op captures the user id AND an auth-generation (authEpoch) once,
     and uses the captured values for all writes. Any response that arrives after
     the identity changed is DISCARDED — it can never be written under, or shown
     to, a different account.
   - On identity change the caller invokes clearAccountState() immediately, so no
     previous account's profile/activity/challenges survive a switch, and a later
     failed refresh can only ever reveal empty state, never stale data. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaAccount = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // deps: {
  //   state,                     // shared app state object (mutated in place)
  //   core,                      // WahalaCore (syncableActivities, titleCase)
  //   storage,                   // { getRecent(): [], setRecent(arr) } local queue
  //   getSessionId(): string,    // current guest browser-session id
  //   getPendingName(email): string|null, // email-scoped pending display name
  //   clearPendingName(),        // remove the stored pending display name
  //   render(),                  // re-render hook
  // }
  function create(deps) {
    const { state, core, storage, getSessionId, getPendingName, clearPendingName, render } = deps;

    // Called synchronously by the caller the instant the signed-in identity
    // changes (sign-in as a different user, sign-out). Wipes everything tied to
    // the previous account so nothing stale can be shown or re-used.
    function clearAccountState() {
      state.profile = null;
      state.cloudActivities = [];
      state.cloudChallenges = [];
      state.loadingAccount = false;
    }

    // Still the same signed-in identity as when we captured `epoch`?
    function stillCurrent(uid, epoch) {
      return state.authEpoch === epoch && (state.user?.id || null) === uid;
    }

    async function ensureProfile() {
      if (!state.user || !state.supabase) return;
      const uid = state.user.id;
      const epoch = state.authEpoch;
      // Pending name is single-use and email-scoped: read it for THIS user's email,
      // then clear the stored value regardless of match (consume on use; drop any
      // stale/foreign one) so it can never seed a later, different account.
      const pending = getPendingName ? getPendingName(state.user.email) : null;
      if (clearPendingName) clearPendingName();
      const name = core.titleCase(
        state.user.user_metadata?.display_name || pending ||
        state.user.email?.split('@')[0] || 'Wahala user');
      try {
        const { data, error } = await state.supabase.from('profiles')
          .upsert({ user_id: uid, display_name: name }, { onConflict: 'user_id', ignoreDuplicates: true })
          .select('display_name').single();
        if (!stillCurrent(uid, epoch)) return; // identity changed: discard response
        if (error) {
          const { data: existing } = await state.supabase.from('profiles')
            .select('display_name').eq('user_id', uid).maybeSingle();
          if (!stillCurrent(uid, epoch)) return;
          if (existing) state.profile = existing;
        } else {
          state.profile = data;
        }
      } catch (err) {
        console.warn('Profile:', err);
      }
      if (!stillCurrent(uid, epoch)) return;
      render();
      void syncActivities();
      void refreshAccount();
    }

    async function syncActivities() {
      if (!state.user || !state.supabase) return;
      // Capture identity + generation + session ONCE; use them for every write.
      const uid = state.user.id;
      const epoch = state.authEpoch;
      const sessionId = getSessionId();
      const done = new Set();
      for (const item of core.syncableActivities(storage.getRecent(), uid, sessionId)) {
        try {
          const { error } = await state.supabase.from('activities').insert({
            id: item.id, user_id: uid, kind: item.kind, details: item.details, created_at: item.created_at,
          });
          if (error && error.code !== '23505') throw error;
          done.add(item.id);
        } catch (err) {
          console.warn('Activity sync:', err);
          break;
        }
        if (state.authEpoch !== epoch) return; // account changed mid-sync: abort WITHOUT writing
      }
      if (state.authEpoch !== epoch) return;
      // Re-read the live queue and stamp only the items we actually synced, so a
      // concurrently-added activity or a sign-out clear is never clobbered/undone.
      const fresh = storage.getRecent();
      for (const f of fresh) {
        if (done.has(f.id)) { f.synced = true; f.owner = uid; delete f.session; }
      }
      storage.setRecent(fresh);
      if (state.page === 'account') void refreshAccount();
    }

    async function refreshAccount() {
      if (!state.user || !state.supabase) return;
      const uid = state.user.id;
      const epoch = state.authEpoch;
      state.loadingAccount = true;
      if (state.page === 'account') render();
      try {
        const [{ data: acts, error: actErr }, { data: challs, error: chErr }] = await Promise.all([
          state.supabase.from('activities').select('id,kind,details,created_at').order('created_at', { ascending: false }).limit(30),
          state.supabase.from('challenges').select('id,title,created_at').eq('owner_id', uid).order('created_at', { ascending: false }).limit(20),
        ]);
        if (state.authEpoch !== epoch) return; // account changed mid-fetch: discard
        if (actErr) throw actErr;
        if (chErr) throw chErr;
        state.cloudActivities = acts || [];
        state.cloudChallenges = challs || [];
      } catch (err) {
        console.warn('Account history:', err);
        // Never let a failed fetch reveal a previous account's data.
        if (state.authEpoch === epoch) { state.cloudActivities = []; state.cloudChallenges = []; }
      } finally {
        if (state.authEpoch === epoch) {
          state.loadingAccount = false;
          if (state.page === 'account') render();
        }
      }
    }

    return { clearAccountState, ensureProfile, syncActivities, refreshAccount };
  }

  return { create };
});
