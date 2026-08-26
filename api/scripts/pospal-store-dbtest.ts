/**
 * 银豹同步存储的本地集成测试:在真实 Postgres 上执行 store.ts 的全部 SQL。
 * 复现线上 42P18(node-postgres null 参数无类型)并验证修复。
 * 用法(cd api,先起临时容器):
 *   docker run -d --name pospal-pg-test -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:16
 *   npx tsx scripts/pospal-store-dbtest.ts
 * 只写临时容器库,不碰 dev。
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { createPgProductSyncStore } from "../src/pospal/product-sync/store.js";
import {
  dedupeByBarcode,
  normalizeCategoryRow,
  normalizePospalProductRow,
  normalizeTasteRow,
  type CategoryRow,
  type PospalProductRow,
  type ProductRow,
  type TasteRow,
} from "../src/pospal/product-sync/service.js";

const pool = new Pool({
  host: process.env.PGTEST_HOST ?? "localhost",
  port: Number(process.env.PGTEST_PORT ?? 54329),
  database: "postgres",
  user: "postgres",
  password: "test",
});

async function applyMigrations() {
  // 重置临时库(测试容器专用,重跑干净)
  await pool.query("drop schema public cascade; create schema public");
  // 与生产 migrate.ts 一致:整文件一次 query 执行(多语句),不按 ; 切分
  const dir = resolve(process.cwd(), "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(readFileSync(resolve(dir, file), "utf8"));
    console.log(`  迁移 ${file} ✓`);
  }
}

/** 覆盖所有可空参数路径的行(带 null 值,复现 42P18) */
const categories: CategoryRow[] = [
  { uid: "cat-1", name: "A奶茶BOBA TEA", parentUid: "0", enable: 1, categoryOrder: 1, categorySlug: "a-boba-tea", kind: "DRINK" },
  { uid: "cat-2", name: "H咖啡豆Coffee beans", parentUid: null, enable: 1, categoryOrder: 0, categorySlug: "h-coffee-beans", kind: "GOODS" },
];

const tastes: TasteRow[] = [
  { uid: "t1", attributeName: "100%sugar", attributeValue: "0", isDefault: 0, packageUid: "p1", packageName: "sugar", packageType: 4 },
  { uid: "t2", attributeName: "boba", attributeValue: "50", isDefault: 0, packageUid: null, packageName: null, packageType: null },
];

/** 第二条:无条码 + 未定价(映射表 barcode/cents 可空) */
const mappings: ProductRow[] = [
  { uid: "u1", barcode: "d1", name: "A1 Assam Boba Tea", sellPriceCents: 38000 },
  { uid: "u2", barcode: null, name: "No barcode product", sellPriceCents: null },
];

const productA1: PospalProductRow = {
  uid: "u1",
  barcode: "d1",
  name: "A1 Assam Boba Tea",
  basePrice: 380,
  categoryUid: "cat-1",
  categorySlug: "a-boba-tea",
  kind: "DRINK",
  tastes: null,
  images: null,
  noStock: null,
  slug: "a-boba-tea-a1-abcdef01",
};

const productNew: PospalProductRow = {
  uid: "u3",
  barcode: "d3",
  name: "S1 Red Grape Smoothie",
  basePrice: 450,
  categoryUid: "cat-2",
  categorySlug: "h-coffee-beans",
  kind: "GOODS",
  tastes: [{ uid: "t1", attributeName: "100%sugar", attributeValue: "0" }],
  images: [{ path: "https://img.pospal.cn/x.jpg", isCover: 1 }],
  noStock: true,
  slug: "h-coffee-beans-s1-abcdef02",
};

