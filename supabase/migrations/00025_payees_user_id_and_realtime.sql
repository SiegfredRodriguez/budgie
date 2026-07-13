-- Add user_id column
ALTER TABLE payees ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Remove rows without a user (pre-existing test data)
DELETE FROM payees WHERE user_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE payees ALTER COLUMN user_id SET NOT NULL;

-- Drop old wide-open policies
DROP POLICY IF EXISTS "Everyone can view payees" ON payees;
DROP POLICY IF EXISTS "Authenticated users can insert payees" ON payees;
DROP POLICY IF EXISTS "Authenticated users can delete payees" ON payees;

-- New per-user policies on payees
CREATE POLICY "Users can view own payees"
  ON payees FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payees"
  ON payees FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payees"
  ON payees FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Drop old wide-open policies on payees_tags
DROP POLICY IF EXISTS "Everyone can view payees_tags" ON payees_tags;
DROP POLICY IF EXISTS "Authenticated users can insert payees_tags" ON payees_tags;
DROP POLICY IF EXISTS "Authenticated users can delete payees_tags" ON payees_tags;

-- New per-user policies on payees_tags (scoped via owning payee)
CREATE POLICY "Users can view own payees_tags"
  ON payees_tags FOR SELECT TO authenticated
  USING (payee_id IN (SELECT id FROM payees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own payees_tags"
  ON payees_tags FOR INSERT TO authenticated
  WITH CHECK (payee_id IN (SELECT id FROM payees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own payees_tags"
  ON payees_tags FOR DELETE TO authenticated
  USING (payee_id IN (SELECT id FROM payees WHERE user_id = auth.uid()));

-- Grant service_role on payees and payees_tags (for edge functions using service_role key)
GRANT SELECT, INSERT, DELETE ON public.payees TO service_role;
GRANT SELECT, INSERT, DELETE ON public.payees_tags TO service_role;

-- Enable Realtime on payees
ALTER PUBLICATION supabase_realtime ADD TABLE payees;
