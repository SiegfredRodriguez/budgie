create table if not exists accounts (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type text not null default 'checking',
    icon text not null default 'bank',
    currency text not null default 'PHP',
    balance numeric not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists transactions (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references accounts(id) on delete cascade,
    type text not null,
    amount numeric not null,
    currency text not null,
    description text,
    related_account_id uuid references accounts(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_transactions_account_id on transactions(account_id);
create index if not exists idx_transactions_created_at on transactions(created_at desc);
