import { test, expect } from '@playwright/test';

test.describe('Compliance Audit Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        // Wait for redirect to dashboard or app
        await page.waitForURL(/.*\/app\/dashboard/);
    });

    test('should load compliance page and show selection options', async ({ page }) => {
        await page.goto('/app/dashboard?tab=compliance');

        // Check for title
        await expect(page.getByRole('heading', { name: 'Compliance Audit' })).toBeVisible();
        await expect(page.getByText('Audit your documents against ISO standards using AI.')).toBeVisible();

        // Check for dropdowns
        await expect(page.getByText('Select Document')).toBeVisible();
        await expect(page.getByText('Select ISO Standard')).toBeVisible();

        // Check for button
        await expect(page.getByRole('button', { name: 'Run Compliance Audit' })).toBeVisible();
    });
});
