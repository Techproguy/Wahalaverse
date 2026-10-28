// Pure, runtime-agnostic logic for the `delete-account` Edge Function. No Deno
// globals and no remote imports, so it runs under Deno (imported by index.ts) AND
// under Node's test runner (dynamic import) with mocked admin operations.
//
// Security/correctness contract:
//  - CORS: OPTIONS preflight is answered 204; every response carries CORS headers
//    (D-1).
//  - Identity: the caller is authorized by their verified JWT only (deps.getUserFromToken);
//    no client-supplied user id is trusted.
//  - STOP-ON-ERROR: if deleting the user's app rows fails, we return immediately and
//    DO NOT delete the auth user, so the account stays available for a retry (D-3).
//  - Internal DB error details stay server-side (logged); the client gets a generic
//    'deletion-failed'.

export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function jsonResponse(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// deps: {
//   getUserFromToken(jwt): Promise<{ user?: {id}, error? }>,
//   deleteAppRows(uid): Promise<{ error? }>,     // deletes activities+challenges+profiles; {error} on first failure
//   deleteAuthUser(uid): Promise<{ error? }>,
//   allowOrigin?: string,
//   log?(stage, err): void,
// }
export async function handleDeleteAccount(req, deps) {
  const cors = corsHeaders(deps.allowOrigin || '*');
  const log = deps.log || ((stage, err) => console.error(`delete-account[${stage}]:`, err && (err.message || err)));

  // CORS preflight.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method-not-allowed' }, 405, cors);

  // Authorize from the verified token only.
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const jwt = header.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return jsonResponse({ ok: false, error: 'missing-token' }, 401, cors);

  let uid;
  try {
    const { user, error } = await deps.getUserFromToken(jwt);
    if (error || !user) return jsonResponse({ ok: false, error: 'invalid-token' }, 401, cors);
    uid = user.id;
  } catch (e) {
    log('auth', e);
    return jsonResponse({ ok: false, error: 'invalid-token' }, 401, cors);
  }

  // Delete app rows first. STOP on any error — do NOT touch the auth user, so the
  // account remains available for a retry.
  try {
    const { error } = await deps.deleteAppRows(uid);
    if (error) { log('rows', error); return jsonResponse({ ok: false, error: 'deletion-failed' }, 500, cors); }
  } catch (e) {
    log('rows', e);
    return jsonResponse({ ok: false, error: 'deletion-failed' }, 500, cors);
  }

  // Only after app rows are gone, delete the auth user.
  try {
    const { error } = await deps.deleteAuthUser(uid);
    if (error) { log('auth-delete', error); return jsonResponse({ ok: false, error: 'deletion-failed' }, 500, cors); }
  } catch (e) {
    log('auth-delete', e);
    return jsonResponse({ ok: false, error: 'deletion-failed' }, 500, cors);
  }

  return jsonResponse({ ok: true, deleted: uid }, 200, cors);
}
