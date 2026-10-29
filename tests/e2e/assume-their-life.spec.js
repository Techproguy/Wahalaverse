const { test, expect } = require('@playwright/test');

// Plays a full "Breakout Year" run in the browser (guest mode, no backend) and
// verifies it is a genuine causal simulation — dashboard, a delayed consequence
// that surfaces mid-run, and an explainable Reckoning — not a quiz.

test('Assume Their Life: a full run reaches an explainable Reckoning', async ({ page }) => {
  await page.goto('/?page=atl');

  // Role picker -> choose Afrobeats -> begin the year.
  await page.locator('[data-action="atl-pick"][data-role="afrobeats"]').click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
  await page.locator('[data-action="atl-start"]').click();

  // Dashboard with the six interacting meters is visible during play.
  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(6);

  // "Chase the bag" path: sign 360 -> pop single -> beef -> double down -> hold.
  const seq = ['A', 'A1', 'F1', 'D2', 'G2'];
  for (const id of seq) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  // Reckoning screen: an ending, the delayed-consequence ticker, pivotal decisions.
  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Cancelled'); // the cascade caught up
  await expect(page.getByText('The decisions that mattered')).toBeVisible();
  await expect(page.getByRole('heading', { name: /consequences that caught up/ })).toBeVisible(); // delayed consequences listed
  await expect(page.locator('[data-action="atl-share"]')).toBeVisible();

  // Replay resets to the start screen.
  await page.locator('[data-action="atl-replay"]').first().click();
  await expect(page.locator('[data-action="atl-start"]')).toBeVisible();
});

test('Assume Their Life: a different early path yields a different outcome', async ({ page }) => {
  await page.goto('/?page=atl');
  await page.locator('[data-action="atl-pick"][data-role="afrobeats"]').click();
  await page.locator('[data-action="atl-start"]').click();

  // "Build it right": independent -> keep team -> humble -> go dark -> drop album.
  for (const id of ['B', 'B1', 'F2', 'D3', 'G1']) {
    await page.locator(`[data-action="atl-choice"][data-choice="${id}"]`).click();
  }

  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).toContainText('Global Breakout'); // materially different ending
});
