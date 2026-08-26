-- Same reasoning as 00037_grant_tags_update_for_sync.sql: `service_role`
-- was only ever granted select+insert+delete on `payees` (nothing writing
-- through it needed update). The new upsert-by-id sync path needs it.
grant update on public.payees to service_role;
