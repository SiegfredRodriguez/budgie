-- Grant storage access to both anon and authenticated roles
DROP POLICY IF EXISTS "anon select account-icons bucket" ON storage.buckets;
DROP POLICY IF EXISTS "anon upload account icons" ON storage.objects;
DROP POLICY IF EXISTS "anon select account icons" ON storage.objects;

CREATE POLICY "storage select account-icons bucket"
ON storage.buckets FOR SELECT
TO anon, authenticated
USING (id = 'account-icons');

CREATE POLICY "storage upload account icons"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'account-icons');

CREATE POLICY "storage select account icons"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'account-icons');
