import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let accessToken: string;

// Tags are permanent by design — no role can DELETE one, not even
// service_role, so there's no way to truly remove test data between runs.
// Every value used below is suffixed with this run-scoped tag so tests
// never collide with leftovers from a previous run, instead of depending
// on cleanup. `is_deleted` is soft-deleted best-effort afterward anyway,
// just to keep the table from growing unbounded over many CI runs — that
// needs the service role too, since `authenticated` has no UPDATE on
// `tags` either.
const RUN = Date.now().toString(36);
const v = (name: string) => `e2e${name}${RUN}`;

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
	const res = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=ilike.*${RUN}*&is_deleted=eq.false&select=id`, { headers: h });
	if (res.ok()) {
		for (const t of await res.json()) {
			await request.patch(`${SUPABASE_URL}/rest/v1/tags?id=eq.${t.id}`, { headers: h, data: { is_deleted: true } });
		}
	}
});

test.describe('Tags', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/tags');
		await page.locator('.splash-overlay.done').waitFor({ state: 'attached', timeout: 15_000 });
	});

	test('creates a tag', async ({ page }) => {
		const value = v('newtag');
		await page.locator('.search-input').fill(value);
		await page.getByText('Create New Tag').click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.locator('.preview-value')).toHaveText(value);

		await dialog.getByRole('button', { name: 'Done' }).click();
		await expect(dialog).not.toBeVisible();

		await page.locator('.search-input').fill('');
		await expect(page.getByText(value)).toBeVisible();
	});

	test('sanitizes the value (lowercase, alphanumeric only)', async ({ page }) => {
		const raw = `E2E Weird!! Tag ${RUN}`;
		const sanitized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

		await page.locator('.search-input').fill(raw);
		await page.getByText('Create New Tag').click();

		const dialog = page.getByRole('dialog');
		// the dialog preview shows the raw query, not the sanitized value —
		// sanitization happens on submit, so check the list afterward instead
		await dialog.getByRole('button', { name: 'Done' }).click();
		await expect(dialog).not.toBeVisible();

		await page.locator('.search-input').fill('');
		await expect(page.getByText(sanitized, { exact: true })).toBeVisible();
	});

	test('search filters tags', async ({ page, request }) => {
		const coffee = v('coffee');
		const travel = v('travel');
		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
		await request.post(`${SUPABASE_URL}/functions/v1/create-tag`, { headers: h, data: { value: coffee } });
		await request.post(`${SUPABASE_URL}/functions/v1/create-tag`, { headers: h, data: { value: travel } });

		// no reload needed — Realtime pushes the new rows into Dexie live
		await expect(page.getByText(coffee)).toBeVisible();
		await page.locator('.search-input').fill('coff');
		await expect(page.getByText(coffee)).toBeVisible();
		await expect(page.getByText(travel)).not.toBeVisible();
	});

	test('creating a tag that already exists (different case) reuses it, no duplicate', async ({ page, request }) => {
		const value = v('dupe');
		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
		await request.post(`${SUPABASE_URL}/functions/v1/create-tag`, { headers: h, data: { value } });
		await expect(page.getByText(value)).toBeVisible();

		// A query that differs only in case still matches the existing row
		// via the search box's substring filter, so no "Create New Tag" row
		// is offered — same guarantee the offline dedup in local/tags.ts
		// gives when the query text doesn't line up so neatly (see
		// createTag's own value-based lookup), just observable here too.
		await page.locator('.search-input').fill(value.toUpperCase());
		await expect(page.getByText('Create New Tag')).not.toBeVisible();

		const res = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=eq.${value}&select=id`, {
			headers: { apikey: KEY, Authorization: `Bearer ${accessToken}` },
		});
		expect((await res.json()).length).toBe(1);
	});

	test('offline: creates instantly, absent from server until reconnect, then syncs', async ({ page, request, context }) => {
		test.setTimeout(15_000);
		const value = v('offline');

		await context.setOffline(true);
		await page.locator('.search-input').fill(value);
		await page.getByText('Create New Tag').click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Done' }).click();
		await expect(dialog).not.toBeVisible();

		await page.locator('.search-input').fill('');
		await expect(page.getByText(value)).toBeVisible();

		const h = { apikey: KEY, Authorization: `Bearer ${accessToken}` };
		const whileOffline = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=eq.${value}&select=id`, { headers: h });
		expect((await whileOffline.json()).length).toBe(0);

		await context.setOffline(false);
		await expect(async () => {
			const res = await request.get(`${SUPABASE_URL}/rest/v1/tags?value=eq.${value}&select=id`, { headers: h });
			expect((await res.json()).length).toBe(1);
		}).toPass({ timeout: 10_000 });
	});
});
