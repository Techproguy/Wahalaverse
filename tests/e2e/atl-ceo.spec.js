const { test, expect } = require('@playwright/test');

// Plays a full CEO Life run in the browser (guest mode) via the role picker and
// verifies the distinctive board-removal mechanic surfaces in the Reckoning.

test('CEO Life: a proxy fight + weak numbers → Ousted by the Board', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="ceo"]').click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
  await page.locator('[data-action="atl-start"]').click();

  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(6);

  for (const id of ['C', 'E', 'H', 'K', 'O', 'P', 'S']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Ousted by the Board');
});

test('CEO Life: investing + delivering → Turnaround Hero (different outcome)', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="ceo"]').click();
  await page.locator('[data-action="atl-start"]').click();

  for (const id of ['A', 'D', 'G', 'L', 'N', 'P', 'S']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.result-hero h2')).toContainText('Turnaround Hero');
});
