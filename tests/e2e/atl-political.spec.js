const { test, expect } = require('@playwright/test');

// Full Political Leadership run via the role picker — verifies the governance sim
// (budget + legislature + capacity) reaches an explainable Reckoning.

test('Political: capacity-first governing → The Reformer', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="political"]').click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
  await page.locator('[data-action="atl-start"]').click();

  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(6);

  for (const id of ['C', 'D', 'I', 'K', 'O', 'R', 'S']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }
  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Reformer');
});

test('Political: unfunded populism → Fiscal Ruin (popular ≠ affordable)', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="political"]').click();
  await page.locator('[data-action="atl-start"]').click();

  for (const id of ['A', 'E', 'G', 'L', 'O', 'Q', 'T']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }
  await expect(page.locator('.result-hero h2')).toContainText('Fiscal Ruin');
});
