const { test, expect } = require('@playwright/test');

// Force a phone viewport regardless of the project so these assertions are
// deterministic.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('phone viewport: bottom nav shows, desktop top links hide', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.locator('.toplinks')).toBeHidden();
});

test('phone viewport: no horizontal overflow on key pages', async ({ page }) => {
  for (const path of ['/', '/?page=create', '/?page=sim', '/?page=account']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => {
      // Allow a 2px tolerance for sub-pixel rounding.
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(2);
  }
});

test('phone viewport: direct guest access via Play picker (Survive 2.0 first); no fake login, no credentials', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  // no functional-looking login in the guest build
  await expect(page.locator('[data-action="auth"]')).toHaveCount(0);
  // Play CTA opens the games picker; Survive 2.0 is first
  await page.locator('header [data-action="games-sheet"]').click();
  await expect(page.locator('.dialog')).toBeVisible();
  const firstGame = page.locator('.dialog [data-action="nav"]').first();
  await expect(firstGame).toHaveAttribute('data-page', 'survive2');
  await firstGame.click();
  await expect(page).toHaveURL(/page=survive2/);
  // account page: coming soon, no credential inputs
  await page.goto('/?page=account');
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  expect((await page.locator('body').innerText()).toLowerCase()).toContain('coming soon');
});
