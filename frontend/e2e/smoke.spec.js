import { expect, test } from '@playwright/test';

test('loads the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Jarvis Nebula' })).toBeVisible();
  await expect(page.getByText('Phase 0 scaffold is complete')).toBeVisible();
});
