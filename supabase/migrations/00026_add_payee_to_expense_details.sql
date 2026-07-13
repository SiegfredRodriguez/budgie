-- Add payee_id FK to expense_details (optional)
ALTER TABLE expense_details
  ADD COLUMN IF NOT EXISTS payee_id uuid REFERENCES payees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_details_payee_id ON expense_details(payee_id);

-- Replace create_expense to accept payee params and copy payee tags
CREATE OR REPLACE FUNCTION create_expense(
    p_account_id   uuid,
    p_amount       numeric,
    p_label        text,
    p_date         date,
    p_user_id      uuid,
    p_payee_id     uuid default null,
    p_payee_label  text default null,
    p_currency     text default 'PHP'
) RETURNS json
LANGUAGE plpgsql
SET search_path = 'public'
SECURITY DEFINER
AS $$
DECLARE
    new_transaction  transactions;
    new_expense      expense_details;
    updated_account  accounts;
    final_payee_id   uuid;
BEGIN
    -- Validate payee is provided
    IF p_payee_id IS NULL AND (p_payee_label IS NULL OR p_payee_label = '') THEN
        RAISE EXCEPTION 'payee is required';
    END IF;

    -- Ownership check
    IF (SELECT user_id FROM accounts WHERE id = p_account_id) != p_user_id THEN
        RAISE EXCEPTION 'Account does not belong to user';
    END IF;

    -- Deduct balance
    UPDATE accounts
    SET balance = balance - p_amount, updated_at = now()
    WHERE id = p_account_id
    RETURNING * INTO updated_account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;

    IF updated_account.balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Resolve payee: use existing or create novel
    IF p_payee_id IS NOT NULL THEN
        final_payee_id := p_payee_id;
    ELSE
        INSERT INTO payees (label, icon, user_id)
        VALUES (p_payee_label, 'store', p_user_id)
        RETURNING id INTO final_payee_id;
    END IF;

    -- Create transaction
    INSERT INTO transactions (account_id, type, amount, currency)
    VALUES (p_account_id, 'EXPENSE', -p_amount, p_currency)
    RETURNING * INTO new_transaction;

    -- Create expense detail
    INSERT INTO expense_details (user_id, label, date, transaction_id, payee_id)
    VALUES (p_user_id, p_label, p_date, new_transaction.id, final_payee_id)
    RETURNING * INTO new_expense;

    -- Copy existing payee's tags to expenses_tags
    IF p_payee_id IS NOT NULL THEN
        INSERT INTO expenses_tags (expense_id, tag_id)
        SELECT new_expense.id, pt.tag_id
        FROM payees_tags pt
        WHERE pt.payee_id = p_payee_id;
    END IF;

    RETURN json_build_object(
        'expense',     row_to_json(new_expense),
        'transaction', row_to_json(new_transaction),
        'account',     row_to_json(updated_account)
    );
END;
$$;
