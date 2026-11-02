const { test, expect } = require('@playwright/test');

// Guest-first experience: no misleading "Demo mode" / Supabase-config messaging anywhere
// a player can see, no account/registration entry point in the guest (no-backend) build,
// and guest gameplay works without sign-up.

const PAGES = ['home', 'account', 'survive2', 'create', 'create-custom'];

for (const pg of PAGES) {
  test(`"${pg}" shows no demo-mode / backend-config messaging`, async ({ page }) => {
    await page.goto('/?page=' + pg);
    // dismiss first-visit welcome if present (home)
    const welcome = page.getByRole('button', { name: /Let.s go/ });
    if (await welcome.count()) await welcome.click();
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('demo mode');
    expect(body).not.toContain('supabase is configured');
    expect(body).not.toContain('prototype is running');
    expect(body).not.toContain('available after setup');
  });
}

test('guest build has no account/registration entry point, and "auth" routes to the guest corner', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  // no "Join the cruise" CTA in the no-backend guest build
  await expect(page.getByText('Join the cruise', { exact: false })).toHaveCount(0);
  // the account page is the guest "My corner" — no sign-in form/button, honest copy
  await page.goto('/?page=account');
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('guest');
  expect(body).toContain('this device');
  await expect(page.locator('[data-action="auth"]')).toHaveCount(0); // no way to open registration
});

test('guest can still play Survive Naija 2.0 with no sign-up, and it states device-local saves', async ({ page }) => {
  await page.goto('/?page=survive2');
  await expect(page.getByText(/your progress saves on this device/i)).toBeVisible();
  await page.locator('[data-action="surv-pick"][data-scenario="payday"]').click();
  await page.locator('[data-action="surv-start"]').click();
  await expect(page.locator('.atl-dash')).toBeVisible(); // playing, no auth gate
});
