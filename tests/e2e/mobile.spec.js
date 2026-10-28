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

test('phone viewport: auth dialog moves focus to the dialog', async ({ page }) => {
  await page.goto('/?page=account');
  // On account page as a guest, the sign-in button is disabled when cloud is
  // not configured, so open the dialog via the header CTA instead.
  await page.locator('[data-action="auth"]').first().click();
  await expect(page.locator('.dialog')).toBeVisible();
  // Focus should be inside the dialog (trap/initial focus).
  const focusInDialog = await page.evaluate(() => !!document.activeElement?.closest('.dialog'));
  expect(focusInDialog).toBe(true);
});
