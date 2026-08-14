-- 银豹 POSPAL 集成:商品字典映射 / 同步游标 / 门店映射
-- 设计:docs/12-pospal-integration.md §4(推单相关表随推单阶段另立迁移)

-- 商品字典映射(kiyoyo product ↔ 银豹商品)
create table pospal_product_mappings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,  -- null = 银豹有、KIYOYO 未匹配
  pospal_uid text not null unique,        -- 银豹商品 uid
  pospal_barcode text,                    -- 银豹可缺条码(无条码商品)
  pospal_name text not null,
  pospal_sell_price_cents integer,        -- 银豹售价(分);未定价时为 null
  source text not null default 'AUTO' check (source in ('AUTO','MANUAL')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index pospal_mapping_active_product_idx
  on pospal_product_mappings(product_id) where status='ACTIVE' and product_id is not null;
create index pospal_mapping_unmatched_idx
  on pospal_product_mappings(product_id) where product_id is null;

-- 同步游标(商品字典;Phase 2 订单轮询复用本表)
create table pospal_sync_state (
  scope text primary key,                -- 'product-dict:<account>' | 'order-poll:<account>'
  last_id text,
  last_synced_at timestamptz not null default now(),
  meta_json jsonb not null default '{}'::jsonb
);

-- 门店映射(store → 银豹门店账号,由管理员维护)
alter table stores
  add column pospal_account text,
  add column pospal_enabled boolean not null default true;
create unique index stores_pospal_account_unique
  on stores(pospal_account) where pospal_account is not null;
