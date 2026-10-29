/* WahalaVerse challenge retrieval — the single client entry point for reading a
   cloud challenge BY ID via the hardened get_challenge(id) RPC. There is no
   table-level challenge enumeration from the client anymore. Dependency-light so
   it can be unit-tested with a mocked Supabase client.

   Loaded as a classic <script> (window.WahalaChallenges) or required in Node. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaChallenges = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Fetch one public challenge by id via the RPC. Returns the row (minimal fields,
  // no owner_id) or null if not found. Throws on a transport/DB error so the caller
  // can show its "couldn't load" state. Guest (?guest=) links never reach here —
  // they are decoded entirely client-side (see core.decodeChallenge).
  async function getChallenge(supabase, id) {
    if (!supabase || !id) return null;
    const { data, error } = await supabase.rpc('get_challenge', { cid: id });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || null;
  }

  return { getChallenge };
});
