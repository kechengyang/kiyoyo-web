import type { PospalClient } from "../client.js";
import type { PospalCategory, PospalProduct, PospalTaste } from "../types.js";
import { productSlug } from "../../product-slug.js";

/**
 * 银豹商品目录同步(编排逻辑)。
 * 银豹 = 商品唯一数据源:同步覆盖 products 的银豹侧字段
 * (name_en/base_price/分类/口味/图片/条码),Web 专属字段
 * (active/discount/name_zh/描述/tag/slug/image_key)不动。
 * 存储经 ProductSyncStore 接口注入:测试用内存实现,生产用
 * createPgProductSyncStore(见 ./store.ts)。
 */

/** 映射表行(uid 桥,保留 Phase A 语义) */
export type ProductRow = {
  uid: string;
  barcode: string | null;
  name: string;
  /** 银豹售价,整数分(与 KIYOYO 金额约定一致) */
  sellPriceCents: number | null;
};

/** 分类字典行;categorySlug/kind 为 Web 派生字段 */
export type CategoryRow = {
  uid: string;
  name: string;
  parentUid: string | null;
  enable: number | null;
  categoryOrder: number | null;
  categorySlug: string;
  kind: "DRINK" | "GOODS";
};

/** 口味(可选项)字典行 */
export type TasteRow = {
  uid: string;
  attributeName: string;
  attributeValue: string | null;
  isDefault: number | null;
  packageUid: string | null;
  packageName: string | null;
  packageType: number | null;
};

/** 商品 upsert 行(银豹侧字段全集) */
export type PospalProductRow = {
  uid: string;
  barcode: string | null;
  name: string;
  /** KES 整元(products.base_price 单位;映射表 pospal_sell_price_cents 才是分) */
  basePrice: number | null;
  categoryUid: string | null;
  categorySlug: string;
  kind: "DRINK" | "GOODS";
  /** 口味/图片原样透传(JSON 原值) */
  tastes: unknown[] | null;
  images: unknown[] | null;
  noStock: boolean | null;
  /** 新建商品的 slug(服务端生成,唯一) */
  slug: string;
  /** 大杯变体(条码 -1 后缀)售价,KES 整元;null = 无变体。合并进 size_prices_json 的 L 价 */
  lSizePrice: number | null;
};

/** 银豹大杯变体条码后缀:"<base>-1"(银豹按杯型拆商品) */
export const SIZE_VARIANT_SUFFIX = "-1";

/** 变体条码 → 主商品条码;非变体原样返回 */
export function stripSizeVariantSuffix(barcode: string): string {
  return barcode.endsWith(SIZE_VARIANT_SUFFIX) ? barcode.slice(0, -SIZE_VARIANT_SUFFIX.length) : barcode;
}

export type ProductDiff = {
  barcode: string | null;
  name: string;
  /** 各字段差分;null = 该字段未变化 */
  oldBasePrice: number | null;
  newBasePrice: number | null;
  oldName: string | null;
  newName: string | null;
  oldCategorySlug: string | null;
  newCategorySlug: string | null;
};

export type ProductSyncStore = {
  /** 分类字典 upsert(uid 唯一) */
  upsertCategories(rows: CategoryRow[]): Promise<void>;
  /** 口味字典 upsert(uid 唯一) */
  upsertTastes(rows: TasteRow[]): Promise<void>;
  /** 映射表批量 upsert(按 pospal_uid 唯一) */
  upsertMappings(rows: ProductRow[]): Promise<void>;
  /** 商品本体 upsert:按 barcode 命中更新银豹字段(手动锁定商品跳过),未命中插入新商品 */
  upsertProducts(rows: PospalProductRow[]): Promise<{ created: number; updated: number; diffs: ProductDiff[] }>;
  /** 按 barcode = products.pospal_barcode 回填 product_id,返回本次匹配条数 */
  alignByBarcode(): Promise<number>;
  loadCursor(): Promise<string | null>;
  saveCursor(lastId: string): Promise<void>;
};

export type ProductSyncResult = {
  pages: number;
  items: number;
  productsCreated: number;
  productsUpdated: number;
  /** 更新中价格/名字/分类变化的行(≤100 条,超出截断) */
  diffs: ProductDiff[];
  matchedProducts: number;
  categories: number;
  tastes: number;
  /** 无条码商品跳过 upsert 的数量(只进映射表) */
  skippedNoBarcode: number;
};

export function normalizeProductRow(product: PospalProduct): ProductRow {
  return {
    uid: String(product.uid),
    barcode: product.barcode ?? null,
    name: product.name ?? "",
    sellPriceCents: product.sellPrice != null ? Math.round(product.sellPrice * 100) : null,
  };
}

