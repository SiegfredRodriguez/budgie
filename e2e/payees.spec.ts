import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

let accessToken: string;
let userId: string;

test.beforeAll(async ({ request }) => {
	const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(authRes.ok()).toBeTruthy();
	const auth = await authRes.json();
	accessToken = auth.access_token;
	userId = auth.user.id;
});

test.afterAll(async ({ request }) => {
	const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
	const payRes = await request.get(`${SUPABASE_URL}/rest/v1/payees?label=like.*E2E*&select=id`, { headers: h });
	if (payRes.ok()) {
		for (const p of await payRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/payees?id=eq.${p.id}`, { headers: h });
		}
	}
	const tagRes = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=like.*E2E*&select=id`, { headers: h });
	if (tagRes.ok()) {
		for (const t of await tagRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/tags?id=eq.${t.id}`, { headers: h });
		}
	}
});

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

	test('payee tile shows tag pills', async ({ page, request }) => {
		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

		const tagRes = await request.post(`${SUPABASE_URL}/rest/v1/tags`, {
			headers: h,
			data: { value: 'E2E Tag Pill Tag' },
		});
		let tagId: string;
		if (tagRes.ok()) {
			const arr = await tagRes.json();
			tagId = arr[0]?.id;
		} else {
			const existing = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=eq.E2E Tag Pill Tag&select=id`, {
				headers: { apikey: KEY, Authorization: `Bearer ${accessToken}` },
			});
			tagId = (await existing.json())[0]?.id;
		}

		const payeeRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
			data: { label: 'E2E Tagged Payee Tile', icon: 'store', tagIds: [tagId], user_id: userId },
		});
		expect(payeeRes.ok()).toBeTruthy();

		await page.goto('/payees');
		await expect(page.getByText('E2E Tagged Payee Tile')).toBeVisible();
		await expect(page.locator('.tag-pill').filter({ hasText: 'E2E Tag Pill Tag' })).toBeVisible();
	});
});
