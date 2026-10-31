const { test, expect } = require('@playwright/test');

// Create Your Own Wahala — device-local draft autosave/recovery (guest mode).

async function fillQuestion(page, qi, qText, opts, answerIdx) {
  await page.locator(`input[data-cc="q"][data-qi="${qi}"]`).fill(qText);
  for (let oi = 0; oi < opts.length; oi++) {
    await page.locator(`input[data-cc="o"][data-qi="${qi}"][data-oi="${oi}"]`).fill(opts[oi]);
  }
  if (answerIdx != null) {
    await page.locator(`[data-action="cc-answer"][data-qi="${qi}"][data-oi="${answerIdx}"]`).click();
  }
}

test('restores an INCOMPLETE draft on reload, shows the notice, and Start Fresh clears it', async ({ page }) => {
  await page.goto('/?page=create-custom');
  await page.locator('#cc-name').fill('Tolu the menace');
  await fillQuestion(page, 0, 'Fav jollof?', ['Party rice', ''], null); // deliberately incomplete

  await page.reload();

  // Recovered — even though it never satisfied final generation validation.
  await expect(page.locator('#cc-name')).toHaveValue('Tolu the menace');
  await expect(page.locator('input[data-cc="q"][data-qi="0"]')).toHaveValue('Fav jollof?');
  await expect(page.getByText('Recovered your unsaved draft')).toBeVisible();

  // Start Fresh wipes the draft + notice.
  await page.locator('[data-action="cc-discard-draft"]').click();
  await expect(page.locator('#cc-name')).toHaveValue('');
  await expect(page.getByText('Recovered your unsaved draft')).toHaveCount(0);

  // And it stays cleared across another reload (discard really removed it).
  await page.reload();
  await expect(page.locator('#cc-name')).toHaveValue('');
  await expect(page.getByText('Recovered your unsaved draft')).toHaveCount(0);
});

test('rapid reload immediately after typing still persists the draft (unload flush)', async ({ page }) => {
  await page.goto('/?page=create-custom');
  await page.locator('#cc-name').fill('QuickSave Zee');
  await page.reload(); // no wait — faster than the 400ms debounce; pagehide flush must catch it

  await expect(page.locator('#cc-name')).toHaveValue('QuickSave Zee');
  await expect(page.getByText('Recovered your unsaved draft')).toBeVisible();
});

test('successful challenge generation clears the saved draft', async ({ page }) => {
  await page.goto('/?page=create-custom');
  await page.locator('#cc-name').fill('Ada');
  await fillQuestion(page, 0, 'Lagos or Abuja?', ['Lagos', 'Abuja'], 0);
  await fillQuestion(page, 1, 'Owambe or Netflix?', ['Owambe', 'Netflix'], 1);
  await fillQuestion(page, 2, 'Suya or shawarma?', ['Suya', 'Shawarma'], 0);

  await page.locator('[data-action="cc-preview"]').click();
  await page.locator('[data-action="cc-generate"]').click();
  await expect(page.locator('#share-link')).toBeVisible(); // created view

  // Reload the builder: the generated draft must be gone (no recovery).
  await page.goto('/?page=create-custom');
  await expect(page.locator('#cc-name')).toHaveValue('');
  await expect(page.getByText('Recovered your unsaved draft')).toHaveCount(0);
});
