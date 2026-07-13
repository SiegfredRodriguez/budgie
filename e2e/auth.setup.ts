import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

setup('authenticate', async ({ page }) => {
	const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		headers: { 'Content-Type': 'application/json', apikey: KEY },
		data: { email: 'dev@example.com', password: 'password123' },
	});
	expect(res.ok()).toBeTruthy();
	const auth = await res.json();

	await page.goto('/');
	await page.evaluate(({ key, session }) => {
		const storageKey = `sb-${key}-auth-token`;
		const payload = {
			current_session: session,
			expires_at: session.expires_at,
		};
		localStorage.setItem(storageKey, JSON.stringify(payload));
	}, { key: KEY, session: auth });

	await page.reload();
	await page.waitForTimeout(1000);
	await page.context().storageState({ path: authFile });
});
