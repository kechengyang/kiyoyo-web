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
  pospal: {
    appId: string | null;
    appKey: string | null;
    baseUrl: string;
    hqAccount: string | null;
    timeoutMs: number;
  };
  pool: Pool;
};

export function registerProductSyncRoutes(app: FastifyInstance, deps: ProductSyncRouteDependencies) {
  const { pool } = deps;

  /**
   * POSPAL 配置就绪检查:配置缺失时请求返回明确错误,
   * 不做启动期阻塞 —— API 其他功能与迁移不依赖银豹配置。
   */
  const requirePospalConfig = (): PospalClientConfig & { hqAccount: string } => {
    const { appId, appKey, baseUrl, hqAccount, timeoutMs } = deps.pospal;
    if (!appId || !appKey || !hqAccount) {
      throw new Error("POSPAL is not configured: POSPAL_APP_ID / POSPAL_APP_KEY / POSPAL_HQ_ACCOUNT missing");
    }
    return { appId, appKey, baseUrl, hqAccount, timeoutMs };
  };

  /** 手动触发商品字典同步,同步执行:83 条商品约 1-2 秒 */
  app.post("/v1/admin/pospal/product-sync", { preHandler: requirePermission("pospal.manage") }, async () => {
    const pospal = requirePospalConfig();
    const client = createPospalClient(pospal);
    const store = createPgProductSyncStore(pool, pospal.hqAccount);
    const result = await syncProductDictionary(client, store, pospal.hqAccount);
    return { data: result };
  });

  /** 同步状态报表:KIYOYO 商品 vs 银豹字典对齐情况 */
  app.get("/v1/admin/pospal/product-sync/status", { preHandler: requirePermission("pospal.manage") }, async () => {
    const { hqAccount } = requirePospalConfig();
    const scope = syncScope(hqAccount);
    const { rows } = await pool.query<{
      product_count: string;
      matched_count: string;
      unmatched_product_count: string;
      unmatched_pospal_count: string;
      pospal_categories: string;
      pospal_tastes: string;
      products_with_pospal_uid: string;
      last_synced_at: string | null;
    }>(
      `select
         (select count(*) from products) as product_count,
         (select count(*) from pospal_product_mappings m where m.status='ACTIVE' and m.product_id is not null) as matched_count,
         (select count(*) from products p where not exists (
            select 1 from pospal_product_mappings m2 where m2.product_id = p.id and m2.status='ACTIVE')) as unmatched_product_count,
         (select count(*) from pospal_product_mappings m3 where m3.status='ACTIVE' and m3.product_id is null) as unmatched_pospal_count,
         (select count(*) from pospal_categories) as pospal_categories,
         (select count(*) from pospal_taste_options) as pospal_tastes,
         (select count(*) from products p where p.pospal_uid is not null) as products_with_pospal_uid,
         (select last_synced_at from pospal_sync_state where scope=$1) as last_synced_at`,
      [scope],
    );
    return { data: rows[0] };
  });
}
