import { test, expect, type APIRequestContext } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let accessToken: string;

// expense-payee.spec.ts already covers the payee-combobox interaction in
// depth (existing/novel selection, tag copying, keyboard nav). This file
// covers what that one doesn't: that a created expense actually shows up
// with the right amount in the /expenses list and debits the account
// balance, and that — like accounts.spec.ts's top-up/transfer — an offline
// attempt queues instantly and syncs on reconnect rather than failing
// outright, since create-expense is idempotent on its own transaction id
// (00047_ledger_idempotent_retry.sql).
const RUN = Date.now().toString(36);
const v = (name: string) => `E2E ${name} ${RUN}`;

const accountName = v('Expenses Account');

async function createAccount(request: APIRequestContext, name: string, balance: number) {
	const res = await request.post(`${SUPABASE_URL}/functions/v1/create-account`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { name, icon: 'wallet', currency: 'PHP', balance },
	});
	expect(res.ok()).toBeTruthy();
	return (await res.json()).id as string;
}

test.beforeAll(async ({ request }) => {
	const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(authRes.ok()).toBeTruthy();
	accessToken = (await authRes.json()).access_token;
	await createAccount(request, accountName, 2000);
});

test.afterAll(async ({ request }) => {
	const h = { apikey: KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
	const acctRes = await request.get(`${SUPABASE_URL}/rest/v1/accounts?name=ilike.*${RUN}*&is_deleted=eq.false&select=id`, { headers: h });
	if (acctRes.ok()) {
		for (const a of await acctRes.json()) {
			await request.patch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${a.id}`, { headers: h, data: { is_deleted: true } });
		}
	}
	const payRes = await request.get(`${SUPABASE_URL}/rest/v1/payees?label=ilike.*${RUN}*&select=id`, { headers: h });
	if (payRes.ok()) {
		for (const p of await payRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/payees?id=eq.${p.id}`, { headers: h });
		}
	}
});

function cardFor(page: import('@playwright/test').Page, label: string) {
	return page.locator('.card').filter({ hasText: label });
}

test.describe('Expenses', () => {
	test('creating an expense shows it in the list and debits the account', async ({ page }) => {
		test.setTimeout(10_000);
		const label = v('Groceries');
		const payeeLabel = v('Grocery Store');

		await page.goto('/expenses');
		await page.locator('.splash-overlay.done').waitFor({ state: 'attached', timeout: 15_000 });
		await page.locator('button.fab, .pill-btn').first().click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('input[type="number"]').fill('250');
		await dialog.locator('input[placeholder="Label"]').fill(label);
		await dialog.locator('.source-endpoint .source-combo-input').fill(accountName);
		const accountOption = dialog.locator('.source-endpoint .source-option').filter({ hasText: accountName });
		await expect(accountOption).toBeVisible();
		await accountOption.click();
		await expect(dialog.locator('.source-endpoint .source-combo-balance')).toBeVisible();

		await dialog.locator('.payee-endpoint .pill-text').fill(payeeLabel);
		await dialog.locator('.payee-endpoint .source-option-novel').click();
		await expect(dialog.locator('.pill-novel')).toBeVisible();

		await dialog.getByRole('button', { name: 'Done' }).click({ timeout: 8_000 });
		await expect(dialog).not.toBeVisible({ timeout: 8_000 });

		const item = page.locator('.item').filter({ hasText: label });
		await expect(item).toBeVisible();
		await expect(item.locator('.amount')).toHaveText('PHP 250.00');
		await expect(item.locator('.payee')).toHaveText(payeeLabel);

		await page.goto('/accounts');
		await page.locator('.splash-overlay.done').waitFor({ state: 'attached', timeout: 15_000 });
		const card = cardFor(page, accountName);
		await expect(card).toBeVisible();
		await card.locator('.eye-btn').click();
		await expect(card.locator('.card-balance')).toHaveText('PHP 1,750.00');
	});

	test('offline expense creation queues instantly and syncs once reconnected', async ({ page, request, context }) => {
		test.setTimeout(20_000);
		const label = v('Offline Expense');
		const payeeLabel = v('Offline Payee');

		await page.goto('/expenses');
		await page.locator('.splash-overlay.done').waitFor({ state: 'attached', timeout: 15_000 });

		await context.setOffline(true);
		await page.locator('button.fab, .pill-btn').first().click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('input[type="number"]').fill('75');
		await dialog.locator('input[placeholder="Label"]').fill(label);
		await dialog.locator('.source-endpoint .source-combo-input').fill(accountName);
		const accountOption = dialog.locator('.source-endpoint .source-option').filter({ hasText: accountName });
		await expect(accountOption).toBeVisible();
		await accountOption.click();
		await expect(dialog.locator('.source-endpoint .source-combo-balance')).toBeVisible();

		await dialog.locator('.payee-endpoint .pill-text').fill(payeeLabel);
		await dialog.locator('.payee-endpoint .source-option-novel').click();

		await dialog.getByRole('button', { name: 'Done' }).click();

		// The dialog closes as though it worked — create-expense is
		// idempotent on its own transaction id, so it's safe to queue and
		// retry rather than fail outright the way a genuinely non-retriable
		// operation would.
		await expect(dialog).not.toBeVisible();
		const item = page.locator('.item').filter({ hasText: label });
		await expect(item).toBeVisible();
		await expect(item.locator('.status-pending')).toBeVisible();

		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}` };
		const whileOffline = await request.get(`${SUPABASE_URL}/rest/v1/expense_details?label=eq.${encodeURIComponent(label)}&select=id`, { headers: h });
		expect((await whileOffline.json()).length).toBe(0);

		await context.setOffline(false);
		await expect(item.locator('.status-pending')).not.toBeVisible({ timeout: 10_000 });
		await expect(async () => {
			const res = await request.get(`${SUPABASE_URL}/rest/v1/expense_details?label=eq.${encodeURIComponent(label)}&select=id`, { headers: h });
			expect((await res.json()).length).toBe(1);
		}).toPass({ timeout: 10_000 });
	});
});
