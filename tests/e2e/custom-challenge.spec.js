const { test, expect } = require('@playwright/test');

// Build a question in the Create Your Own Wahala builder.
async function fillQuestion(page, qi, text, options, answerIdx) {
  await page.fill(`[data-cc="q"][data-qi="${qi}"]`, text);
  // default is 2 options; add more if needed
  for (let oi = 2; oi < options.length; oi++) await page.click(`[data-action="cc-add-opt"][data-qi="${qi}"]`);
  for (let oi = 0; oi < options.length; oi++) await page.fill(`[data-cc="o"][data-qi="${qi}"][data-oi="${oi}"]`, options[oi]);
  await page.click(`[data-action="cc-answer"][data-qi="${qi}"][data-oi="${answerIdx}"]`);
}

test('CYOW: build → preview → generate → open fresh → play → result + CTA', async ({ page, browser }) => {
  await page.goto('/?page=create-custom');
  await page.fill('#cc-name', 'Tola 😎');
  await fillQuestion(page, 0, 'Fav jollof? 🍚', ['Party', 'Home', 'Both'], 2);
  await fillQuestion(page, 1, 'Lagos or Abuja?', ['Lagos', 'Abuja'], 0);
  await fillQuestion(page, 2, 'Owambe or Netflix? 🎉', ['Owambe', 'Netflix'], 1);

  // preview, then generate
  await page.click('[data-action="cc-preview"]');
  await expect(page.locator('h1')).toContainText('Looking');
  await expect(page.locator('.panel')).toContainText('your pick');
  await page.click('[data-action="cc-generate"]');

  const link = (await page.locator('#share-link').innerText()).trim();
  expect(link).toContain('guest=');

  // open as a brand-new guest and play
  const ctx = await browser.newContext();
  const friend = await ctx.newPage();
  await friend.goto(link);
  await expect(friend.locator('h1')).toContainText('Tola');
  await expect(friend.locator('.panel')).toContainText('Fav jollof'); // authored question rendered
  for (let i = 0; i < 3; i++) await friend.locator('[data-action="play-option"]').first().click();
  await expect(friend.locator('.result-number')).toBeVisible();
  await expect(friend.locator('.result-number')).toContainText('/3');
  await expect(friend.locator('[data-action="nav"][data-page="create-custom"]:visible').first()).toBeVisible();
  await ctx.close();
});

test('CYOW: a 10-question challenge generates a link within the size cap and plays fully', async ({ page, browser }) => {
  await page.goto('/?page=create-custom');
  await page.fill('#cc-name', 'Oga Emeka 🔥');
  for (let n = 3; n < 10; n++) await page.click('[data-action="cc-add-q"]'); // 3 → 10
  for (let qi = 0; qi < 10; qi++) {
    await fillQuestion(page, qi, `Question ${qi + 1}: wetin you go do? 😂🇳🇬`, ['Run am', 'Chill abeg'], qi % 2);
  }
  await page.click('[data-action="cc-preview"]');
  await page.click('[data-action="cc-generate"]');
  const link = (await page.locator('#share-link').innerText()).trim();
  expect(link).toContain('guest=');
  expect(link.length).toBeLessThan(4200); // compact compressed link

  const ctx = await browser.newContext();
  const friend = await ctx.newPage();
  await friend.goto(link);
  for (let i = 0; i < 10; i++) await friend.locator('[data-action="play-option"]').first().click();
  await expect(friend.locator('.result-number')).toContainText('/10');
  await ctx.close();
});

test('CYOW: a malformed custom link shows a graceful error', async ({ page }) => {
  await page.goto('/?guest=~not-a-valid-gzip-token');
  await expect(page.locator('.panel')).toContainText("couldn't load");
});
