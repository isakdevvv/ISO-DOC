import { test, expect } from '@playwright/test';

test.describe('Gap Analysis Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        // Wait for redirect to dashboard or app
        await page.waitForURL(/.*\/app\/dashboard/);
    });

    test('should load gap analysis page and show generate report button', async ({ page }) => {
        await page.goto('/app/dashboard?tab=gap-analysis');

        // Check for title
        await expect(page.getByRole('heading', { name: 'Gap Analysis' })).toBeVisible();

        // Check for dropdown
        await expect(page.getByText('Select ISO Standard')).toBeVisible();

        // Check for buttons
        await expect(page.getByRole('button', { name: 'Run Gap Analysis' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Generate Full Report' })).toBeVisible();
    });
});
