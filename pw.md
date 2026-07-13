# Playwright — Budgie E2E Testing Reference

## Setup

```bash
npx sv add playwright   # Svelte CLI add-on (adds config, scripts, demo test, .gitignore)
```

Or manual:
```bash
npm init playwright@latest   # installs @playwright/test + browsers
npx playwright install       # re-download browsers
```

Project already has `@playwright/test` in devDeps and `e2e/tab-bar.spec.ts`.

## Config (`playwright.config.ts`)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 430, height: 932 },  // iPhone 14 Pro Max
    trace: 'on-first-retry',
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
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      name: 'Svelte',
    },
    {
      command: 'npx supabase functions serve',
      url: 'http://127.0.0.1:54321/functions/v1/',
      reuseExistingServer: !process.env.CI,
      name: 'Supabase',
      timeout: 120_000,
    },
  ],
});
```

Key options:
- `webServer` array — launches multiple servers before tests
- `reuseExistingServer: !process.env.CI` — reuses local dev server, fresh on CI
- `storageState` — loads saved auth cookies/localStorage per project
- `dependencies: ['setup']` — runs auth setup before test projects
- `testMatch: /.*\.setup\.ts/` — separates setup files from test files

## Auth Setup

`playwright/.auth/` must be in `.gitignore`:

```bash
mkdir -p playwright/.auth
echo $'\nplaywright/.auth' >> .gitignore
```

### `e2e/auth.setup.ts` — Sign in via Supabase API (fast, no UI)

```ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ request }) => {
  const res = await request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
    headers: {
      apikey: process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    },
    form: {
      email: 'test@example.com',
      password: 'testpassword123',
    },
  });

  expect(res.ok()).toBeTruthy();
  const { access_token, refresh_token } = await res.json();

  // Save storage state (cookies + localStorage)
  await request.storageState({ path: authFile });
});
```

Alternative: sign in via UI (slower but tests the login flow):

```ts
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('testpassword123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: authFile });
});
```

## Locators (Priority Order)

Use user-facing attributes first. All auto-wait and retry.

```ts
// 1. By role — best for buttons, headings, links, checkboxes
page.getByRole('button', { name: 'Save' })
page.getByRole('heading', { name: 'Payees' })
page.getByRole('link', { name: /expenses/i })

// 2. By label / placeholder — form controls
page.getByLabel('Email')
page.getByPlaceholder('Search payees…')

// 3. By text — non-interactive elements
page.getByText('Create New Payee')
page.getByText('No payees yet', { exact: true })

// 4. By test id — fallback (add data-testid to element)
page.getByTestId('payee-list')

// 5. CSS / XPath — last resort
page.locator('.search-input')
```

### Filtering

```ts
// Filter by text content
page.getByRole('listitem').filter({ hasText: 'Coffee Shop' })

// Filter by descendant
page.getByRole('listitem').filter({ has: page.getByText('tag-name') })

// Chain filters
page.getByRole('listitem')
  .filter({ hasText: 'Coffee' })
  .filter({ has: page.getByRole('button', { name: 'Delete' }) })
```

### Chaining

```ts
const dialog = page.getByTestId('payee-dialog');
await dialog.getByLabel('Name').fill('Starbucks');
await dialog.getByRole('button', { name: 'Save' }).click();
```

## Assertions

All async — they wait for the condition automatically.

```ts
// Visibility
await expect(page.getByText('Payees')).toBeVisible();
await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

// Text content
await expect(page.getByText('Starbucks')).toBeVisible();
await expect(page.getByRole('heading')).toHaveText('Payees');

// Count
await expect(page.getByRole('listitem')).toHaveCount(3);

// URL / Title
await expect(page).toHaveURL('/payees');
await expect(page).toHaveTitle(/Budgie/);

// Input value
await expect(page.getByLabel('Name')).toHaveText('Starbucks');

// Checkbox
await expect(page.getByRole('checkbox')).toBeChecked();
```

## Test Structure

```ts
import { test, expect } from '@playwright/test';

test.describe('Payees', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/payees');
  });

  test('shows empty state', async ({ page }) => {
    await expect(page.getByText('Create New Payee')).toBeVisible();
  });

  test('creates a payee', async ({ page }) => {
    await page.getByRole('button', { name: /create/i }).click();
    await page.getByLabel('Name').fill('Starbucks');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Starbucks')).toBeVisible();
  });

  test('searches payees', async ({ page }) => {
    await page.getByPlaceholder('Search payees…').fill('Star');
    await expect(page.getByText('Starbucks')).toBeVisible();
    await expect(page.getByText('Other Shop')).not.toBeVisible();
  });
});
```

## Custom Fixtures

```ts
import { test as base, type Page } from '@playwright/test';

// Page Object Model as fixture
class PayeesPage {
  constructor(public readonly page: Page) {}

  async goto() { await this.page.goto('/payees'); }
  async createPayee(name: string) {
    await this.page.getByRole('button', { name: /create/i }).click();
    await this.page.getByLabel('Name').fill(name);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}

type MyFixtures = { payeesPage: PayeesPage };

export const test = base.extend<MyFixtures>({
  payeesPage: async ({ page }, use) => {
    const payeesPage = new PayeesPage(page);
    await payeesPage.goto();
    await use(payeesPage);
    // teardown here if needed
  },
});

export { expect } from '@playwright/test';
```

Usage:
```ts
import { test, expect } from './fixtures';

test('create payee', async ({ payeesPage }) => {
  await payeesPage.createPayee('Starbucks');
  await expect(payeesPage.page.getByText('Starbucks')).toBeVisible();
});
```

## Worker-Scoped Fixtures (Shared Across Tests)

```ts
export const test = base.extend<{}, { workerAccount: Account }>({
  workerAccount: [async ({ browser }, use, workerInfo) => {
    const account = { email: `user${workerInfo.workerIndex}@test.com`, password: 'pass' };
    // create account via API...
    await use(account);
  }, { scope: 'worker' }],
});
```

## Running Tests

```bash
npx playwright test                          # all tests, all browsers
npx playwright test --project=chromium       # single browser
npx playwright test --headed                 # visible browser
npx playwright test --ui                     # UI mode (watch, time travel)
npx playwright test e2e/payees.spec.ts       # single file
npx playwright test -g "creates a payee"     # by test name
npx playwright show-report                   # HTML report
```

## Common Patterns

### Wait for navigation
```ts
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForURL('/payees');
```

### Wait for list to update (Realtime)
```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByText('New Item')).toBeVisible(); // waits for Realtime update
```

### Dialog / Modal
```ts
await expect(page.getByRole('dialog')).toBeVisible();
await page.getByRole('dialog').getByLabel('Name').fill('Test');
await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('dialog')).not.toBeVisible();
```

### Intercept API calls
```ts
await page.route('**/functions/v1/create-payee', async (route) => {
  await route.fulfill({ status: 200, body: JSON.stringify({ id: 'mock-id', label: 'Mock' }) });
});
```

### Mobile viewport (already configured)
```ts
// playwright.config.ts has viewport: { width: 430, height: 932 }
// No need for device emulation in tests
```

## Debugging

```bash
npx playwright test --debug              # step through with inspector
npx playwright test --trace on           # record traces for all tests
npx playwright show-trace trace.zip      # view trace
npx playwright codegen http://localhost:5173  # record interactions as code
```
