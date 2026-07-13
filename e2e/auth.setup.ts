import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ request }) => {
	const res = await request.post(
		`${process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'}/auth/v1/token?grant_type=password`,
		{
			headers: {
				apikey: process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
			},
			form: {
				email: 'dev@example.com',
				password: 'password123',
			},
		},
	);

	expect(res.ok()).toBeTruthy();
	await request.storageState({ path: authFile });
});
