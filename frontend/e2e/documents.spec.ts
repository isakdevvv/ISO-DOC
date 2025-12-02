import { test, expect } from '@playwright/test';

test.describe('Documents Flow', () => {
    test('should load dashboard and show empty state or list', async ({ page }) => {
        await page.goto('/dashboard');

        // Check for title
        await expect(page.getByText('ISO Doc Platform')).toBeVisible();
        await expect(page.getByText('Manage your compliance documents')).toBeVisible();

        // Check for table headers
        await expect(page.getByText('Name')).toBeVisible();
        await expect(page.getByText('Status')).toBeVisible();
    });

    // Note: We can't easily test upload with real backend in E2E without resetting DB state
    // or handling unique filenames. For now, we verify the UI elements exist.
    test('should show upload button', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.getByLabel('Upload Document')).toBeVisible();
    });
});
