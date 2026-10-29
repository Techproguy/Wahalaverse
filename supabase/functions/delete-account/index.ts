// WahalaVerse — `delete-account` Supabase Edge Function (Deno entrypoint).
//
// Thin wiring: request handling lives in ./logic.mjs; dependency construction lives
// in ./deps.mjs (both node-testable). The service-role key stays ONLY in this
// function's environment and is never shipped to the browser, committed, or returned.
//
// Deploy (TEST project only, with approval):
//   supabase functions deploy delete-account
//   supabase secrets set SITE_URL=<exact TEST origin>   # REQUIRED for live ops; do NOT
//                                                       # use the production origin or wildcard.
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are RESERVED env vars
// that Supabase injects automatically into hosted Edge Functions — do NOT set them
// manually. This function reads the injected SUPABASE_SERVICE_ROLE_KEY at runtime.
//
// NOT deployed in Phase D. This is the reviewed implementation for later.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleDeleteAccount } from './logic.mjs';
import { buildDeps } from './deps.mjs';

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

  return handleDeleteAccount(req, buildDeps({ createClient, url, anonKey, serviceKey, allowOrigin }));
});
