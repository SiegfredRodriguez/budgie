-- Create the account-icons bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('account-icons', 'account-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to see the bucket
CREATE POLICY "anon select account-icons bucket"
ON storage.buckets FOR SELECT
TO anon
USING (id = 'account-icons');

-- Allow anon to upload files
CREATE POLICY "anon upload account icons"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'account-icons');

-- Allow anon to select files
CREATE POLICY "anon select account icons"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'account-icons');
