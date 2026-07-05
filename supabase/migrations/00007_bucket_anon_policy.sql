DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'buckets'
    AND policyname = 'anon select account-icons bucket'
  ) THEN
    CREATE POLICY "anon select account-icons bucket"
    ON storage.buckets FOR SELECT
    TO anon
    USING (id = 'account-icons');
  END IF;
END $$;
