-- 银豹按杯型拆商品(条码 "-1" 后缀 = 大杯):大杯不再独立建档,
-- 售价由同步合并进主商品 size_prices_json(L 价);删除已同步创建的变体商品,
-- 清游标强制全量重同步(变体处理逻辑升级)。
delete from products v
where v.pospal_barcode like '%-1' and v.pospal_uid is not null
  and exists (select 1 from products p where p.pospal_barcode = left(v.pospal_barcode, -2));

delete from pospal_sync_state where scope like 'product-dict:%';
