// EXAMPLE of a local TEST override. Copy to `config.local.js` (which is
// git-ignored and loaded by index.html when present) to point the app at a
// dedicated Supabase TEST project.
//
//   cp config.local.example.js config.local.js   # then edit the values
//
// Put ONLY the TEST project URL + publishable/anon key here. NEVER the
// service_role/secret key. Do NOT commit config.local.js. Production has no
// config.local.js, so the live site keeps the blank config.js and stays guest-only.
window.WAHALA_CONFIG = {
  supabaseUrl: 'https://YOUR-TEST-REF.supabase.co',
  supabasePublishableKey: 'YOUR-TEST-ANON-OR-PUBLISHABLE-KEY',
};