/** 分类名 → Web 分类 slug(NFKD→小写→去非字母数字);空则 uid 后缀兜底 */
export function deriveCategorySlug(name: string, uid: string): string {
  const stem = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || `category-${uid.slice(-8)}`;
}

/**
 * 银豹分类名 → Web 规范分类 slug 白名单。
 * Web 店铺只渲染 drinkCategoryOrder/goodsCategoryOrder 里的分类,
 * 派生 slug(如 f-summy-sundae)会让整类商品在客户端不可见。
 * 不在白名单的分类走派生 slug(可在 pospal_categories 表手工调整)。
 */
const POSPAL_CATEGORY_SLUGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/奶茶/i, "milk-tea"],
  [/水果茶/i, "fruit-tea"],
  // 咖啡豆必须先于咖啡:"H咖啡豆Coffee beans" 同时含两词
  [/咖啡豆|coffee beans/i, "coffee-beans"],
  [/果咖|咖啡/i, "coffee"],
  [/冻冻茶/i, "jelly-tea"],
  [/奶昔/i, "shake"],
  [/圣代/i, "sundae"],
  [/冰沙/i, "cheese-smoothie"],
  [/舒芙蕾|shufulei/i, "souffle"],
  [/热饮|hot drink/i, "hot-drinks"],
  [/加料|add ons/i, "add-ons"],
  [/杯子|\bcup\b/i, "cups"],
  [/储值卡|promotional/i, "promotional-card"],
];

export function mapCategorySlug(name: string, uid: string): string {
  for (const [pattern, slug] of POSPAL_CATEGORY_SLUGS) {
    if (pattern.test(name)) return slug;
  }
  return deriveCategorySlug(name, uid);
}

/** 分类名 → kind:咖啡豆/杯子/储值卡类为 GOODS,其余 DRINK(lovemixue02 实测口径) */
export function deriveCategoryKind(name: string): "DRINK" | "GOODS" {
  return /咖啡豆|coffee beans|cup|杯子|储值卡|promotional/i.test(name) ? "GOODS" : "DRINK";
}

export function normalizeCategoryRow(category: PospalCategory): CategoryRow {
  const uid = String(category.uid);
  const name = category.name ?? "";
  return {
    uid,
    name,
    parentUid: category.parentUid != null ? String(category.parentUid) : null,
    // DB 列 not null:缺失视为默认启用/排序 0(银豹语义:缺省 = 默认值)
    enable: category.enable ?? 1,
    categoryOrder: category.categoryOrder ?? 0,
    categorySlug: mapCategorySlug(name, uid),
    kind: deriveCategoryKind(name),
  };
}

export function normalizeTasteRow(taste: PospalTaste): TasteRow {
  return {
    uid: String(taste.uid),
    attributeName: taste.attributeName ?? "",
    attributeValue: taste.attributeValue ?? null,
    // DB 列 not null:缺失视为非默认项
    isDefault: taste.isDefault ?? 0,
    packageUid: taste.packageUid != null ? String(taste.packageUid) : null,
    packageName: taste.packageName ?? null,
    packageType: taste.packageType ?? null,
  };
}

/** 商品行归一化:uid/categoryUid 转字符串、售价元转分、口味/图片原样透传 */
export function normalizePospalProductRow(
  product: PospalProduct,
  categoryByUid: Map<string, CategoryRow>,
): PospalProductRow {
  const categoryUid = product.categoryUid != null ? String(product.categoryUid) : null;
  const category = categoryUid != null ? categoryByUid.get(categoryUid) : undefined;
  const name = product.name ?? "";
  return {
    uid: String(product.uid),
    barcode: product.barcode ?? null,
    name,
    basePrice: product.sellPrice != null ? Math.round(product.sellPrice) : null,
    categoryUid,
    categorySlug: category?.categorySlug ?? "uncategorized",
    kind: category?.kind ?? "DRINK",
    tastes: Array.isArray(product.tastes) ? (product.tastes as unknown[]) : null,
    images: Array.isArray(product.images) ? (product.images as unknown[]) : null,
    noStock: typeof product.noStock === "number" ? product.noStock === 1 : null,
    slug: productSlug(name, category?.categorySlug ?? "pospal"),
    lSizePrice: null,
  };
}

/** 按条码去重(银豹重复建档时首个生效;无条码行原样保留,由调用方跳过) */
export function dedupeByBarcode(rows: PospalProductRow[]): PospalProductRow[] {
  const seen = new Set<string>();
  const out: PospalProductRow[] = [];
  for (const row of rows) {
    if (row.barcode == null) {
      out.push(row);
      continue;
    }
    if (seen.has(row.barcode)) continue;
    seen.add(row.barcode);
    out.push(row);
  }
  return out;
}

