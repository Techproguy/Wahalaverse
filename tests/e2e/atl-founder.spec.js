const { test, expect } = require('@playwright/test');

// Plays a full Founder Life run in the browser (guest mode) and verifies the
// cap-table signature: a "sold the company" exit can still leave the founder with
// almost nothing when an aggressive liquidation preference was taken.

test('Founder Life: aggressive 3× round + exit → Diluted to Nothing (explained)', async ({ page }) => {
  await page.goto('/?page=atl');

  // Role picker -> Founder -> start.
  await page.locator('[data-action="atl-pick"][data-role="founder"]').click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
  await page.locator('[data-action="atl-start"]').click();

  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(6); // six interacting variables

  // Cofounder 50/50 -> bootstrap -> persevere -> lean -> aggressive VC -> ship -> sell.
  for (const id of ['B', 'D', 'H', 'K', 'M', 'R', 'T']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Diluted to Nothing');
  await expect(page.getByRole('heading', { name: /consequences that caught up/ })).toBeVisible();
});

test('Founder Life: a clean path reaches a different ending', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="founder"]').click();
  await page.locator('[data-action="atl-start"]').click();

  // Solo -> bootstrap -> pivot -> option pool -> clean round -> rally -> sell big.
  for (const id of ['A', 'D', 'G', 'L', 'N', 'Q', 'T']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.result-hero h2')).toContainText('Venture Scaled');
});
