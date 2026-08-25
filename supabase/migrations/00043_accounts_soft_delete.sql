-- Account deletion is now a soft-delete (is_deleted = true) through the new
-- delete-account edge function, so other devices see it as an ordinary
-- pull-sync change instead of a Realtime DELETE event that a briefly
-- offline/backgrounded client could simply miss. A direct hard DELETE from
-- the client (the old path) would bypass that tombstone entirely and also
-- cascade-delete the account's transactions, so the grant that made it
-- possible is revoked — mirroring the insert/update tightening in 00034.
revoke delete on public.accounts from authenticated;
-- select is needed too: delete-account's `.update(...).select(...)` returns
-- the updated row through PostgREST, which requires read access on top of
-- the write.
grant select, update on public.accounts to service_role;