/** 游标分页拉全量(list 聚合;pageCap 防止字典异常时死循环) */
async function fetchAllPages<T>(
  fetchPage: (lastId: string | undefined) => Promise<{ list: T[]; hasMore: boolean; nextLastId?: string | number | null }>,
  pageCap = 100,
): Promise<T[]> {
  const all: T[] = [];
  let lastId: string | undefined;
  for (let page = 0; page < pageCap; page++) {
    const pageResult = await fetchPage(lastId);
    all.push(...pageResult.list);
    if (!pageResult.hasMore) break;
    lastId = pageResult.nextLastId != null ? String(pageResult.nextLastId) : undefined;
    if (lastId == null) break;
  }
  return all;
}

type CatalogClient = Pick<PospalClient, "getProductPage" | "getCategoryPage" | "getAttributePage">;

export async function syncProductDictionary(
  client: CatalogClient,
  store: ProductSyncStore,
  account: string,
): Promise<ProductSyncResult> {
  // 1) 字典:分类 + 口味(全量,limit 100)
  const categories = await fetchAllPages((lastId) =>
    client.getCategoryPage({ account, limit: 100, ...(lastId != null && { lastId }) }),
  );
  await store.upsertCategories(categories.map(normalizeCategoryRow));

  const tastes = await fetchAllPages((lastId) =>
    client.getAttributePage({ account, limit: 100, ...(lastId != null && { lastId }) }),
  );
  await store.upsertTastes(tastes.map(normalizeTasteRow));

  const categoryByUid = new Map(categories.map((c) => [String(c.uid), normalizeCategoryRow(c)]));

  // 2) 商品分页:开启图片/口味扩展(每个开关 +20 token/页)。
  //    先拉全量(变体可能与其主商品跨页),再一次性 upsert;
  //    游标在 upsert 成功后才保存,失败重跑不会丢页
  let cursor = await store.loadCursor();
  let pages = 0;
  let items = 0;
  let finalCursor: string | null = null;
  const allRows: PospalProductRow[] = [];

  while (true) {
    const page = await client.getProductPage({
      account,
      needImages: true,
      needTastes: true,
      ...(cursor != null && { lastId: cursor }),
    });
    pages += 1;
    if (page.list.length === 0) break;

    allRows.push(...dedupeByBarcode(page.list.map((p) => normalizePospalProductRow(p, categoryByUid))));
    await store.upsertMappings(page.list.map(normalizeProductRow));
    items += page.list.length;

    if (!page.hasMore) {
      if (page.nextLastId != null) finalCursor = String(page.nextLastId);
      break;
    }
    cursor = page.nextLastId != null ? String(page.nextLastId) : null;
    if (cursor == null) break; // hasMore 但无 nextLastId:视为同步完成
  }

  // 3) 大杯变体合并:条码 "-1" 后缀的商品不独立建档,售价并入主商品 L 价
  const variantByBase = new Map<string, number>();
  const productRows: PospalProductRow[] = [];
  for (const row of allRows) {
    if (row.barcode != null && row.barcode.endsWith(SIZE_VARIANT_SUFFIX)) {
      if (row.basePrice != null) variantByBase.set(stripSizeVariantSuffix(row.barcode), row.basePrice);
      continue;
    }
    productRows.push(row);
  }
  const barcoded = productRows
    .filter((row) => row.barcode != null)
    .map((row) => ({ ...row, lSizePrice: variantByBase.get(row.barcode as string) ?? null }));
  const skippedNoBarcode = productRows.length - barcoded.length;

  let created = 0;
  let updated = 0;
  const diffs: ProductDiff[] = [];
  if (barcoded.length > 0) {
    const upsertResult = await store.upsertProducts(barcoded);
    created = upsertResult.created;
    updated = upsertResult.updated;
    diffs.push(...upsertResult.diffs);
  }

  // 全部处理成功后保存终态游标:下次同步从增量点继续
  if (finalCursor != null) await store.saveCursor(finalCursor);

  const matchedProducts = await store.alignByBarcode();
  return {
    pages,
    items,
    productsCreated: created,
    productsUpdated: updated,
    diffs: diffs.slice(0, 100),
    matchedProducts,
    categories: categories.length,
    tastes: tastes.length,
    skippedNoBarcode,
  };
}

/** 同步游标 scope:product-dict:<account>(status 报表复用) */
export const syncScope = (account: string) => `product-dict:${account}`;
