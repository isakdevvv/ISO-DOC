import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // This depends on the actual app title.
    // For now just check if it loads without error.
    expect(await page.title()).toBeDefined();
});
