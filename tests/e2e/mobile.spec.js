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

test('phone viewport: guest build keeps registration inaccessible (no auth dialog)', async ({ page }) => {
  // In the guest (no-backend) release, account/registration is intentionally not exposed:
  // there is no "auth" entry point, and the account page is the guest "My corner".
  await page.goto('/?page=account');
  await expect(page.locator('[data-action="auth"]')).toHaveCount(0);
  await expect(page.locator('.dialog')).toHaveCount(0);
  // The "Me" tab still reaches the guest corner.
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  await page.locator('.bottom-nav [data-action="nav"][data-page="account"]').click();
  await expect(page).toHaveURL(/page=account/);
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('guest');
});
