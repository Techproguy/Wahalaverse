const { test, expect } = require('@playwright/test');

test('navigation + popstate (browser back/forward) works', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Catch cruise');

  // Navigate into "Make a challenge" via an in-app CTA.
  await page.locator('[data-action="nav"][data-page="create"]:visible').first().click();
  await expect(page).toHaveURL(/page=create/);
  await expect(page.locator('h1')).toContainText('Predict My');

  // Browser back -> popstate -> home.
  await page.goBack();
  await expect(page.locator('h1')).toContainText('Catch cruise');

  // Browser forward -> create again.
  await page.goForward();
  await expect(page.locator('h1')).toContainText('Predict My');
});

test('unknown page falls back to home', async ({ page }) => {
  await page.goto('/?page=does-not-exist');
  await expect(page.locator('h1')).toContainText('Catch cruise');
});
