-- transactions.type and the currency columns were plain, unconstrained
-- text: a typo or a bug (like the hardcoded 'PHP' currency fixed in the
-- client) could silently write a nonsense value with nothing at the
-- database layer to catch it. Constrain them to the values the app
-- actually produces.

alter table transactions
    add constraint transactions_type_check
    check (type in ('CREATION', 'TOP_UP', 'TRANSFER', 'EXPENSE'));

alter table accounts
    add constraint accounts_currency_format_check
    check (currency ~ '^[A-Z]{3}$');

alter table transactions
    add constraint transactions_currency_format_check
    check (currency ~ '^[A-Z]{3}$');
