import { test, expect } from '@playwright/test';

test.describe('Payees', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/payees');
	});

	test('shows empty state with create button', async ({ page }) => {
		await expect(page.getByText('Create New Payee')).toBeVisible();
	});

	test('creates a payee', async ({ page }) => {
		await page.getByText('Create New Payee').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.locator('input[type="text"]').fill('Starbucks');
		await dialog.getByRole('button', { name: 'Create Payee' }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('Starbucks')).toBeVisible();
	});

	test('creates payee with tag', async ({ page }) => {
		await page.getByText('Create New Payee').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.locator('input[type="text"]').fill('Coffee Shop');

		const tagsInput = dialog.locator('input[placeholder*="tag" i]');
		await tagsInput.fill('food');
		await tagsInput.press('Enter');

		await dialog.getByRole('button', { name: 'Create Payee' }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('Coffee Shop')).toBeVisible();
	});

	test('search filters payees', async ({ page }) => {
		await page.getByText('Create New Payee').click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('input[type="text"]').fill('Starbucks');
		await dialog.getByRole('button', { name: 'Create Payee' }).click();
		await expect(page.getByText('Starbucks')).toBeVisible();

		await page.getByText('Create New Payee').click();
		const dialog2 = page.getByRole('dialog');
		await dialog2.locator('input[type="text"]').fill('McDonalds');
		await dialog2.getByRole('button', { name: 'Create Payee' }).click();
		await expect(page.getByText('McDonalds')).toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('Star');
		await expect(page.getByText('Starbucks')).toBeVisible();
		await expect(page.getByText('McDonalds')).not.toBeVisible();
	});

	test('empty search shows all payees', async ({ page }) => {
		await page.getByText('Create New Payee').click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('input[type="text"]').fill('Test Payee');
		await dialog.getByRole('button', { name: 'Create Payee' }).click();
		await expect(page.getByText('Test Payee')).toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('xyz');
		await expect(page.getByText('Test Payee')).not.toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('');
		await expect(page.getByText('Test Payee')).toBeVisible();
	});
});
