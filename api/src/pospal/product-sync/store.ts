import type { Pool } from "pg";
import type { ProductRow, ProductSyncStore } from "./service.js";
import { syncScope } from "./service.js";

/** PostgreSQL 实现的同步存储:映射表 upsert + barcode 对齐 + 游标持久化 */
export function createPgProductSyncStore(pool: Pool, account: string): ProductSyncStore {
  return {
    async upsertMappings(rows) {
      if (rows.length === 0) return;
      const placeholders = rows
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, now())`)
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
      // 就跟随新匹配);MANUAL 映射不动
      const { rowCount } = await pool.query(
        `update pospal_product_mappings m
         set product_id = p.id, source = 'AUTO'
         from products p
         where p.external_code = m.pospal_barcode
           and (m.product_id is null or (m.source = 'AUTO' and m.product_id <> p.id))`,
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
