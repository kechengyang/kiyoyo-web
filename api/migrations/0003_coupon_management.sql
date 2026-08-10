create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name_en text not null,
  name_zh text not null,
  description_en text not null default '',
  description_zh text not null default '',
  discount_type text not null check (discount_type in ('PERCENT','FIXED','FREE_SIZE_UPGRADE')),
  discount_value integer not null default 0 check (discount_value >= 0),
  max_discount integer check (max_discount is null or max_discount >= 0),
  min_spend integer not null default 0 check (min_spend >= 0),
  scope_type text not null default 'ALL' check (scope_type in ('ALL','DRINKS','GOODS','CATEGORY','PRODUCT')),
  scope_value text,
  fulfillment_scope text not null default 'ALL' check (fulfillment_scope in ('ALL','PICKUP','DELIVERY','SHIPPING')),
  issuance_mode text not null default 'ASSIGNED' check (issuance_mode in ('PUBLIC_CODE','ASSIGNED')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  issuance_limit integer check (issuance_limit is null or issuance_limit > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','SCHEDULED','ACTIVE','PAUSED','ENDED','ARCHIVED')),
  issuance_enabled boolean not null default false,
  redemption_enabled boolean not null default false,
  stackable boolean not null default false,
  version integer not null default 1,
  published_at timestamptz,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (scope_type in ('ALL','DRINKS','GOODS') or nullif(trim(scope_value), '') is not null),
  check (
    (discount_type = 'PERCENT' and discount_value between 1 and 100)
    or (discount_type = 'FIXED' and discount_value > 0)
    or (discount_type = 'FREE_SIZE_UPGRADE' and discount_value = 0)
  )
);

create unique index coupons_code_unique on coupons(lower(code));
create index coupons_status_window_idx on coupons(status,starts_at,ends_at);

create table user_coupons (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id),
  user_id uuid not null references users(id),
  source text not null default 'ADMIN' check (source in ('ADMIN','WELCOME','BIRTHDAY','CAMPAIGN','CLAIM')),
  status text not null default 'ISSUED' check (status in ('ISSUED','RESERVED','REDEEMED','REVOKED')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reserved_at timestamptz,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references users(id),
  revoke_reason text,
  created_by uuid references users(id),
  check (expires_at > issued_at)
);

create index user_coupons_wallet_idx on user_coupons(user_id,status,expires_at);
create index user_coupons_coupon_idx on user_coupons(coupon_id,status);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id),
  user_coupon_id uuid references user_coupons(id),
  user_id uuid not null references users(id),
  order_id uuid not null references orders(id),
  discount_amount integer not null check (discount_amount >= 0),
  rule_snapshot_json jsonb not null,
  status text not null check (status in ('RESERVED','REDEEMED','RELEASED','REFUNDED')),
  idempotency_key text not null unique,
  reserved_at timestamptz not null default now(),
  redeemed_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  unique(order_id,coupon_id)
);

create index coupon_redemptions_coupon_status_idx on coupon_redemptions(coupon_id,status);
create index coupon_redemptions_user_idx on coupon_redemptions(user_id,reserved_at desc);
