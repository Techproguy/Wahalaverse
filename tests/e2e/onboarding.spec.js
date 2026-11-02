const { test, expect } = require('@playwright/test');

// Guest-first onboarding: a brief dismissible welcome (first visit only), a mobile game
// picker that surfaces every category, and no sign-up ever required to play.

test('first-visit welcome shows once, is skippable, and never blocks play', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  await expect(welcome).toBeVisible();
  await expect(page.getByText(/no download, no sign-up/i)).toBeVisible(); // guest-first, no registration ask
  await welcome.click();
  await expect(welcome).toHaveCount(0);

  // Returning (reload) — welcome does not reappear, you go straight to play.
  await page.reload();
  await expect(page.getByRole('button', { name: /Let.s go/ })).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('Catch cruise');
});

test('mobile games picker surfaces ALL categories (incl. Assume a life + Survive 2.0)', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) > 700, 'bottom-nav games picker is a mobile-only aid (desktop uses the top nav + home cards)');
  await page.goto('/');
  await page.getByRole('button', { name: /Let.s go/ }).click();
  await page.locator('[data-action="games-sheet"]').click();
  const sheet = page.locator('.dialog-backdrop');
  for (const pg of ['create', 'create-custom', 'survive2', 'sim', 'atl']) {
    await expect(sheet.locator(`[data-action="nav"][data-page="${pg}"]`)).toBeVisible();
  }
  // picking one navigates into the game (no account step)
  await sheet.locator('[data-action="nav"][data-page="survive2"]').click();
  await expect(page).toHaveURL(/page=survive2/);
});