async function main() {
  console.log("== 应用迁移 ==");
  await applyMigrations();

  const store = createPgProductSyncStore(pool, "hq-account");

  console.log("== upsertCategories(含 null enable/categoryOrder/parentUid)==");
  await store.upsertCategories(categories);

  console.log("== upsertTastes(含 null package 字段)==");
  await store.upsertTastes(tastes);

  console.log("== upsertMappings(含 null barcode/sellPriceCents)==");
  await store.upsertMappings(mappings);

  console.log("== upsertProducts 首轮:两条都 INSERT(null tastes/images/noStock)==");
  const first = await store.upsertProducts([productA1, productNew]);
  assert.deepEqual({ created: first.created, updated: first.updated, priceDiffs: first.priceDiffs }, { created: 2, updated: 0, priceDiffs: [] });

  console.log("== upsertProducts 次轮:d1 改价 400 → UPDATE + priceDiffs ==");
  const second = await store.upsertProducts([{ ...productA1, basePrice: 400 }]);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 1);
  assert.deepEqual(second.priceDiffs, [{ barcode: "d1", name: "A1 Assam Boba Tea", oldBasePrice: 380, newBasePrice: 400 }]);

  console.log("== alignByBarcode + 游标 ==");
  const matched = await store.alignByBarcode();
  assert.equal(matched, 1);
  await store.saveCursor("123");
  assert.equal(await store.loadCursor(), "123");

  console.log("== 数据核验 ==");
  const { rows: productRows } = await pool.query(
    "select pospal_barcode as barcode, name_en, base_price, kind, active, pospal_no_stock as no_stock, pospal_uid, category_slug, size_prices_json, jsonb_array_length(coalesce(pospal_tastes_json,'[]')) as tastes_len, jsonb_array_length(coalesce(pospal_images_json,'[]')) as images_len from products order by pospal_barcode",
  );
  assert.equal(productRows.length, 2);
  const a1 = productRows[0];
  assert.equal(a1.barcode, "d1");
  assert.equal(a1.name_en, "A1 Assam Boba Tea");
  assert.equal(a1.base_price, 400); // 次轮改价已生效
  assert.equal(a1.active, true);
  assert.equal(a1.no_stock, null);
  assert.equal(a1.pospal_uid, "u1");
  assert.deepEqual(a1.size_prices_json, { "One size": 380 }); // 仅 INSERT 时写入,UPDATE 不动
  const s1 = productRows[1];
  assert.equal(s1.barcode, "d3");
  assert.equal(s1.kind, "GOODS");
  assert.equal(s1.no_stock, true);
  assert.equal(Number(s1.tastes_len), 1);
  assert.equal(Number(s1.images_len), 1);

  const { rows: mappingRows } = await pool.query("select pospal_uid, pospal_barcode, product_id from pospal_product_mappings order by pospal_uid");
  assert.equal(mappingRows.length, 2);
  assert.ok(mappingRows[0].product_id, "u1 应已按条码对齐");

  const { rows: categoryRows } = await pool.query("select uid, enable, parent_uid from pospal_categories order by uid");
  assert.equal(categoryRows.length, 2);
  assert.equal(categoryRows[1].enable, 1);
  assert.equal(categoryRows[1].parent_uid, null);

  const { rows: tasteRows } = await pool.query("select count(*)::int as n from pospal_taste_options");
  assert.equal(tasteRows[0].n, 2);

  // ── 真实数据回归:用 POC 转储的门店目录全量跑一遍 ──
  const dumpPath = process.env.PGTEST_DUMP ?? resolve(process.cwd(), "pospal-dump/pospal-catalog-lovemixue02.json");
  const dump = JSON.parse(readFileSync(dumpPath, "utf8"));
  console.log(`== 真实数据回归:${dump.meta.account} 转储(${dump.products.length} 商品)==`);
  const realCategories = dump.categories.map(normalizeCategoryRow);
  const realTastes = dump.tastes.map(normalizeTasteRow);
  const categoryByUid = new Map(realCategories.map((c) => [c.uid, c]));
  const realProducts = dedupeByBarcode(
    dump.products.map((p: Record<string, unknown>) => normalizePospalProductRow(p as never, categoryByUid)),
  ).filter((row) => row.barcode != null);

  await store.upsertCategories(realCategories);
  await store.upsertTastes(realTastes);
  const realUpsert = await store.upsertProducts(realProducts);
  console.log(
    `  分类 ${realCategories.length} · 口味 ${realTastes.length} · 商品 ${realProducts.length} · created ${realUpsert.created} · updated ${realUpsert.updated} · 价差 ${realUpsert.priceDiffs.length}`,
  );

  const { rows: totalRows } = await pool.query("select count(*)::int as n from products");
  assert.equal(totalRows[0].n, 2 + realProducts.length, "商品总数 = 合成 2 条 + 真实目录全部");
  const { rows: noBarcodeRows } = await pool.query("select count(*)::int as n from products where pospal_barcode is null");
  assert.equal(noBarcodeRows[0].n, 0, "有 barcode 的商品全部入 products");

  console.log("\n全部断言通过 ✓ —— 合成 + 真实数据在真实 Postgres 上全部通过");
  await pool.end();
}

main().catch(async (error) => {
  console.error("✗ 集成测试失败:", error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
