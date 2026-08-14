-- 银豹集成:products 增加 pospal_barcode(银豹 EAN 条码),作为字典对齐键。
-- external_code(菜单内部编码 A1/B2/…)保持不变——订单引用与 seed 依赖它。

alter table products add column pospal_barcode text;

create unique index products_pospal_barcode_key
  on products(pospal_barcode) where pospal_barcode is not null;

-- 一次性回填:按规范化名称(去首部菜单代码前缀、&→and、小写)把已同步的
-- 银豹字典条码写入商品。此后对齐完全由 barcode 决定,名称匹配仅此一次。
-- 字典与商品两侧都按 key 去重(取最早一行),确保一对一、不触发唯一索引冲突:
--   字典同一 barcode 可能有多行(银豹重复建档,含 "-1" 后缀变体);
--   DB 可能存在重名商品(seed 重跑遗留的 inactive 行等)。
with dict as (
  select distinct on (pospal_barcode) pospal_barcode, pospal_name
  from pospal_product_mappings
  where pospal_barcode is not null and pospal_name is not null
  order by pospal_barcode, ctid
),
candidates as (
  select distinct on (norm) p.id, norm as normalized_name
  from (
    select p.id, p.active,
      lower(regexp_replace(p.name_en, '&', 'and', 'g')) as norm
    from products p
  ) p
  order by norm, p.active desc, p.id
)
update products p
set pospal_barcode = d.pospal_barcode
from dict d
join candidates c
  on c.normalized_name = lower(regexp_replace(regexp_replace(d.pospal_name, '^[a-z][0-9]+[[:space:]]+', '', 'i'), '&', 'and', 'g'))
where p.id = c.id
  and p.pospal_barcode is null;

-- 回填后按 barcode 对齐(与 product-sync/store.ts 的 alignByBarcode 同条件,迁移一次性执行)。
-- 同一 barcode 的重复字典行只取最早一行,避免 ACTIVE product_id 唯一索引冲突
-- (0005: on pospal_product_mappings(product_id) where status='ACTIVE' and product_id is not null)。
update pospal_product_mappings m
set product_id = p.id, source = 'AUTO'
from products p
where p.pospal_barcode = m.pospal_barcode
  and (m.product_id is null or (m.source = 'AUTO' and m.product_id <> p.id))
  and not exists (
    select 1 from pospal_product_mappings dup
    where dup.pospal_barcode = m.pospal_barcode and dup.ctid < m.ctid
  );
