# Dev Journal

## 2026-07-05

### Completed
- Set up local Supabase (no remote), migrated schema 00001–00005
- Real-time subscription on `accounts` table with refetch on reconnect
- Account CRUD: create (edge function), delete (anon grant + REST), top-up, transfer (local state only)
- LaunchDarkly integration: `initLD()` in root layout, reactive `flags` store, flag `account.delete` gates the delete button
- PWA: disabled zoom (`user-scalable=no`), hidden scrollbars

### Known Issues
- Top-up and transfer operations are local-state-only (not persisted to DB)
- No DELETE or TRANSACTION transaction types in the schema yet
- Accounts have mixed currencies summed without conversion
- Edge function `create-account` deployed locally

### Next
- Persist top-up/transfer via edge functions
- Add DELETION transaction type
- Real-time sync for mutations
