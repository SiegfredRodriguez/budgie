-- Revert rogue migrations 00030 and 00031 (functions only)
DROP FUNCTION IF EXISTS bulk_sync_accounts_transactions(jsonb, jsonb);
DROP FUNCTION IF EXISTS create_account_direct(jsonb, jsonb);

-- Remove rogue columns injected by agent (not in any master migration)
ALTER TABLE accounts DROP COLUMN IF EXISTS last_modified;
ALTER TABLE accounts DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE transactions DROP COLUMN IF EXISTS last_modified;
ALTER TABLE transactions DROP COLUMN IF EXISTS is_deleted;
