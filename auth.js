/* WahalaVerse auth operations — thin, injectable wrapper around Supabase email
   auth so the sign-in flow can be driven by deterministic Node tests with a
   mocked client (deferred promises) and no real backend.

   Two entry points, both passwordless:
   - sendSignInEmail(): sends the email. Supabase delivers BOTH a magic link and,
     when the email template includes the token, a 6-digit code.
   - verifyEmailOtp(): the fallback for when the magic link opens in a DIFFERENT
     browser (common on mobile) — the user types the code back into the browser
     where they started, and we verify it here.

   No DOM, no direct globals: everything it needs is injected. Loaded as a
   classic <script> (window.WahalaAuth) or required in Node (module.exports). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaAuth = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Map a Supabase auth error to a short, user-facing message.
  function friendlyError(error) {
    const msg = (error && (error.message || error.error_description || '')) || '';
    const low = msg.toLowerCase();
    if (!msg) return 'Something went wrong. Please try again.';
    if (low.includes('rate') || low.includes('too many') || low.includes('for security purposes'))
      return 'Too many attempts. Please wait a minute and try again.';
    if (low.includes('expired')) return 'That code has expired. Request a new one.';
    if (low.includes('invalid') || low.includes('token')) return 'That code is not valid. Check it and try again.';
    if (low.includes('email')) return 'Please enter a valid email address.';
    return msg;
  }

  // deps: { state, getRedirectTo(): string }
  function create(deps) {
    const { state, getRedirectTo } = deps;

    async function sendSignInEmail({ email, name }) {
      if (!state.supabase) return { ok: false, error: { message: 'Cloud is not configured' }, message: 'Cloud is not configured' };
      const addr = String(email || '').trim();
      try {
        const { error } = await state.supabase.auth.signInWithOtp({
          email: addr,
          options: {
            emailRedirectTo: getRedirectTo ? getRedirectTo() : undefined,
            data: { display_name: name },
          },
        });
        return { ok: !error, error: error || null, message: error ? friendlyError(error) : '' };
      } catch (err) {
        // Network/unexpected rejection: normalize to a result so callers never hang.
        return { ok: false, error: err, message: friendlyError(err) };
      }
    }

    async function verifyEmailOtp({ email, token }) {
      if (!state.supabase) return { ok: false, error: { message: 'Cloud is not configured' }, message: 'Cloud is not configured' };
      const addr = String(email || '').trim();
      const code = String(token || '').replace(/\s+/g, '');
      if (!/^\d{6}$/.test(code)) return { ok: false, error: { message: 'invalid' }, message: 'Enter the 6-digit code from your email.' };
      try {
        const { data, error } = await state.supabase.auth.verifyOtp({ email: addr, token: code, type: 'email' });
        return { ok: !error, error: error || null, session: (data && data.session) || null, message: error ? friendlyError(error) : '' };
      } catch (err) {
        return { ok: false, error: err, message: friendlyError(err) };
      }
    }

    return { sendSignInEmail, verifyEmailOtp };
  }

  // Higher-level controller for the sign-in dialog flow. Holds the F-2..F-5
  // guarantees in one testable place:
  //  - Every attempt takes a monotonic op id (state.authOpId). A response is
  //    applied ONLY if its op is still current; otherwise it is dropped (F-5:
  //    stale responses after close / email change / sign-out / new attempt).
  //  - try/catch/finally guarantees the busy flag is cleared even on a thrown
  //    (e.g. network) rejection, so loading can never stick (F-4), and a stale
  //    op can never clear a newer attempt's busy flag (F-3).
  // deps: { state, ops:{send,verify}, persistPending(), render(), toast(), focusDialog?(), onSignedIn?() }
  function createController(deps) {
    const { state, ops, persistPending, render, toast, focusDialog, onSignedIn } = deps;
    const say = (m) => { if (toast && m) toast(m); };
    const focus = () => { if (focusDialog) focusDialog(); };

    async function signIn({ name, email }) {
      const op = ++state.authOpId;
      state.authName = name; state.authEmail = email; state.authSending = true;
      render();
      if (persistPending) persistPending({ email, name });
      let res;
      try { res = await ops.send({ email, name }); }
      catch (err) { res = { ok: false, message: 'Could not send the sign-in link' }; }
      finally { if (op === state.authOpId) state.authSending = false; }
      if (op !== state.authOpId) return { superseded: true };   // F-5
      if (res.ok) { state.authStage = 'sent'; render(); focus(); say('Check your email for a link or code 📩'); }
      else { render(); say(res.message || 'Could not send the sign-in link'); }
      return res;
    }

    async function verify({ token }) {
      const op = ++state.authOpId;
      const email = state.authEmail;
      state.authVerifying = true;
      render();
      let res;
      try { res = await ops.verify({ email, token }); }
      catch (err) { res = { ok: false, message: 'That code did not work' }; }
      finally { if (op === state.authOpId) state.authVerifying = false; }
      if (op !== state.authOpId) return { superseded: true };   // F-5
      if (res.ok) {
        state.authOpen = false; state.authStage = 'form';
        state.authEmail = ''; state.authName = '';             // F-2
        render(); if (onSignedIn) onSignedIn(); say('Signed in 🎉');
      } else { render(); focus(); say(res.message || 'That code did not work'); }
      return res;
    }

    return { signIn, verify };
  }

  return { create, createController, friendlyError };
});
