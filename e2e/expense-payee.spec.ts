import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

let accessToken: string;
let userId: string;
let accountId: string;
let greenPayeeId: string;
let removablePayeeId: string;
let enterPayeeId: string;
let escapePayeeId: string;
let existingFlowPayeeId: string;
let tagCopyTagId: string;
let tagCopyPayeeId: string;
let tagCopyExpenseId: string;

test.beforeAll(async ({ request }) => {
	const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(authRes.ok()).toBeTruthy();
	const auth = await authRes.json();
	accessToken = auth.access_token;
	userId = auth.user.id;

	const acctRes = await request.post(`${SUPABASE_URL}/functions/v1/create-account`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { name: 'E2E Test Account', icon: 'bank', currency: 'PHP', balance: 10000, user_id: userId },
	});
	expect(acctRes.ok()).toBeTruthy();
	accountId = (await acctRes.json()).id;

	const greenRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { label: 'E2E Green Pill Payee', icon: 'store', user_id: userId },
	});
	expect(greenRes.ok()).toBeTruthy();
	greenPayeeId = (await greenRes.json()).id;

	const removableRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { label: 'E2E Removable Payee', icon: 'store', user_id: userId },
	});
	expect(removableRes.ok()).toBeTruthy();
	removablePayeeId = (await removableRes.json()).id;

	const enterRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { label: 'E2E Enter Match', icon: 'store', user_id: userId },
	});
	expect(enterRes.ok()).toBeTruthy();
	enterPayeeId = (await enterRes.json()).id;

	const escapeRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { label: 'E2E Escape Payee', icon: 'store', user_id: userId },
	});
	expect(escapeRes.ok()).toBeTruthy();
	escapePayeeId = (await escapeRes.json()).id;

	const existFlowRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { label: 'E2E Existing Flow', icon: 'store', user_id: userId },
	});
	expect(existFlowRes.ok()).toBeTruthy();
	existingFlowPayeeId = (await existFlowRes.json()).id;

	const tagRes = await request.post(`${SUPABASE_URL}/rest/v1/tags`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
		data: { value: 'E2E Tag Copy Tag' },
	});
	if (tagRes.ok()) {
		const tagArr = await tagRes.json();
		tagCopyTagId = tagArr[0]?.id;
	} else {
		const existing = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=eq.E2E Tag Copy Tag&select=id`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}` },
		});
		const arr = await existing.json();
		tagCopyTagId = arr[0]?.id;
	}

	if (tagCopyTagId) {
		const payeeTagRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
			data: { label: 'E2E Tag Copy Payee', icon: 'store', tagIds: [tagCopyTagId], user_id: userId },
		});
		expect(payeeTagRes.ok()).toBeTruthy();
		tagCopyPayeeId = (await payeeTagRes.json()).id;

		const expRes = await request.post(`${SUPABASE_URL}/functions/v1/create-expense`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
			data: {
				account_id: accountId,
				amount: 100,
				label: 'E2E Tag Copy Expense',
				date: new Date().toISOString().slice(0, 10),
				user_id: userId,
				payee_id: tagCopyPayeeId,
			},
		});
		expect(expRes.ok()).toBeTruthy();
		tagCopyExpenseId = (await expRes.json()).expense.id;
	}
});

test.afterAll(async ({ request }) => {
	const h = apiHeaders();
	const expRes = await request.get(`${SUPABASE_URL}/rest/v1/expense_details?label=like.*E2E*&select=id`, { headers: h });
	if (expRes.ok()) {
		for (const e of await expRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/expense_details?id=eq.${e.id}`, { headers: h });
		}
	}
	const payRes = await request.get(`${SUPABASE_URL}/rest/v1/payees?label=like.*E2E*&select=id`, { headers: h });
	if (payRes.ok()) {
		for (const p of await payRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/payees?id=eq.${p.id}`, { headers: h });
		}
	}
	const tagRes = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=like.*E2E*&select=id`, { headers: apiHeaders() });
	if (tagRes.ok()) {
		for (const t of await tagRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/tags?id=eq.${t.id}`, { headers: apiHeaders() });
		}
	}
});

function apiHeaders(auth = true) {
	const h: Record<string, string> = { apikey: KEY, 'Content-Type': 'application/json' };
	if (auth) h['Authorization'] = `Bearer ${accessToken}`;
	return h;
}

