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

test('phone viewport: optional account onboarding opens, collects nothing, and focus moves into it', async ({ page }) => {
  // Guest-first: accounts are offered (not removed), but the guest build collects no
  // credentials — the onboarding sheet just explains guest play + accounts coming soon.
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  await page.locator('header [data-action="auth"]').click();
  await expect(page.locator('.dialog')).toBeVisible();
  // focus should land inside the dialog (a11y)
  const focusInDialog = await page.evaluate(() => !!document.activeElement?.closest('.dialog'));
  expect(focusInDialog).toBe(true);
  // no credential inputs in the guest build
  await expect(page.locator('#auth-form')).toHaveCount(0);
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  // continue as guest dismisses it
  await page.getByRole('button', { name: /Continue as guest/i }).click();
  await expect(page.locator('.dialog')).toHaveCount(0);
});
