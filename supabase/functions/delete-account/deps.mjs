// Dependency wiring for the delete-account Edge Function, factored out of index.ts
// so the REAL wiring (not just the injected handler) is unit-testable in Node: the
// test passes a mock `createClient` and asserts the bearer JWT is forwarded
// explicitly to the verification API. No Deno globals, no remote imports.

// buildDeps({ createClient, url, anonKey, serviceKey, allowOrigin }) -> deps object
// consumed by handleDeleteAccount (see logic.mjs).
export function buildDeps({ createClient, url, anonKey, serviceKey, allowOrigin }) {
  // Admin (service-role) client — created once; used only for privileged deletes.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    allowOrigin: allowOrigin || '*',

    // Verify the caller using their JWT. Per Supabase's Edge Function pattern, the
    // token is passed EXPLICITLY to getUser(jwt) — a server-side client has no
    // session, so getUser() with no argument would not verify the caller (D-5).
    getUserFromToken: async (jwt) => {
      const asUser = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
      const { data, error } = await asUser.auth.getUser(jwt);
      return { user: data && data.user, error };
    },

    // Delete the user's app rows, STOPPING at the first failing table (returns {error}).
    deleteAppRows: async (uid) => {
      const tables = [['activities', 'user_id'], ['challenges', 'owner_id'], ['profiles', 'user_id']];
      for (const [table, col] of tables) {
        const { error } = await admin.from(table).delete().eq(col, uid);
        if (error) return { error };
      }
      return {};
    },

    deleteAuthUser: async (uid) => {
      const { error } = await admin.auth.admin.deleteUser(uid);
      return { error };
    },
  };
}
