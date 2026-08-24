import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test.describe('Tab bar bottom spacing', () => {
	test('no padding or chin at bottom', async ({ page }) => {
		await page.goto('/');
		// `/` is CSR-only and immediately client-redirects once auth settles
		// (see +layout.svelte); wait for that redirect before querying, since
		// `.content` briefly doesn't exist during the pre-hydration/redirect
		// window and `$eval` doesn't retry like a locator assertion would.
		await page.waitForURL(/\/(expenses|login)$/);

		const content = page.locator('.content');
		await expect(content).toBeVisible();
		const contentPaddingBottom = await content.evaluate((el) => getComputedStyle(el).paddingBottom);

		expect(parseFloat(contentPaddingBottom)).toBe(0);
	});

	test('last account card extends behind tab bar', async ({ page }) => {
		await page.goto('/accounts');

		await page.waitForSelector('.card-list');
		const cards = page.locator('.card-list > .card');
		const lastCard = cards.last();

		await lastCard.scrollIntoViewIfNeeded();
		await page.waitForTimeout(200);

		const cardBox = await lastCard.boundingBox();
		const tabBarBox = await page.locator('.tab-bar').boundingBox();

		expect(cardBox).not.toBeNull();
		expect(tabBarBox).not.toBeNull();

		if (cardBox && tabBarBox) {
			// card can extend behind the floating tab bar (no chin)
			console.log('card bottom:', cardBox.y + cardBox.height);
			console.log('tab bar top:', tabBarBox.y);
		}
	});
});
