import { expect, test } from '@playwright/test';

test('loads the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Jarvis Nebula' })).toBeVisible();
  await expect(page.getByText('Phase 6 Voice Commands')).toBeVisible();
  await expect(page.getByLabel('Graph Command')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mic' })).toBeVisible();
  await expect(page.getByText('Graph Status')).toBeVisible();
});
