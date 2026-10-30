const { test, expect } = require('@playwright/test');

// Founder-observed correction: a recipient predicts the CREATOR, so recipient-facing
// questions must name the creator (not say "you"), while the creator building the
// challenge sees them about themselves.

async function fillQuestion(page, qi, qText, opts, answerIdx) {
  await page.locator(`input[data-cc="q"][data-qi="${qi}"]`).fill(qText);
  for (let oi = 0; oi < opts.length; oi++) await page.locator(`input[data-cc="o"][data-qi="${qi}"][data-oi="${oi}"]`).fill(opts[oi]);
  await page.locator(`[data-action="cc-answer"][data-qi="${qi}"][data-oi="${answerIdx}"]`).click();
}

test('Quick Challenge: creator sees "you"; recipient sees the creator\'s name', async ({ page }) => {
  await page.goto('/?page=create');
  // Creator perspective: the builder shows the question about themselves ("you").
  const firstQ = page.locator('#creator-questions .question h3').first();
  await expect(firstQ).toContainText('you');
  await expect(firstQ).not.toContainText('{they}');

  await page.locator('#creator-name').fill('Shege');
  for (let i = 0; i < 7; i++) await page.locator(`[data-action="create-option"][data-q="${i}"][data-answer="0"]`).click();
  await page.locator('[data-action="create-save"]').click();

  // Open the generated link as a recipient.
  const link = (await page.locator('#share-link').innerText()).trim();
  await page.goto(link);
  const playedQ = page.locator('section.panel h2').first();
  await expect(playedQ).toContainText('Shege');          // names the creator
  await expect(playedQ).not.toContainText('{they}');     // no raw tokens
  // scoring still works (recipient predicts; all-first matched the creator's all-first)
  for (let i = 0; i < 7; i++) await page.locator('[data-action="play-option"]').first().click();
  await expect(page.locator('.result-number')).toContainText('7');
});

test('Builder: ambiguous "you/my" wording is flagged; "Insert my name" resolves it', async ({ page }) => {
  await page.goto('/?page=create-custom');
  const firstQuestion = page.locator('section.question').first();
  const q0 = page.locator('input[data-cc="q"][data-qi="0"]');
  await q0.fill('What would you do with free money?');
  // A friendly, contextual suggestion appears live (and the text is NOT rewritten).
  await expect(firstQuestion.locator('.cc-suggest')).toBeVisible();
  await expect(firstQuestion.locator('.cc-suggest')).toContainText('Friends are guessing about');
  await expect(q0).toHaveValue('What would you do with free money?'); // untouched

  // "Insert my name" is labelled plainly (placeholder concept hidden) and clears the flag.
  const insertBtn = firstQuestion.locator('[data-action="cc-insert-name"]');
  await expect(insertBtn).toHaveText('Insert my name');
  await insertBtn.click();
  await expect(firstQuestion.locator('.cc-suggest')).toBeHidden();
  await expect(q0).toHaveValue(/\{name\}/);

  // Neutral wording is not flagged.
  await page.locator('input[data-cc="q"][data-qi="1"]').fill('Jollof or fried rice?');
  await expect(page.locator('section.question').nth(1).locator('.cc-suggest')).toBeHidden();
});

test('Preview warns (for explicit review) when a question still says "you", and stays consistent with play', async ({ page }) => {
  await page.goto('/?page=create-custom');
  await page.locator('#cc-name').fill('Bisi');
  // Deliberately keep ambiguous wording in Q1 (allowed) — creator must review it.
  await fillQuestion(page, 0, 'Would you ever return the money?', ['Yes', 'No'], 0);
  await fillQuestion(page, 1, 'Best city for {name}?', ['Lagos', 'Abuja'], 0);
  await fillQuestion(page, 2, 'Owambe or Netflix for {name}?', ['Owambe', 'Netflix'], 0);
  await page.locator('[data-action="cc-preview"]').click();
  // Explicit-review banner shows because Q1 still says "you".
  await expect(page.getByText(/exactly.*what your friends will see/i)).toBeVisible();
  // Preview wording equals recipient wording: {name} filled, ambiguous text preserved verbatim.
  await expect(page.locator('.question h3').nth(1)).toContainText('Best city for Bisi?');
  await expect(page.locator('.question h3').first()).toContainText('Would you ever return the money?');
});

test('Custom: {name} placeholder renders the creator name in Preview and recipient play', async ({ page }) => {
  await page.goto('/?page=create-custom');
  await page.locator('#cc-name').fill('Amaka');
  await fillQuestion(page, 0, 'What would {name} do for free money?', ['Collect it', 'Return it'], 0);
  await fillQuestion(page, 1, 'Jollof or fried rice for {name}?', ['Jollof', 'Fried rice'], 0);
  await fillQuestion(page, 2, 'Best Saturday for {name}?', ['Outside', 'Indoors'], 0);

  await page.locator('[data-action="cc-preview"]').click();
  // Preview is the exact recipient-facing wording: {name} is filled, no literal token.
  const prev = page.locator('section.panel .question h3').first();
  await expect(prev).toContainText('What would Amaka do');
  await expect(prev).not.toContainText('{name}');

  await page.locator('[data-action="cc-generate"]').click();
  const link = (await page.locator('#share-link').innerText()).trim();
  await page.goto(link);
  const playedQ = page.locator('section.panel h2').first();
  await expect(playedQ).toContainText('Amaka');
  await expect(playedQ).not.toContainText('{name}');
});
