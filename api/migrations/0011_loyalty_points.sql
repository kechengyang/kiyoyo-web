create table loyalty_settings (
  singleton boolean primary key default true check (singleton),
  earn_rate_basis_points integer not null default 100 check (earn_rate_basis_points between 0 and 10000),
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into loyalty_settings(singleton,earn_rate_basis_points)
values(true,100)
on conflict(singleton) do nothing;

create table loyalty_wallets (
  user_id uuid primary key references users(id) on delete cascade,
  balance_points integer not null default 0 check (balance_points >= 0),
  lifetime_earned_points integer not null default 0 check (lifetime_earned_points >= 0),
  lifetime_redeemed_points integer not null default 0 check (lifetime_redeemed_points >= 0),
  updated_at timestamptz not null default now()
);

create table loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('ORDER_EARN','ORDER_REDEEM','MANUAL_CREDIT','MANUAL_DEBIT')),
  points integer not null check (points <> 0),
  balance_after integer not null check (balance_after >= 0),
  order_id uuid references orders(id) on delete set null,
  actor_id uuid references users(id) on delete set null,
  reason text,
  external_reference text,
  idempotency_key text,
  earn_rate_basis_points integer check (earn_rate_basis_points between 0 and 10000),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (transaction_type in ('ORDER_EARN','MANUAL_CREDIT') and points > 0)
    or (transaction_type in ('ORDER_REDEEM','MANUAL_DEBIT') and points < 0)
  )
);

create index loyalty_transactions_user_created_idx
  on loyalty_transactions(user_id,created_at desc);
create unique index loyalty_transactions_idempotency_unique
  on loyalty_transactions(idempotency_key)
  where idempotency_key is not null;
create unique index loyalty_transactions_order_type_unique
  on loyalty_transactions(order_id,transaction_type)
  where order_id is not null and transaction_type in ('ORDER_EARN','ORDER_REDEEM');

alter table orders
  add column points_redeemed integer not null default 0 check (points_redeemed >= 0),
  add column points_discount integer not null default 0 check (points_discount >= 0),
  add column points_earned integer not null default 0 check (points_earned >= 0),
  add column points_earn_rate_basis_points integer check (points_earn_rate_basis_points between 0 and 10000);
