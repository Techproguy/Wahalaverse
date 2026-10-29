const { test, expect } = require('@playwright/test');

// Full Billionaire Life run via the role picker — verifies the paper-vs-cash squeeze
// resolves into a liquidity crisis after leverage + a crash.

test('Billionaire Life: leverage + crash → Rich on Paper, Broke in Cash', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="billionaire"]').click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
  await page.locator('[data-action="atl-start"]').click();

  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(6);

  for (const id of ['B', 'F', 'G', 'K', 'N', 'R', 'T']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Rich on Paper');
  await expect(page.getByRole('heading', { name: /consequences that caught up/ })).toBeVisible();
});

test('Billionaire Life: prudent stewardship preserves the fortune (different ending)', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="billionaire"]').click();
  await page.locator('[data-action="atl-start"]').click();

  for (const id of ['A', 'D', 'H', 'J', 'M', 'Q', 'V']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }
  await expect(page.locator('.result-hero h2')).toContainText('Dynasty Secured');
});
