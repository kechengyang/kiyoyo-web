import type { Pool } from "pg";
import type { CategoryRow, PospalProductRow, PriceDiff, ProductRow, ProductSyncStore, TasteRow } from "./service.js";
import { syncScope } from "./service.js";

/** PostgreSQL 实现的同步存储:字典 upsert + 商品本体 upsert + 映射表 + 游标持久化 */
export function createPgProductSyncStore(pool: Pool, account: string): ProductSyncStore {
  return {
    async upsertCategories(rows: CategoryRow[]) {
      if (rows.length === 0) return;
      // 步长 = 每行参数个数(7,last_synced_at 是 now() 字面量):
      // 参数号必须连续,否则 Postgres 对空档号报 42P18
      // 可空参数显式转类型:null 值时 node-postgres 不带类型,42P18 无法推断
      const placeholders = rows
        .map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}::text, $${i * 7 + 4}::int, $${i * 7 + 5}::int, $${i * 7 + 6}, $${i * 7 + 7}, now())`)
        .join(", ");
      await pool.query(
        `insert into pospal_categories
           (uid, name, parent_uid, enable, category_order, category_slug, kind, last_synced_at)
         values ${placeholders}
         on conflict (uid) do update set
           name = excluded.name,
           parent_uid = excluded.parent_uid,
           enable = excluded.enable,
           category_order = excluded.category_order,
           category_slug = excluded.category_slug,
           kind = excluded.kind,
           last_synced_at = now()`,
        rows.flatMap((row) => [row.uid, row.name, row.parentUid, row.enable, row.categoryOrder, row.categorySlug, row.kind]),
      );
    },

    async upsertTastes(rows: TasteRow[]) {
      if (rows.length === 0) return;
      // 可空参数显式转类型:null 值时 node-postgres 不带类型,42P18 无法推断
      const placeholders = rows
        .map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}::text, $${i * 7 + 4}::int, $${i * 7 + 5}::text, $${i * 7 + 6}::text, $${i * 7 + 7}::int, now())`)
        .join(", ");
      await pool.query(
        `insert into pospal_taste_options
           (uid, attribute_name, attribute_value, is_default, package_uid, package_name, package_type, last_synced_at)
         values ${placeholders}
         on conflict (uid) do update set
           attribute_name = excluded.attribute_name,
           attribute_value = excluded.attribute_value,
           is_default = excluded.is_default,
           package_uid = excluded.package_uid,
           package_name = excluded.package_name,
           package_type = excluded.package_type,
           last_synced_at = now()`,
        rows.flatMap((row) => [row.uid, row.attributeName, row.attributeValue, row.isDefault, row.packageUid, row.packageName, row.packageType]),
      );
    },

    async upsertProducts(rows: PospalProductRow[]): Promise<{ created: number; updated: number; priceDiffs: PriceDiff[] }> {
      if (rows.length === 0) return { created: 0, updated: 0, priceDiffs: [] };

      // 更新前读旧价,用于 priceDiffs 报表(base_price not null)
      const { rows: oldRows } = await pool.query<{ pospal_barcode: string; base_price: number }>(
        "select pospal_barcode, base_price from products where pospal_barcode = any($1)",
        [rows.map((row) => row.barcode as string)],
      );
      const oldByBarcode = new Map(oldRows.map((row) => [row.pospal_barcode, row.base_price]));

      // 步长 = 每行参数个数(11);参数号连续 + 全部显式转类型:
      // null 参数不带类型会 42P18;未标注的 VALUES 列会被推断成 text,
      // INSERT ... SELECT 不自动强转会报 "integer vs text"
      const placeholders = rows
        .map((_, i) => `($${i * 11 + 1}::text, $${i * 11 + 2}::text, $${i * 11 + 3}::int, $${i * 11 + 4}::text, $${i * 11 + 5}::text, $${i * 11 + 6}::text, $${i * 11 + 7}::text, $${i * 11 + 8}::jsonb, $${i * 11 + 9}::jsonb, $${i * 11 + 10}::boolean, $${i * 11 + 11}::text)`)
        .join(", ");
      // 列序:barcode, name, base_price, category_slug, kind, pospal_uid, category_uid, tastes, images, no_stock, slug
      // jsonb 列在 JS 侧 JSON.stringify 后交 ::jsonb 解析
      // (node-postgres 会把 JS 数组转成 Postgres 数组字面量,直接 ::jsonb 报 invalid input syntax)
      const flat = rows.flatMap((row) => [
        row.barcode,
        row.name,
        row.basePrice ?? 0,
        row.categorySlug,
        row.kind,
        row.uid,
        row.categoryUid,
        row.tastes == null ? null : JSON.stringify(row.tastes),
        row.images == null ? null : JSON.stringify(row.images),
        row.noStock,
        row.slug,
      ]);

      // 更新已匹配商品:只覆盖银豹侧字段;name_zh/描述/slug/tag/discount/active/image_key 不动
      const updateResult = await pool.query(
        `with v(barcode, name, base_price, category_slug, kind, pospal_uid, category_uid, tastes, images, no_stock, slug) as (values ${placeholders})
         update products p
         set name_en = v.name,
             base_price = v.base_price,
             category_slug = coalesce(v.category_slug, p.category_slug),
             kind = coalesce(v.kind, p.kind),
             pospal_uid = v.pospal_uid,
             pospal_category_uid = v.category_uid,
             pospal_tastes_json = v.tastes,
             pospal_images_json = v.images,
             pospal_no_stock = v.no_stock,
             pospal_barcode = v.barcode,
             catalog_version = p.catalog_version + 1,
             updated_at = now()
         from v
         where p.pospal_barcode = v.barcode`,
        flat,
      );

      // 插入银豹独有商品(active=true 直接上架:银豹为准;admin 可在 Web 侧下架)
      const insertResult = await pool.query(
        `with v(barcode, name, base_price, category_slug, kind, pospal_uid, category_uid, tastes, images, no_stock, slug) as (values ${placeholders})
         insert into products
           (kind, category_slug, slug, name_en, name_zh, description_en, description_zh, image_key,
            base_price, size_prices_json, discount_percent, active,
            pospal_barcode, pospal_uid, pospal_category_uid, pospal_tastes_json, pospal_images_json, pospal_no_stock, catalog_version)
         select v.kind, v.category_slug, v.slug, v.name, v.name, '', '', null,
                v.base_price, jsonb_build_object('One size', v.base_price), 0, true,
                v.barcode, v.pospal_uid, v.category_uid, v.tastes, v.images, v.no_stock, 1
         from v
         where not exists (select 1 from products p where p.pospal_barcode = v.barcode)`,
        flat,
      );

      const priceDiffs: PriceDiff[] = [];
      for (const row of rows) {
        const old = oldByBarcode.get(row.barcode as string);
        const next = row.basePrice ?? 0;
        if (old != null && old !== next) {
          priceDiffs.push({ barcode: row.barcode, name: row.name, oldBasePrice: old, newBasePrice: next });
        }
      }
      return { created: insertResult.rowCount ?? 0, updated: updateResult.rowCount ?? 0, priceDiffs };
    },
    async upsertMappings(rows) {
      if (rows.length === 0) return;
      // 可空参数显式转类型(barcode/cents 可空,null 时 42P18)
      const placeholders = rows
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}::text, $${i * 4 + 3}, $${i * 4 + 4}::int, now())`)
        .join(", ");
      await pool.query(
        `insert into pospal_product_mappings
           (pospal_uid, pospal_barcode, pospal_name, pospal_sell_price_cents, last_synced_at)
         values ${placeholders}
         on conflict (pospal_uid) do update set
           pospal_barcode = excluded.pospal_barcode,
           pospal_name = excluded.pospal_name,
           pospal_sell_price_cents = excluded.pospal_sell_price_cents,
           status = 'ACTIVE',
           last_synced_at = now()`,
        rows.flatMap((row) => [row.uid, row.barcode, row.name, row.sellPriceCents]),
      );
    },

    async alignByBarcode() {
      // 未对齐的行按条码匹配;已 AUTO 对齐但条码变化的行重算(银豹条码改了
      // 就跟随新匹配);MANUAL 映射不动。对齐键是 products.pospal_barcode
      // (银豹 EAN 条码),不是 external_code(菜单内部编码,保留原样)。
      // 同一 barcode 的重复字典行(银豹重复建档)只取最早一行,避免撞
      // ACTIVE product_id 唯一索引
      const { rowCount } = await pool.query(
        `update pospal_product_mappings m
         set product_id = p.id, source = 'AUTO'
         from products p
         where p.pospal_barcode = m.pospal_barcode
           and (m.product_id is null or (m.source = 'AUTO' and m.product_id <> p.id))
           and not exists (
             select 1 from pospal_product_mappings dup
             where dup.pospal_barcode = m.pospal_barcode and dup.ctid < m.ctid
           )`,
      );
      return rowCount ?? 0;
    },

    async loadCursor() {
      const { rows } = await pool.query<{ last_id: string }>(
        "select last_id from pospal_sync_state where scope = $1",
        [syncScope(account)],
      );
      return rows[0]?.last_id ?? null;
    },

    async saveCursor(lastId) {
      await pool.query(
        `insert into pospal_sync_state (scope, last_id, last_synced_at)
         values ($1, $2, now())
         on conflict (scope) do update set last_id = excluded.last_id, last_synced_at = now()`,
        [syncScope(account), lastId],
      );
    },
  };
}
