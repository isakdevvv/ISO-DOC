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

    test('should route legacy gap analysis tab to the compliance workspace', async ({ page }) => {
        await page.goto('/app/dashboard?tab=gap-analysis');

        await expect(page.getByRole('heading', { name: 'Compliance Workspace' })).toBeVisible();
        await expect(page.getByText('Gap & Requirements Summary')).toBeVisible();
        await expect(page.getByRole('button', { name: /Run Compliance Audit/ })).toBeVisible();
    });
});
