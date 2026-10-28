// WahalaVerse — `delete-account` Supabase Edge Function (Deno).
//
// Self-service account deletion, done SERVER-SIDE so the service-role key is never
// shipped to the browser. Security model:
//   • The caller's identity is taken ONLY from their verified JWT (auth.getUser).
//     The request body is ignored — a client-supplied user id is never trusted.
//   • The service-role key lives only in this function's environment
//     (SUPABASE_SERVICE_ROLE_KEY), set by the owner in the Supabase dashboard.
//   • Deletes are idempotent and keyed by the verified uid, so retries are safe and
//     partial failures are reported (not silently swallowed, never a false success).
//
// Deploy (TEST project only, with approval):
//   supabase functions deploy delete-account
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... (TEST project service role)
// SUPABASE_URL / SUPABASE_ANON_KEY are injected by the platform.
//
// NOTE: this file is NOT deployed in Phase D (no backend deployment). It is the
// reviewed implementation to deploy later, after approval.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ ok: false, error: 'missing-token' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // server-side only
  if (!url || !anonKey || !serviceKey) return json({ ok: false, error: 'server-misconfigured' }, 500);

  // 1) AUTHORIZE: derive the user id from the verified token, not from the body.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user) return json({ ok: false, error: 'invalid-token' }, 401);
  const uid = user.id;

  // 2) DELETE with the service role. App rows first (idempotent by uid), then the
  //    auth user (FK ON DELETE CASCADE would also remove them, but doing it
  //    explicitly makes partial failures observable and retries safe).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const errors: string[] = [];
  for (const [table, col] of [['activities', 'user_id'], ['challenges', 'owner_id'], ['profiles', 'user_id']] as const) {
    const { error } = await admin.from(table).delete().eq(col, uid);
    if (error) errors.push(`${table}: ${error.message}`);
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) errors.push(`auth: ${delErr.message}`);

  if (errors.length) {
    // Partial failure: report it. Safe to retry (all deletes are idempotent by uid).
    return json({ ok: false, error: 'partial-failure', details: errors }, 500);
  }
  return json({ ok: true, deleted: uid });
});
