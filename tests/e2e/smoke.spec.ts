import { test, expect } from '@playwright/test';

test('user can navigate from landing to station chart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore' }).click();
  await page.getByRole('button', { name: 'Stationen suchen' }).click();
  await expect(page.getByText('Gefundene Stationen')).toBeVisible();
  const firstStation = page.locator('a', { hasText: 'Zur Auswertung' }).first();
  await firstStation.click();
  await expect(page.getByText('Jahresmittelwerte')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