async function openDialog(page: Page) {
	await page.goto('/');
	await page.locator('button.fab').click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

async function fillBaseFields(page: Page) {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input[type="number"]').fill('100');
	await dialog.locator('input[placeholder="Label"]').fill('E2E Label');
	await dialog.locator('.source-endpoint .source-combo-input').click();
	await dialog.locator('.source-endpoint .source-option').first().click();
}

test.describe('Expense payee field', () => {
	test('Done button disabled without payee', async ({ page }) => {
		await openDialog(page);
		await fillBaseFields(page);
		const done = page.getByRole('dialog').getByRole('button', { name: 'Done' });
		await expect(done).toBeDisabled();
	});

	test('existing payee shows green pill', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Green');
		await dialog.locator('.payee-endpoint .source-option').filter({ hasText: 'E2E Green Pill Payee' }).click();
		await expect(dialog.locator('.pill-existing')).toBeVisible();
		await expect(dialog.locator('.pill-existing')).toHaveText('E2E Green Pill Payee');
		await expect(dialog.locator('.payee-endpoint .pill-text')).not.toBeVisible();
	});

	test('novel payee shows orange pill', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Brand New Payee');
		await dialog.locator('.payee-endpoint .source-option-novel').click();
		await expect(dialog.locator('.pill-novel')).toBeVisible();
		await expect(dialog.locator('.pill-novel')).toHaveText('+ E2E Brand New Payee');
	});

	test('removing pill reverts to input', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Removable');
		await dialog.locator('.payee-endpoint .source-option').filter({ hasText: 'E2E Removable Payee' }).click();
		await expect(dialog.locator('.pill-existing')).toBeVisible();
		await dialog.locator('.pill-x').click();
		await expect(dialog.locator('.pill-existing')).not.toBeVisible();
		await expect(dialog.locator('.payee-endpoint .pill-text')).toBeVisible();
		await expect(dialog.locator('.payee-endpoint .pill-text')).toHaveValue('');
	});

	test('Enter selects first suggestion', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Enter');
		await dialog.locator('.payee-endpoint .pill-text').press('Enter');
		await expect(dialog.locator('.pill-existing')).toBeVisible();
		await expect(dialog.locator('.pill-existing')).toHaveText('E2E Enter Match');
	});

	test('Enter creates novel when no match', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E xyz_novel');
		await dialog.locator('.payee-endpoint .pill-text').press('Enter');
		await expect(dialog.locator('.pill-novel')).toBeVisible();
		await expect(dialog.locator('.pill-novel')).toHaveText('+ E2E xyz_novel');
	});

	test('Escape closes dropdown', async ({ page }) => {
		await openDialog(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Escape');
		await expect(dialog.locator('.payee-endpoint .source-dropdown')).toBeVisible();
		await dialog.locator('.payee-endpoint .pill-text').press('Escape');
		await expect(dialog.locator('.payee-endpoint .source-dropdown')).not.toBeVisible();
	});

	test('full flow with existing payee', async ({ page }) => {
		await openDialog(page);
		await fillBaseFields(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Existing');
		await dialog.locator('.payee-endpoint .source-option').filter({ hasText: 'E2E Existing Flow' }).click();
		await expect(dialog.locator('.pill-existing')).toBeVisible();
		await dialog.getByRole('button', { name: 'Done' }).click();
		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('E2E Label').first()).toBeVisible();
	});

	test('full flow with novel payee', async ({ page }) => {
		await openDialog(page);
		await fillBaseFields(page);
		const dialog = page.getByRole('dialog');
		await dialog.locator('.payee-endpoint .pill-text').fill('E2E Novel Flow');
		await dialog.locator('.payee-endpoint .source-option-novel').click();
		await expect(dialog.locator('.pill-novel')).toBeVisible();
		await dialog.getByRole('button', { name: 'Done' }).click();
		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('E2E Label').first()).toBeVisible();
		await page.goto('/payees');
		await expect(page.getByText('E2E Novel Flow')).toBeVisible();
	});

	test('payee is mandatory', async ({ page }) => {
		await openDialog(page);
		await fillBaseFields(page);
		const done = page.getByRole('dialog').getByRole('button', { name: 'Done' });
		await expect(done).toBeDisabled();
	});

	test('existing payee tags copied to expense', async ({ request }) => {
		expect(tagCopyTagId).toBeTruthy();
		expect(tagCopyPayeeId).toBeTruthy();
		expect(tagCopyExpenseId).toBeTruthy();
		const tagsRes = await request.get(`${SUPABASE_URL}/rest/v1/expenses_tags?expense_id=eq.${tagCopyExpenseId}&select=tag_id`, {
			headers: apiHeaders(),
		});
		expect(tagsRes.ok()).toBeTruthy();
		const tags = await tagsRes.json();
		expect(tags.some((t: { tag_id: string }) => t.tag_id === tagCopyTagId)).toBeTruthy();
	});
});
