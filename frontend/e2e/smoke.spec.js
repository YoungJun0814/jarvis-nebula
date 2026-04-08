import { expect, test } from '@playwright/test';

test('loads the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Jarvis Nebula' })).toBeVisible();
  await expect(page.getByText('Phase 1 MVP Build')).toBeVisible();
  await expect(page.getByLabel('Command Bar')).toBeVisible();
});
