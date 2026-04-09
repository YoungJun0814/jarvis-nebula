import { expect, test } from '@playwright/test';

test('loads the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Jarvis Nebula' })).toBeVisible();
  await expect(page.getByText('Phase 2 Live Graph')).toBeVisible();
  await expect(page.getByLabel('Graph Command')).toBeVisible();
  await expect(page.getByText('Graph Status')).toBeVisible();
});
