# Dev Journal

## 2026-08-24

### Completed — audit fix pass (branch `fix/audit-findings`)
- Edge functions (`create-account`, `top-up-account`, `transfer-account`, `create-expense`, `create-payee`, `create-tag`) now verify the caller's session JWT via `auth.getUser()` instead of trusting a client-supplied `user_id`; client sends the real session token instead of the anon key (`src/lib/api.ts`)
- Restricted `account-icons` storage bucket writes to `authenticated` (was `anon`, unauthenticated)
- Revoked unused `insert`/`update` grants on `accounts` for `authenticated` (nothing in the client used them; they let a user bypass the ledger RPCs and edit their own balance directly) and stale pre-RLS `select`/`delete` grants for `anon`
- Added CHECK constraints on `transactions.type` and the currency columns
- Fixed hardcoded `'PHP'` in top-up/transfer to use the account's real currency
- Added ESLint + Prettier config, a CI workflow (`.github/workflows/e2e.yml`), and `test:e2e`/`test:e2e:ci` npm scripts
- Added a global Snackbar (`src/lib/stores/snackbar.ts`) so failed mutations surface to the user instead of only `console.error`
- Extracted `src/lib/format.ts` (was duplicated across 8 components) and `src/lib/types/db.ts` (replaces `any` row mappers)
- Splash screen now waits for `bootstrapReady`, not just a flat 2s timer

### Known Issues (superseded — see above)
- ~~Top-up and transfer operations are local-state-only (not persisted to DB)~~ — persisted via edge functions since before this pass
- No DELETE transaction type in the schema yet (`transactions.type` CHECK now covers CREATION/TOP_UP/TRANSFER/EXPENSE only)
- Accounts have mixed currencies summed without conversion (accounts hero total) — not addressed this pass

### Next
- Add a DELETION transaction type if account deletion should leave a ledger trace
- Currency conversion for the multi-currency accounts total
