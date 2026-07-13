-- Fix policies that reference the old column name expense_detail_id
-- after 00020 renamed it to expense_id

DROP POLICY IF EXISTS "Users can view their own expenses_tags" ON expenses_tags;
DROP POLICY IF EXISTS "Users can insert their own expenses_tags" ON expenses_tags;
DROP POLICY IF EXISTS "Users can delete their own expenses_tags" ON expenses_tags;

CREATE POLICY "Users can view their own expenses_tags"
    ON expenses_tags FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM expense_details
            WHERE id = expense_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own expenses_tags"
    ON expenses_tags FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expense_details
            WHERE id = expense_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own expenses_tags"
    ON expenses_tags FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM expense_details
            WHERE id = expense_id AND user_id = auth.uid()
        )
    );
