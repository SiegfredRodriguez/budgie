-- Allow anon to see the account-icons bucket
CREATE POLICY "anon select account-icons bucket"
ON storage.buckets FOR SELECT
TO anon
USING (id = 'account-icons');
