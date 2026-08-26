-- 银豹为商品唯一数据源:目录同步字段与字典表
-- 设计:docs/12-pospal-integration.md(products 本体改由银豹同步覆盖;
--       Web 保留 active/discount_percent/name_zh 等 Web 专属字段)

-- products 增加银豹侧字段(同步覆盖;Web 编辑对这些字段只读)
alter table products
  add column pospal_uid text unique,        -- 银豹商品 uid(19 位字符串,>2^53 必须按字符串收发)
  add column pospal_category_uid text,      -- 银豹分类 uid
  add column pospal_tastes_json jsonb,      -- 商品口味列表(原样存储银豹返回)
  add column pospal_images_json jsonb,      -- 商品图片列表(原样存储,含 img.pospal.cn CDN path)
  add column pospal_no_stock boolean;       -- 银豹"不记库存"标记

-- 银豹分类字典:category_slug/kind 为派生 Web 字段(同步时由分类名派生写入)
create table pospal_categories (
  uid text primary key,                     -- 银豹分类 uid(字符串)
  name text not null,
  parent_uid text,
  enable int not null default 1,
  category_order int not null default 0,
  category_slug text not null,              -- Web 分类 slug(同步时派生)
  kind text not null default 'DRINK' check (kind in ('DRINK','GOODS')),
  last_synced_at timestamptz not null default now()
);

-- 银豹口味库(可选项字典:sugar/ICE/ADD ONS 等口味组)
create table pospal_taste_options (
  uid text primary key,
  attribute_name text not null,
  attribute_value text,                     -- ADD ONS 组为加价金额(元)
  is_default int not null default 0,
  package_uid text,
  package_name text,
  package_type int,                         -- 1多选非必选 2单选非必选 3多选必选 4单选必选
  last_synced_at timestamptz not null default now()
);
create index pospal_taste_options_package_idx on pospal_taste_options(package_uid);
