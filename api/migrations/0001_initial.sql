create table users (
  id uuid primary key default gen_random_uuid(),
  external_auth_id text not null unique,
  auth_provider text not null default 'password',
  email text,
  nickname text not null,
  gender text,
  birth_year integer check (birth_year between 1900 and extract(year from now())::integer),
  locale text not null default 'en',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_unique on users(lower(email)) where email is not null;

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  contact_name text not null,
  phone_e164 text not null,
  line1 text not null,
  area text not null,
  city text not null default 'Nairobi',
  lat numeric(9,6),
  lng numeric(9,6),
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index addresses_one_default on addresses(user_id) where is_default;

create table stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  area text not null,
  address text not null,
  phone text,
  lat numeric(9,6),
  lng numeric(9,6),
  timezone text not null default 'Africa/Nairobi',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','COMING_SOON')),
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  location_verified boolean not null default false,
  opening_hours_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  tone text not null check (tone in ('RED','YELLOW','BLACK','GREEN')),
  active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_tags_label_unique on product_tags(lower(label));

create table products (
  id uuid primary key default gen_random_uuid(),
  external_code text unique,
  kind text not null check (kind in ('DRINK','GOODS')),
  category_slug text not null,
  slug text not null unique,
  name_en text not null,
  name_zh text not null,
  description_en text not null default '',
  description_zh text not null default '',
  image_key text,
  tag_id uuid references product_tags(id) on delete set null,
  base_price integer not null check (base_price >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 90),
  active boolean not null default true,
  catalog_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create index products_catalog_idx on products(kind,active,category_slug,updated_at desc);

create table favorites (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,product_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references users(id),
  currency text not null default 'KES',
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  payment_status text not null check (payment_status in ('PENDING','AUTHORIZED','PAID','DECLINED','FAILED','REFUNDED')),
  is_test boolean not null default true,
  created_at timestamptz not null default now()
);

create index orders_user_created_idx on orders(user_id,created_at desc);

create table fulfillment_groups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  type text not null check (type in ('PICKUP','DELIVERY','SHIPPING')),
  store_id uuid references stores(id),
  address_id uuid references addresses(id),
  address_snapshot_json jsonb,
  status text not null default 'PLACED' check (status in ('PLACED','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED')),
  promised_at timestamptz,
  created_at timestamptz not null default now()
);

create index fulfillments_store_status_idx on fulfillment_groups(store_id,status,promised_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  fulfillment_group_id uuid not null references fulfillment_groups(id) on delete cascade,
  product_id uuid references products(id),
  kind text not null check (kind in ('DRINK','GOODS')),
  name_snapshot text not null,
  sku_snapshot text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  customization_json jsonb not null default '{}'::jsonb,
  line_total integer not null check (line_total >= 0)
);

create table pickup_tokens (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null unique references fulfillment_groups(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references users(id),
  redeemed_store_id uuid references stores(id),
  created_at timestamptz not null default now()
);

create table status_events (
  id uuid primary key default gen_random_uuid(),
  fulfillment_group_id uuid not null references fulfillment_groups(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references users(id),
  reason text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null,
  provider_ref text,
  idempotency_key text not null unique,
  amount integer not null check (amount >= 0),
  status text not null,
  is_test boolean not null default true,
  payload_redacted_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  store_id uuid references stores(id),
  request_id text,
  metadata_redacted_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_entity_idx on audit_logs(entity_type,entity_id,created_at desc);
