import { test, expect } from '@playwright/test';

test('authentication flow', async ({ page }) => {
    // 1. Go to dashboard (should redirect to login)
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Login
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 3. Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
});
