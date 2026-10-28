const { test, expect } = require('@playwright/test');

test('create validation: short name is rejected with a toast', async ({ page }) => {
  await page.goto('/?page=create');
  await page.click('[data-action="create-save"]');
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#toast')).toContainText('at least 2 characters');
});

test('create validation: unanswered questions are rejected with a toast', async ({ page }) => {
  await page.goto('/?page=create');
  await page.fill('#creator-name', 'Valid Name');
  await page.click('[data-action="create-save"]');
  await expect(page.locator('#toast')).toContainText('Answer all 7 questions');
});

test('malformed guest link shows a graceful error, not a crash', async ({ page }) => {
  await page.goto('/?guest=this-is-not-a-valid-token');
  await expect(page.locator('.panel')).toContainText("couldn't load");
});

test('cloud (?c=) link with no backend shows the "needs the cloud" message', async ({ page }) => {
  // config.js is blank in this repo, so cloud is not configured.
  await page.goto('/?c=00000000-0000-4000-8000-000000000000');
  await expect(page.locator('.panel')).toContainText('needs the cloud');
});
