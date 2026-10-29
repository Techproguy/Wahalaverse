/* WahalaVerse auth operations — thin, injectable wrapper around Supabase email +
   PASSWORD auth, so the flow can be driven by deterministic Node tests with a
   mocked client (deferred promises) and no real backend.

   Conventional accounts (approved direction): email + password sign-up and sign-in,
   sign-out, persistent sessions, and password recovery via a secure email link.
   No OTP/magic-link for routine login. Passwords are handled only by Supabase Auth —
   never stored in app state, logs, or public.profiles.

   No DOM, no direct globals. Loaded as a classic <script> (window.WahalaAuth) or
   required in Node (module.exports). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaAuth = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Map a Supabase auth error to a short, user-facing message (no secrets).
  function friendlyError(error) {
    const msg = (error && (error.message || error.error_description || '')) || '';
    const low = msg.toLowerCase();
    if (!msg) return 'Something went wrong. Please try again.';
    if (low.includes('rate') || low.includes('too many') || low.includes('for security purposes'))
      return 'Too many attempts. Please wait a minute and try again.';
    if (low.includes('already registered') || low.includes('already been registered') || low.includes('user already'))
      return 'That email already has an account — log in instead.';
    if (low.includes('invalid login') || low.includes('invalid credentials'))
      return 'Email or password is incorrect.';
    if (low.includes('email not confirmed') || low.includes('not confirmed') || low.includes('confirm your email'))
      return 'Please verify your email first — check your inbox for the confirmation link.';
    if (low.includes('password') && (low.includes('should be') || low.includes('at least') || low.includes('weak') || low.includes('6 characters')))
      return 'Choose a stronger password (at least 6 characters).';
    if (low.includes('email')) return 'Please enter a valid email address.';
    return msg;
  }

  // deps: { state, getRedirectTo(): string }
  function create(deps) {
    const { state, getRedirectTo } = deps;
    const notConfigured = { ok: false, error: { message: 'Cloud is not configured' }, message: 'Cloud is not configured' };
    const redirect = () => (getRedirectTo ? getRedirectTo() : undefined);

    // Create an account. With email-confirmation ON, Supabase returns a user but NO
    // session (needsVerification). With it OFF, a session is returned (signed in).
    async function signUp({ email, password, name }) {
      if (!state.supabase) return notConfigured;
      try {
        const { data, error } = await state.supabase.auth.signUp({
          email: String(email || '').trim(),
          password: String(password || ''),
          options: { emailRedirectTo: redirect(), data: { display_name: name } },
        });
        if (error) return { ok: false, error, message: friendlyError(error) };
        const session = (data && data.session) || null;
        return { ok: true, session, needsVerification: !session && !!(data && data.user), error: null, message: '' };
      } catch (err) { return { ok: false, error: err, message: friendlyError(err) }; }
    }

    // Routine login — email + password. No OTP.
    async function logIn({ email, password }) {
      if (!state.supabase) return notConfigured;
      try {
        const { data, error } = await state.supabase.auth.signInWithPassword({
          email: String(email || '').trim(),
          password: String(password || ''),
        });
        if (error) return { ok: false, error, message: friendlyError(error) };
        return { ok: true, session: (data && data.session) || null, error: null, message: '' };
      } catch (err) { return { ok: false, error: err, message: friendlyError(err) }; }
    }

    // Send a password-reset email (secure link back to the app).
    async function resetPassword({ email }) {
      if (!state.supabase) return notConfigured;
      try {
        const { error } = await state.supabase.auth.resetPasswordForEmail(String(email || '').trim(), { redirectTo: redirect() });
        if (error) return { ok: false, error, message: friendlyError(error) };
        return { ok: true, error: null, message: '' };
      } catch (err) { return { ok: false, error: err, message: friendlyError(err) }; }
    }

    // Set a new password (used after the user returns via the recovery link).
    async function updatePassword({ password }) {
      if (!state.supabase) return notConfigured;
      try {
        const { error } = await state.supabase.auth.updateUser({ password: String(password || '') });
        if (error) return { ok: false, error, message: friendlyError(error) };
        return { ok: true, error: null, message: '' };
      } catch (err) { return { ok: false, error: err, message: friendlyError(err) }; }
    }

    return { signUp, logIn, resetPassword, updatePassword };
  }

  // Dialog-flow controller. Keeps the hardening guarantees in one testable place:
  //  - monotonic op id (state.authOpId): a response is applied ONLY if its op is
  //    still current, so responses after close / mode change / sign-out / a newer
  //    attempt are dropped (stale-response invalidation).
  //  - try/catch/finally: the busy flag always clears, even on a thrown rejection,
  //    and a stale op can't clear a newer attempt's busy flag.
  //  - Passwords are passed straight to ops and never stored on state.
  // deps: { state, ops:{signUp,logIn,resetPassword,updatePassword}, render, toast,
  //         focusDialog?, onSignedIn?, clearAccountState?, clearLocal? }
  function createController(deps) {
    const { state, ops, render, toast, focusDialog, onSignedIn, clearAccountState, clearLocal } = deps;
    const say = (m) => { if (toast && m) toast(m); };
    const focus = () => { if (focusDialog) focusDialog(); };

    async function run(fn) {
      const op = ++state.authOpId;
      state.authBusy = true; render();
      let res;
      try { res = await fn(); }
      catch (err) { res = { ok: false, message: 'Something went wrong. Please try again.' }; }
      finally { if (op === state.authOpId) state.authBusy = false; }
      if (op !== state.authOpId) return { superseded: true };
      return res;
    }

    async function register({ name, email, password }) {
      state.authName = name; state.authEmail = email;
      const res = await run(() => ops.signUp({ name, email, password }));
      if (res.superseded) return res;
      if (res.ok) {
        if (res.session) { state.authOpen = false; render(); if (onSignedIn) onSignedIn(); say('Welcome to WahalaVerse 🎉'); }
        else { state.authStage = 'login'; render(); focus(); say('Account created — check your email to verify, then log in.'); }
      } else { render(); say(res.message || 'Could not create your account'); }
      return res;
    }

    async function login({ email, password }) {
      state.authEmail = email;
      const res = await run(() => ops.logIn({ email, password }));
      if (res.superseded) return res;
      if (res.ok) {
        // onAuthStateChange sets the user + loads the profile; just close the dialog.
        state.authOpen = false; state.authEmail = ''; state.authName = ''; render();
        if (onSignedIn) onSignedIn(); say('Signed in 🎉');
      } else { render(); say(res.message || 'Could not sign in'); }
      return res;
    }

    async function sendReset({ email }) {
      state.authEmail = email;
      const res = await run(() => ops.resetPassword({ email }));
      if (res.superseded) return res;
      if (res.ok) { state.authStage = 'login'; render(); focus(); say('Password reset link sent — check your email.'); }
      else { render(); say(res.message || 'Could not send the reset email'); }
      return res;
    }

    async function updatePassword({ password }) {
      const res = await run(() => ops.updatePassword({ password }));
      if (res.superseded) return res;
      if (res.ok) { state.authStage = 'login'; state.authOpen = false; render(); say('Password updated — you can log in.'); }
      else { render(); focus(); say(res.message || 'Could not update your password'); }
      return res;
    }

    // Sign out: clear ALL local identity + account state and RE-RENDER synchronously
    // BEFORE awaiting the backend, so the previous account's data can never linger
    // during a slow signOut() (B-2). A rejected signOut() is reported honestly.
    async function signOut() {
      state.authEpoch++; state.authOpId++;
      state.user = null;
      if (clearAccountState) clearAccountState();
      state.authEmail = ''; state.authName = ''; state.authBusy = false;
      if (clearLocal) clearLocal();
      render();
      try {
        const res = await (state.supabase ? state.supabase.auth.signOut({ scope: 'global' }) : Promise.resolve({ error: null }));
        if (res && res.error) throw res.error;
        say('Signed out successfully');
        return { ok: true };
      } catch (err) {
        console.warn('Sign-out:', err);
        say('Signed out on this device (server sign-out could not be confirmed)');
        return { ok: false, error: err };
      }
    }

    return { register, login, sendReset, updatePassword, signOut };
  }

  return { create, createController, friendlyError };
});
