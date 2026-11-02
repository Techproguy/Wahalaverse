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

test('guest build: no fake login; account access labelled "coming soon"; direct guest access works', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  // No functional-looking login in the guest build (nothing triggers the auth/onboarding modal).
  await expect(page.locator('[data-action="auth"]')).toHaveCount(0);
  // Direct guest access: the header Play CTA opens the games picker with every game.
  await page.locator('header [data-action="games-sheet"]').click();
  await expect(page.locator('.dialog [data-action="nav"][data-page="survive2"]')).toBeVisible();
  await expect(page.locator('.dialog [data-action="nav"][data-page="atl"]')).toBeVisible();
  // Account page: accounts are clearly "coming soon" (disabled, not a fake login), honest copy,
  // and NO credential collection anywhere in the guest build.
  await page.goto('/?page=account');
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('coming soon');
  expect(body).toContain('this device');
  expect(body).not.toContain('demo mode');
  expect(body).not.toContain('supabase');
  await expect(page.locator('#auth-form')).toHaveCount(0);
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  await expect(page.locator('[data-action="auth"]')).toHaveCount(0);
});

test('guest can still play Survive Naija 2.0 with no sign-up, and it states device-local saves', async ({ page }) => {
  await page.goto('/?page=survive2');
  await expect(page.getByText(/your progress saves on this device/i)).toBeVisible();
  await page.locator('[data-action="surv-pick"][data-scenario="payday"]').click();
  await page.locator('[data-action="surv-start"]').click();
  await expect(page.locator('.atl-dash')).toBeVisible(); // playing, no auth gate
});
