import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	retries: 0,
	workers: 1,
	timeout: 5000,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		viewport: { width: 430, height: 932 },
		actionTimeout: 5000,
		expect: { timeout: 5000 },
	},
	projects: [
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.auth/user.json',
			},
			dependencies: ['setup'],
		},
	],
});
