const { test, expect } = require('@playwright/test');

// Survive Naija 2.0 — full week to Reckoning + device-local save/resume (guest mode).

test('Survive Naija 2.0 is prominent: top nav (desktop), first playground card, direct route', async ({ page, viewport }) => {
  await page.goto('/');
  const welcome = page.getByRole('button', { name: /Let.s go/ });
  if (await welcome.count()) await welcome.click();
  // first playground card links to survive2
  const firstCard = page.locator('.cards .experience').first();
  await expect(firstCard.locator('[data-action="nav"][data-page="survive2"]')).toHaveCount(1);
  // desktop top nav has a direct Survive 2.0 link
  if ((viewport?.width ?? 1280) > 700) {
    await expect(page.locator('nav.toplinks [data-page="survive2"]')).toBeVisible();
  }
  // direct route works
  await page.goto('/?page=survive2');
  await expect(page.locator('[data-action="surv-pick"]')).toHaveCount(3);
});

test('plays a full 7-day run to an explainable Reckoning', async ({ page }) => {
  await page.goto('/?page=survive2');
  await page.locator('[data-action="surv-pick"][data-scenario="payday"]').click();
  await page.locator('[data-action="surv-start"]').click();

  await expect(page.locator('.atl-dash')).toBeVisible();
  await expect(page.locator('.atl-meter')).toHaveCount(7); // broad survival: 7 indicators, not just cash

  let guard = 0;
  while (guard++ < 120) {
    if (await page.locator('.result-hero h2').count()) break;
    const choose = page.locator('[data-action="surv-choose"]:not([disabled])');
    if (await choose.count()) await choose.first().click();
    else {
      const end = page.locator('[data-action="surv-endday"]');
      if (await end.count()) await end.click(); else break;
    }
  }
  await expect(page.locator('.kicker', { hasText: 'The Reckoning' })).toBeVisible();
  await expect(page.locator('.result-hero h2')).not.toBeEmpty();        // an outcome
  await expect(page.getByText('Your people')).toBeVisible();            // relationships reported
  await expect(page.locator('[data-action="surv-share"]')).toBeVisible();
});

test('device-local save/resume: a run in progress can be resumed after reload', async ({ page }) => {
  await page.goto('/?page=survive2');
  await page.locator('[data-action="surv-pick"][data-scenario="payday"]').click();
  await page.locator('[data-action="surv-start"]').click();
  await expect(page.locator('.atl-dash')).toBeVisible();
  // make one move so the run has advanced state, then reload.
  await page.locator('[data-action="surv-choose"]:not([disabled])').first().click();
  await page.goto('/?page=survive2');

  await expect(page.locator('[data-action="surv-resume"]')).toBeVisible(); // resume banner
  await page.locator('[data-action="surv-resume"]').click();
  await expect(page.locator('.atl-dash')).toBeVisible();                   // back in the run
  await expect(page.locator('.kicker', { hasText: /Day \d\/7/ })).toBeVisible();
});
