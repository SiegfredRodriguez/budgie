import { test, expect, type APIRequestContext } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let accessToken: string;
let userId: string;

// The "Create New Payee" row only renders when the payee list is empty
// (see payees/+page.svelte), so every test in this file needs the list
// actually empty when it starts — not just eventually cleaned up once at
// the end. Run this after each test, not only after all of them.
async function cleanupE2ePayeesAndTagsOnce(request: APIRequestContext) {
	const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
	const payRes = await request.get(`${SUPABASE_URL}/rest/v1/payees?label=like.*E2E*&select=id`, { headers: h });
	if (payRes.ok()) {
		for (const p of await payRes.json()) {
			await request.delete(`${SUPABASE_URL}/rest/v1/payees?id=eq.${p.id}`, { headers: h });
		}
	}
	// Tags are permanent by design — no role has ever had DELETE on `tags`,
	// not even service_role, so this soft-deletes instead (which needs the
	// service role: `authenticated` has no UPDATE on `tags` either). Also
	// matches case-insensitively (`ilike`, not `like`): tag values are
	// sanitized to lowercase before storage, so a literal "*E2E*" pattern
	// silently missed every one of them and this cleanup never actually
	// touched a tag before now.
	const tagH = { apikey: KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
	const tagRes = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=ilike.*e2e*&is_deleted=eq.false&select=id`, { headers: tagH });
	if (tagRes.ok()) {
		for (const t of await tagRes.json()) {
			await request.patch(`${SUPABASE_URL}/rest/v1/tags?id=eq.${t.id}`, { headers: tagH, data: { is_deleted: true } });
		}
	}
}

// Payees/tags created through the UI now write to IndexedDB first and sync
// to the server in the background (fire-and-forget) — a test's assertions
// pass as soon as the local write lands, well before that push necessarily
// has. A single cleanup pass right after can query the server too early,
// find nothing, and then the delayed push lands afterward with nothing
// left to remove it — leaking into the next test. Run the pass twice with
// a short gap so a push that was still in flight gets caught the second
// time around.
async function cleanupE2ePayeesAndTags(request: APIRequestContext) {
	await cleanupE2ePayeesAndTagsOnce(request);
	await new Promise((r) => setTimeout(r, 500));
	await cleanupE2ePayeesAndTagsOnce(request);
}

test.beforeAll(async ({ request }) => {
	const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(authRes.ok()).toBeTruthy();
	const auth = await authRes.json();
	accessToken = auth.access_token;
	userId = auth.user.id;
	await cleanupE2ePayeesAndTags(request);
});

test.afterEach(async ({ request }) => {
	await cleanupE2ePayeesAndTags(request);
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

		await dialog.locator('.name-input').fill('E2E Starbucks');
		await dialog.getByRole('button', { name: 'Create Payee' }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('E2E Starbucks')).toBeVisible();
	});

	test('creates payee with tag', async ({ page }) => {
		await page.getByText('Create New Payee').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.locator('.name-input').fill('E2E Coffee Shop');

		const tagsInput = dialog.locator('input[placeholder*="tag" i]');
		await tagsInput.fill('E2E food');
		await tagsInput.press('Enter');

		await dialog.getByRole('button', { name: 'Create Payee' }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page.getByText('E2E Coffee Shop')).toBeVisible();
	});

	test('search filters payees', async ({ page, request }) => {
		// The "Create New Payee" row only renders on an empty list (see the
		// cleanup helper above), so a second payee can't be added through
		// this page's UI once one exists — seed both directly instead.
		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
		await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
			headers: h,
			data: { label: 'E2E Starbucks', icon: 'store', user_id: userId },
		});
		await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
			headers: h,
			data: { label: 'E2E McDonalds', icon: 'store', user_id: userId },
		});

		await page.goto('/payees');
		await expect(page.getByText('E2E Starbucks')).toBeVisible();
		await expect(page.getByText('E2E McDonalds')).toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('Star');
		await expect(page.getByText('E2E Starbucks')).toBeVisible();
		await expect(page.getByText('E2E McDonalds')).not.toBeVisible();
	});

	test('empty search shows all payees', async ({ page }) => {
		await page.getByText('Create New Payee').click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('.name-input').fill('E2E Test Payee');
		await dialog.getByRole('button', { name: 'Create Payee' }).click();
		await expect(page.getByText('E2E Test Payee')).toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('xyz');
		await expect(page.getByText('E2E Test Payee')).not.toBeVisible();

		await page.getByPlaceholder('Search payees…').fill('');
		await expect(page.getByText('E2E Test Payee')).toBeVisible();
	});

	test('payee tile shows tag pills', async ({ page, request }) => {
		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

		// Run-unique value: a fixed literal here can collide with a tag from a
		// prior run that the afterEach cleanup soft-deleted (tags can never be
		// hard-deleted). The old code fell back to looking that row up by
		// value while ignoring `is_deleted`, silently linking the payee to a
		// tombstoned tag — which the app then correctly hides from the tile,
		// making this assertion fail for reasons that have nothing to do with
		// the app itself. A unique value every run avoids ever hitting that
		// fallback path.
		const tagValue = `E2E Tag Pill Tag ${Date.now()}`;

		const tagRes = await request.post(`${SUPABASE_URL}/rest/v1/tags`, {
			headers: h,
			data: { value: tagValue },
		});
		expect(tagRes.ok()).toBeTruthy();
		const tagId = (await tagRes.json())[0]?.id;

		const payeeRes = await request.post(`${SUPABASE_URL}/functions/v1/create-payee`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
			data: { label: 'E2E Tagged Payee Tile', icon: 'store', tagIds: [tagId], user_id: userId },
		});
		expect(payeeRes.ok()).toBeTruthy();

		await page.goto('/payees');
		await expect(page.getByText('E2E Tagged Payee Tile')).toBeVisible();
		await expect(page.locator('.tag-pill').filter({ hasText: tagValue })).toBeVisible();
	});
});
