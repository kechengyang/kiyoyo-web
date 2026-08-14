-- 银豹集成:products 增加 pospal_barcode(银豹 EAN 条码),作为字典对齐键。
-- external_code(菜单内部编码 A1/B2/…)保持不变——订单引用与 seed 依赖它。

alter table products add column pospal_barcode text;

create unique index products_pospal_barcode_key
  on products(pospal_barcode) where pospal_barcode is not null;

-- 一次性回填:按规范化名称(去首部菜单代码前缀、&→and、小写)把已同步的
-- 银豹字典条码写入商品。此后对齐完全由 barcode 决定,名称匹配仅此一次。
-- 未匹配到的商品由 admin 在商品编辑器手动填写条码。
update products p
set pospal_barcode = m.pospal_barcode
from pospal_product_mappings m
where p.pospal_barcode is null
  and m.pospal_barcode is not null
  and m.pospal_name is not null
  and not exists (
    select 1 from products q
    where q.pospal_barcode = m.pospal_barcode and q.id <> p.id
  )
  and lower(regexp_replace(regexp_replace(m.pospal_name, '^[a-z][0-9]+[[:space:]]+', '', 'i'), '&', 'and', 'g'))
    = lower(regexp_replace(p.name_en, '&', 'and', 'g'));

-- 回填后按 barcode 对齐(与 product-sync/store.ts 的 alignByBarcode 同条件,迁移一次性执行)
update pospal_product_mappings m
set product_id = p.id, source = 'AUTO'
from products p
where p.pospal_barcode = m.pospal_barcode
  and (m.product_id is null or (m.source = 'AUTO' and m.product_id <> p.id));
