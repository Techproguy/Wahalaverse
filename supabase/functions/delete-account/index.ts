// WahalaVerse — `delete-account` Supabase Edge Function (Deno entrypoint).
//
// Thin wiring around ./logic.mjs (which holds the testable request handling: CORS,
// JWT authorization, stop-on-error deletion). The service-role key lives ONLY in
// this function's environment and is never shipped to the browser, committed, or
// returned in a response.
//
// Deploy (TEST project only, with approval):
//   supabase functions deploy delete-account
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<TEST project service_role key>
//   supabase secrets set SITE_URL=<your app origin>   # CORS allow-origin (optional; defaults to *)
// SUPABASE_URL / SUPABASE_ANON_KEY are injected by the platform.
//
// NOT deployed in Phase D. This is the reviewed implementation for later.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleDeleteAccount } from './logic.mjs';

Deno.serve((req: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // server-side only
  const allowOrigin = Deno.env.get('SITE_URL') || '*';

  if (!url || !anonKey || !serviceKey) {
    return handleDeleteAccount(req, {
      allowOrigin,
      getUserFromToken: async () => ({ error: 'server-misconfigured' }),
      deleteAppRows: async () => ({ error: 'server-misconfigured' }),
      deleteAuthUser: async () => ({ error: 'server-misconfigured' }),
    });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return handleDeleteAccount(req, {
    allowOrigin,
    // Verify the caller's identity from their token.
    getUserFromToken: async (jwt: string) => {
      const asUser = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
      const { data, error } = await asUser.auth.getUser();
      return { user: data?.user, error };
    },
    // Delete app rows sequentially; STOP at the first failing table (returns {error}).
    deleteAppRows: async (uid: string) => {
      for (const [table, col] of [['activities', 'user_id'], ['challenges', 'owner_id'], ['profiles', 'user_id']] as const) {
        const { error } = await admin.from(table).delete().eq(col, uid);
        if (error) return { error };
      }
      return {};
    },
    deleteAuthUser: async (uid: string) => {
      const { error } = await admin.auth.admin.deleteUser(uid);
      return { error };
    },
  });
});
