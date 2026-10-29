const { test, expect } = require('./fixtures');

test('Survive Naija: full 4-round run reaches an outcome with a share button', async ({ page }) => {
  await page.goto('/?page=sim');

  await expect(page.locator('.stat-grid')).toBeVisible();

  // Four scenes; pick the first choice each round.
  for (let round = 0; round < 4; round++) {
    await page.locator('[data-action="sim-choice"]').first().click();
  }

  // Outcome screen: a share-survival button and a play-again button.
  await expect(page.locator('[data-action="share-sim"]')).toBeVisible();
  await expect(page.locator('[data-action="restart-sim"]')).toBeVisible();

  // Restart returns to round 1.
  await page.locator('[data-action="restart-sim"]').click();
  await expect(page.locator('.countbox')).toContainText('DAY 1');
});
