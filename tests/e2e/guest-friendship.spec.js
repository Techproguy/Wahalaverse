const { test, expect } = require('./fixtures');

// Core growth loop, no backend: create a guest challenge, take the shareable
// link, open it in a FRESH browser context (a "friend"), complete it, see the
// result, and confirm the "create your own" CTA.
test('guest friendship challenge: create -> share link -> open fresh -> complete -> result -> CTA', async ({ page, browser, baseURL }) => {
  await page.goto('/?page=create');

  await page.fill('#creator-name', 'Test Menace');
  // Answer all 7 questions (pick option A each time).
  for (let i = 0; i < 7; i++) {
    await page.click(`[data-action="create-option"][data-q="${i}"][data-answer="0"]`);
  }
  await expect(page.locator('#answered-count')).toHaveText('7');

  await page.click('[data-action="create-save"]');

  // The shareable link is rendered in #share-link.
  const link = (await page.locator('#share-link').innerText()).trim();
  expect(link).toContain('guest=');

  // Open the link as a brand-new visitor (no shared localStorage).
  const freshContext = await browser.newContext();
  const friend = await freshContext.newPage();
  await friend.goto(link);

  // Player should see the creator's name and the first question.
  await expect(friend.locator('h1')).toContainText('Test Menace');

  // Answer all 7 questions (pick first option each time).
  for (let i = 0; i < 7; i++) {
    await friend.locator('[data-action="play-option"]').first().click();
  }

  // Result screen: a score out of 7 and a "create your own" CTA.
  await expect(friend.locator('.result-number')).toBeVisible();
  await expect(friend.locator('[data-action="nav"][data-page="create"]:visible').first()).toBeVisible();

  await freshContext.close();
});
