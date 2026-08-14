import type { PospalClient } from "../client.js";
import type { PospalProduct } from "../types.js";

/**
 * 银豹商品字典同步(编排逻辑)。
 * 存储经 ProductSyncStore 接口注入:测试用内存实现,生产用
 * createPgProductSyncStore(见 ./store.ts)。
 */

export type ProductRow = {
  /** 银豹商品 uid */
  uid: string;
  barcode: string | null;
  name: string;
  /** 银豹售价,整数分(与 KIYOYO 金额约定一致) */
  sellPriceCents: number | null;
};

export function normalizeProductRow(product: PospalProduct): ProductRow {
  return {
    uid: String(product.uid),
    barcode: product.barcode ?? null,
    name: product.name ?? "",
    sellPriceCents: product.sellPrice != null ? Math.round(product.sellPrice * 100) : null,
  };
}

export type ProductSyncStore = {
  /** 批量 upsert 映射(按 pospal_uid 唯一) */
  upsertMappings(rows: ProductRow[]): Promise<void>;
  /** 按 barcode = products.external_code 回填 product_id,返回本次匹配条数 */
  alignByBarcode(): Promise<number>;
  loadCursor(): Promise<string | null>;
  saveCursor(lastId: string): Promise<void>;
};

export type ProductSyncResult = {
  pages: number;
  items: number;
  matchedProducts: number;
};

export async function syncProductDictionary(
  client: Pick<PospalClient, "getProductPage">,
  store: ProductSyncStore,
  account: string,
): Promise<ProductSyncResult> {
  let lastId = await store.loadCursor();
  let pages = 0;
  let items = 0;

  while (true) {
    const page = await client.getProductPage({ account, ...(lastId != null && { lastId }), });
    pages += 1;
    if (page.list.length === 0) break;

    await store.upsertMappings(page.list.map(normalizeProductRow));
    items += page.list.length;

    if (!page.hasMore) break;
    lastId = page.nextLastId != null ? String(page.nextLastId) : null;
    if (lastId == null) break; // hasMore 但无 nextLastId:视为同步完成
    await store.saveCursor(lastId);
  }

  const matchedProducts = await store.alignByBarcode();
  return { pages, items, matchedProducts };
}

/** 同步游标 scope:product-dict:<account>(status 报表复用) */
export const syncScope = (account: string) => `product-dict:${account}`;
