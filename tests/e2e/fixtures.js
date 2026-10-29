// Shared Playwright fixtures. The E2E suite tests GUEST mode (no backend), so it
// must run deterministically even on a developer machine that has a local
// config.local.js pointing at a Supabase TEST project. This fixture intercepts
// config.local.js and serves it blank, so the app always stays guest-only during
// E2E regardless of local files. (CI has no config.local.js, so this is a no-op there.)
const base = require('@playwright/test');

exports.test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route('**/config.local.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* guest-mode for E2E */' }));
    await use(page);
  },
});
exports.expect = base.expect;
