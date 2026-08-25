import { test, expect, type APIRequestContext } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let accessToken: string;

// Unlike tags, accounts *can* be (soft-)deleted, but the page shows every
// account a user has with no filter — so leftover accounts from earlier
// runs would just pile up in the list rather than break any one test.
// Every value here still gets a run-scoped suffix so assertions can target
// a specific card without ambiguity, and afterAll best-effort soft-deletes
// them via the service role (accounts can't be hard-deleted by a client
// since 00043, matching tags' permanence).
const RUN = Date.now().toString(36);
const v = (name: string) => `E2E ${name} ${RUN}`;

async function createAccount(request: APIRequestContext, name: string, balance = 0) {
	const res = await request.post(`${SUPABASE_URL}/functions/v1/create-account`, {
		headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		data: { name, icon: 'wallet', currency: 'PHP', balance },
	});
	expect(res.ok()).toBeTruthy();
	return (await res.json()).id as string;
}

function cardFor(page: import('@playwright/test').Page, label: string) {
	return page.locator('.card').filter({ hasText: label });
}

async function revealBalance(card: ReturnType<typeof cardFor>) {
	await card.locator('.eye-btn').click();
}

test.beforeAll(async ({ request }) => {
	const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(authRes.ok()).toBeTruthy();
	accessToken = (await authRes.json()).access_token;
});

test.afterAll(async ({ request }) => {
	const h = { apikey: KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
	const res = await request.get(`${SUPABASE_URL}/rest/v1/accounts?name=ilike.*${RUN}*&is_deleted=eq.false&select=id`, { headers: h });
	if (res.ok()) {
		for (const a of await res.json()) {
			await request.patch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${a.id}`, { headers: h, data: { is_deleted: true } });
		}
	}
});

test.describe('Accounts', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/accounts');
		await page.locator('.splash-overlay.done').waitFor({ state: 'attached', timeout: 15_000 });
	});

	test('creates an account via the dialog', async ({ page }) => {
		test.setTimeout(15_000);
		const name = v('New Account');
		await page.getByText('New Account').first().click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('#name').fill(name);
		await dialog.locator('#initial').fill('1500');
		await dialog.getByRole('button', { name: 'Create Account' }).click({ timeout: 10_000 });

		await expect(dialog).not.toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(name)).toBeVisible();
	});

	test('top up increases the balance', async ({ page, request }) => {
		// Same tight-default-timeout issue as the transfer test above — a
		// real server round trip plus dev-server/LaunchDarkly overhead can
		// occasionally land close to this file's 5s default.
		test.setTimeout(15_000);
		const name = v('TopUp Target');
		await createAccount(request, name, 1000);
		await page.goto('/accounts');

		const card = cardFor(page, name);
		await expect(card).toBeVisible();
		await revealBalance(card);
		await expect(card.locator('.card-balance')).toHaveText('PHP 1,000.00');

		await card.getByRole('button', { name: 'Top Up' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('.modal-input').fill('250');
		await dialog.getByRole('button', { name: 'Top Up' }).click({ timeout: 10_000 });
		await expect(dialog).not.toBeVisible({ timeout: 10_000 });

		await expect(card.locator('.card-balance')).toHaveText('PHP 1,250.00');
	});

	test('transfer moves the balance between two accounts', async ({ page, request }) => {
		// Heavier than this file's other tests (two accounts created via API
		// plus a combobox interaction) and was landing right on the file's
		// default 5s test timeout under normal dev-server/LaunchDarkly
		// overhead — not a hang, just tight. Same pattern the offline tests
		// below already use for their own heavier flows.
		test.setTimeout(20_000);
		const sourceName = v('Transfer Source');
		const targetName = v('Transfer Target');
		await createAccount(request, sourceName, 1000);
		await createAccount(request, targetName, 0);
		await page.goto('/accounts');

		const sourceCard = cardFor(page, sourceName);
		const targetCard = cardFor(page, targetName);
		await expect(sourceCard).toBeVisible();
		await expect(targetCard).toBeVisible();

		await sourceCard.getByRole('button', { name: 'Transfer' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('.source-combo-input').fill(targetName);
		const targetOption = dialog.locator('.source-option').filter({ hasText: targetName });
		await expect(targetOption).toBeVisible();
		await targetOption.click();
		// AccountCombobox's input hides the dropdown on blur after a 150ms
		// timeout; without waiting for the selection to actually land (the
		// combo's balance readout appearing confirms it did), a fast click
		// on the option can race that blur and land on nothing.
		await expect(dialog.locator('.source-combo-balance')).toBeVisible();
		await dialog.locator('.modal-input').fill('400');
		await dialog.getByRole('button', { name: 'Transfer' }).click({ timeout: 15_000 });
		await expect(dialog).not.toBeVisible({ timeout: 15_000 });

		await revealBalance(sourceCard);
		await revealBalance(targetCard);
		await expect(sourceCard.locator('.card-balance')).toHaveText('PHP 600.00');
		await expect(targetCard.locator('.card-balance')).toHaveText('PHP 400.00');
	});

	test('offline: creates instantly, absent from server until reconnect, then syncs', async ({ page, request, context }) => {
		test.setTimeout(15_000);
		const name = v('Offline Account');

		await context.setOffline(true);
		await page.getByText('New Account').first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.locator('#name').fill(name);
		await dialog.getByRole('button', { name: 'Create Account' }).click();
		await expect(dialog).not.toBeVisible();
		await expect(page.getByText(name)).toBeVisible();

		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}` };
		const whileOffline = await request.get(`${SUPABASE_URL}/rest/v1/accounts?name=eq.${encodeURIComponent(name)}&select=id`, { headers: h });
		expect((await whileOffline.json()).length).toBe(0);

		await context.setOffline(false);
		await expect(async () => {
			const res = await request.get(`${SUPABASE_URL}/rest/v1/accounts?name=eq.${encodeURIComponent(name)}&select=id`, { headers: h });
			expect((await res.json()).length).toBe(1);
		}).toPass({ timeout: 10_000 });
	});

	test('offline top-up fails and rolls back instead of silently queueing', async ({ page, request, context }) => {
		// Unlike account creation (idempotent, safe to retry), a top-up
		// really moves money — see LocalTransaction's doc comment in db.ts.
		// It must not queue itself for a later retry; it should fail
		// immediately and restore the pre-top-up balance.
		const name = v('Offline TopUp Target');
		await createAccount(request, name, 1000);
		await page.goto('/accounts');

		const card = cardFor(page, name);
		await expect(card).toBeVisible();
		await revealBalance(card);
		await expect(card.locator('.card-balance')).toHaveText('PHP 1,000.00');

		await context.setOffline(true);
		await card.getByRole('button', { name: 'Top Up' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('.modal-input').fill('250');
		await dialog.getByRole('button', { name: 'Top Up' }).click();

		// handleTopUpDone only closes the dialog on success, so it stays open
		// here — the error surfaces via the snackbar instead.
		await expect(page.locator('.snackbar.error')).toBeVisible();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(card.locator('.card-balance')).toHaveText('PHP 1,000.00');

		await context.setOffline(false);
	});
});
