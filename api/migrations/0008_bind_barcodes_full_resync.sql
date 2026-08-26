-- B2/D4 绑定银豹条码(店方确认的映射,以银豹为准)+ 清商品字典游标强制全量重同步
-- 背景:Phase A 遗留的增量游标使以银豹为源的同步从中间续传,存量商品(名字/价格/
-- 图片/口味/分类)从未被新同步覆盖;分类 slug 映射已升级,需要全量重跑一次。

update products set pospal_barcode = '2601222157299'
  where external_code = 'B2' and pospal_barcode is null
  and not exists (select 1 from products p2 where p2.pospal_barcode = '2601222157299');

update products set pospal_barcode = '2601251618136'
  where external_code = 'D4' and pospal_barcode is null
  and not exists (select 1 from products p2 where p2.pospal_barcode = '2601251618136');

-- 清游标:下次同步从银豹字典第一页全量拉取
delete from pospal_sync_state where scope like 'product-dict:%';
