-- `service_role` was only ever granted select+insert on `tags` (the
-- edge function used to do a plain insert). The new upsert-by-id sync path
-- (create-tag now does `insert ... on conflict (id) do update` so a
-- retried/offline push is idempotent) needs update too.
grant update on public.tags to service_role;
