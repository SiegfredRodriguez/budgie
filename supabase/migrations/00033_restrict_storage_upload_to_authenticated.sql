-- Account icons were uploadable by the `anon` role — anyone holding the
-- public anon key, logged in or not, could write into the bucket. Icons
-- stay publicly viewable (the app renders them without auth), but writes
-- now require a signed-in session.

drop policy if exists "storage upload account icons" on storage.objects;

create policy "storage upload account icons"
on storage.objects for insert
to authenticated
with check (bucket_id = 'account-icons');
