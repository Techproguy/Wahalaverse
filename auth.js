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
      if (!state.supabase) return { ok: false, error: { message: 'Cloud is not configured' } };
      const addr = String(email || '').trim();
      const { error } = await state.supabase.auth.signInWithOtp({
        email: addr,
        options: {
          emailRedirectTo: getRedirectTo ? getRedirectTo() : undefined,
          data: { display_name: name },
        },
      });
      return { ok: !error, error: error || null, message: error ? friendlyError(error) : '' };
    }

    async function verifyEmailOtp({ email, token }) {
      if (!state.supabase) return { ok: false, error: { message: 'Cloud is not configured' } };
      const addr = String(email || '').trim();
      const code = String(token || '').replace(/\s+/g, '');
      if (!/^\d{6}$/.test(code)) return { ok: false, error: { message: 'invalid' }, message: 'Enter the 6-digit code from your email.' };
      const { data, error } = await state.supabase.auth.verifyOtp({ email: addr, token: code, type: 'email' });
      return { ok: !error, error: error || null, session: (data && data.session) || null, message: error ? friendlyError(error) : '' };
    }

    return { sendSignInEmail, verifyEmailOtp };
  }

  return { create, friendlyError };
});
