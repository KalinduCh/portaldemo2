
import { test, expect } from '@playwright/test';

test('login and verify sanitized dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.fill('input[name="email"]', 'check22@gmail.com');
  await page.fill('input[name="password"]', '12345KC');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard');

  // Verify sanitized welcome message
  await expect(page.getByText('Welcome to Demo Leo Club...')).toBeVisible();

  // Check sidebar logo or name
  await expect(page.getByText('LEO Portal')).toBeVisible();

  await page.screenshot({ path: 'sanitized_dashboard.png' });
});
