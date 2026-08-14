import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requirePermission } from "../../modules/auth/middleware.js";
import type { PospalClientConfig } from "../client.js";
import { createPospalClient } from "../client.js";
import { syncProductDictionary, syncScope } from "./service.js";
import { createPgProductSyncStore } from "./store.js";

/**
 * 银豹商品字典同步管理端点(Phase A:银豹 → KIYOYO)。
 * 依赖显式注入:pospal 配置构造客户端,pool 构造同步存储。
 * 后续模块(商品管理、推单)各自注册独立端点,共享 ../client.ts。
 */
export type ProductSyncRouteDependencies = {
  pospal: PospalClientConfig & { hqAccount: string };
  pool: Pool;
};

export function registerProductSyncRoutes(app: FastifyInstance, deps: ProductSyncRouteDependencies) {
  const client = createPospalClient(deps.pospal);
  const store = createPgProductSyncStore(deps.pool, deps.pospal.hqAccount);
  const { hqAccount } = deps.pospal;

  /** 手动触发商品字典同步,同步执行:83 条商品约 1-2 秒 */
  app.post("/v1/admin/pospal/product-sync", { preHandler: requirePermission("pospal.manage") }, async () => {
    const result = await syncProductDictionary(client, store, hqAccount);
    return { data: result };
  });

  /** 同步状态报表:KIYOYO 商品 vs 银豹字典对齐情况 */
  app.get("/v1/admin/pospal/product-sync/status", { preHandler: requirePermission("pospal.manage") }, async () => {
    const scope = syncScope(hqAccount);
    const { rows } = await deps.pool.query<{
      product_count: string;
      matched_count: string;
      unmatched_product_count: string;
      unmatched_pospal_count: string;
      last_synced_at: string | null;
    }>(
      `select
         (select count(*) from products) as product_count,
         (select count(*) from pospal_product_mappings m where m.status='ACTIVE' and m.product_id is not null) as matched_count,
         (select count(*) from products p where not exists (
            select 1 from pospal_product_mappings m2 where m2.product_id = p.id and m2.status='ACTIVE')) as unmatched_product_count,
         (select count(*) from pospal_product_mappings m3 where m3.status='ACTIVE' and m3.product_id is null) as unmatched_pospal_count,
         (select last_synced_at from pospal_sync_state where scope=$1) as last_synced_at`,
      [scope],
    );
    return { data: rows[0] };
  });
}
