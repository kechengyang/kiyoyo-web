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
  syncProductDictionary,
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
  lSizePrice: null,
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
  lSizePrice: null,
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
  assert.deepEqual({ created: first.created, updated: first.updated, diffs: first.diffs }, { created: 2, updated: 0, diffs: [] });

  console.log("== upsertProducts 次轮:d1 改价 400 → UPDATE + 差分 ==");
  const second = await store.upsertProducts([{ ...productA1, basePrice: 400 }]);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 1);
  assert.deepEqual(second.diffs, [
    { barcode: "d1", name: "A1 Assam Boba Tea", oldBasePrice: 380, newBasePrice: 400, oldName: null, newName: null, oldCategorySlug: null, newCategorySlug: null },
  ]);

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

  // ── 0008 数据迁移回归(生产顺序:迁移先于同步):B2/D4 绑条码 + 清同步游标 ──
  console.log("== 0008 数据迁移回归 ==");
  await pool.query(
    `insert into products (kind, category_slug, slug, name_en, name_zh, base_price, active, external_code)
     values ('DRINK','fruit-tea','b2-migration-test','Aroma Lemonade','香水柠檬',199,true,'B2'),
            ('DRINK','jelly-tea','d4-migration-test','Pineapple Passion Jelly Tea','菠萝百香果冻冻茶',480,true,'D4')`,
  );
  await pool.query(
    "insert into pospal_sync_state (scope, last_id) values ('product-dict:hq-account', '999') on conflict (scope) do update set last_id = excluded.last_id",
  );
  await pool.query(readFileSync(resolve(process.cwd(), "migrations/0008_bind_barcodes_full_resync.sql"), "utf8"));
  const { rows: bound } = await pool.query(
    "select external_code, pospal_barcode from products where external_code in ('B2','D4') order by external_code",
  );
  assert.deepEqual(bound, [
    { external_code: "B2", pospal_barcode: "2601222157299" },
    { external_code: "D4", pospal_barcode: "2601251618136" },
  ]);
  const { rows: cursorLeft } = await pool.query("select count(*)::int as n from pospal_sync_state");
  assert.equal(cursorLeft[0].n, 0, "0008 应清空 product-dict 游标,强制全量重同步");

  // ── 真实数据回归:用 POC 转储的门店目录走完整 syncProductDictionary 生产路径 ──
  // B2/D4 已占 2601222157299 / 2601251618136,真实目录中 B6/B5 按条码命中更新;
  // -1 大杯变体不建档,售价并入主商品 L 价
  const dumpPath = process.env.PGTEST_DUMP ?? resolve(process.cwd(), "pospal-dump/pospal-catalog-lovemixue02.json");
  const dump = JSON.parse(readFileSync(dumpPath, "utf8"));
  console.log(`== 真实数据回归:${dump.meta.account} 转储(${dump.products.length} 商品,完整生产路径)==`);
  const realClient = {
    getCategoryPage: async () => ({ list: dump.categories, hasMore: false }),
    getAttributePage: async () => ({ list: dump.tastes, hasMore: false }),
    getProductPage: async () => ({ list: dump.products, hasMore: false }),
  };
  const syncResult = await syncProductDictionary(realClient, store, "hq-real");
  console.log(
    `  分类 ${syncResult.categories} · 口味 ${syncResult.tastes} · 商品 ${syncResult.items} · created ${syncResult.productsCreated} · updated ${syncResult.productsUpdated} · 差分 ${syncResult.diffs.length} · 变体跳过 ${syncResult.items - syncResult.productsCreated - syncResult.productsUpdated - syncResult.skippedNoBarcode}`,
  );
  assert.equal(syncResult.items, 78);
  assert.equal(syncResult.productsCreated, 68, "78 - 8 个 -1 变体 - 2 条 B6/B5 合并(B2/D4)");
  assert.equal(syncResult.productsUpdated, 2, "B6/B5 条码命中 B2/D4 → 走 UPDATE");
  assert.equal(syncResult.diffs.length, 2, "B2←B6(改名)与 D4←B5(改价/名/分类)各产生一条差分");
  assert.equal(syncResult.skippedNoBarcode, 0);

  const { rows: totalRows } = await pool.query("select count(*)::int as n from products");
  assert.equal(totalRows[0].n, 72, "商品总数 = 合成 2 + 迁移 2 + 真实 68");
  const { rows: noBarcodeRows } = await pool.query("select count(*)::int as n from products where pospal_barcode is null");
  assert.equal(noBarcodeRows[0].n, 0, "有 barcode 的商品全部入 products");
  const { rows: variantRows } = await pool.query("select count(*)::int as n from products where pospal_barcode like '%-1'");
  assert.equal(variantRows[0].n, 0, "-1 大杯变体不独立建档");
  const { rows: a1Rows } = await pool.query("select size_prices_json from products where pospal_barcode = '2886489262843'");
  assert.equal(a1Rows.length, 1);
  assert.deepEqual(a1Rows[0].size_prices_json, { M: 380, L: 480 }, "A1 大杯变体价并入 sizePrices L");

  // ── 手动改码守卫:admin 手动改条码后,旧条码字典行(uid 已在库)不重复建商品 ──
  console.log("== 手动改码守卫 ==");
  await pool.query("update products set pospal_barcode = 'd1-manual' where pospal_barcode = 'd1'");
  const relink = await store.upsertProducts([
    { ...productA1, barcode: "d1", basePrice: 999 }, // 旧条码 + 已存在 uid → 不得重复建
    { ...productA1, barcode: "d1-manual", basePrice: 999 }, // 新条码 → 命中手动改码商品,重新连接
  ]);
  assert.equal(relink.created, 0, "旧条码行 uid 已在库,不得建重复商品");
  assert.equal(relink.updated, 1, "新条码行应命中手动改码商品");
  const { rows: dupCheck } = await pool.query("select count(*)::int as n from products where pospal_uid = 'u1'");
  assert.equal(dupCheck[0].n, 1, "同一 uid 的商品只有一条");

  // ── 手动锁定:锁定的商品同步不覆盖;解锁后恢复 ──
  console.log("== 手动锁定 ==");
  await pool.query("update products set pospal_manual_override = true where pospal_barcode = 'd1-manual'");
  const locked = await store.upsertProducts([{ ...productA1, barcode: "d1-manual", basePrice: 1, name: "LOCKED NAME" }]);
  assert.equal(locked.updated, 0, "锁定商品不应被同步更新");
  const { rows: lockedRow } = await pool.query("select base_price, name_en from products where pospal_barcode = 'd1-manual'");
  assert.equal(lockedRow[0].base_price, 999, "锁定商品价格保持手动值");
  assert.equal(lockedRow[0].name_en, "A1 Assam Boba Tea", "锁定商品名字保持");

  await pool.query("update products set pospal_manual_override = false where pospal_barcode = 'd1-manual'");
  const unlocked = await store.upsertProducts([{ ...productA1, barcode: "d1-manual", basePrice: 1, name: "LOCKED NAME" }]);
  assert.equal(unlocked.updated, 1, "解锁后恢复银豹覆盖");
  assert.equal(unlocked.diffs.length, 1, "解锁后的覆盖产生差分");

  // ── 0010 数据迁移回归:删除已建变体商品 + 清游标 ──
  console.log("== 0010 数据迁移回归 ==");
  await pool.query(
    "insert into products (kind, category_slug, slug, name_en, name_zh, base_price, active, pospal_barcode, pospal_uid) values ('DRINK','milk-tea','variant-migration-test','A1 Assam Boba Tea','阿萨姆珍珠奶茶',480,true,'2886489262843-1','u-variant')",
  );
  await pool.query(readFileSync(resolve(process.cwd(), "migrations/0010_size_variant_dedupe.sql"), "utf8"));
  const { rows: variantLeft } = await pool.query(
    "select count(*)::int as n from products where pospal_barcode like '%-1' and pospal_uid is not null",
  );
  assert.equal(variantLeft[0].n, 0, "0010 应删除已同步创建的变体商品");
  const { rows: cursorLeft2 } = await pool.query("select count(*)::int as n from pospal_sync_state where scope like 'product-dict:%'");
  assert.equal(cursorLeft2[0].n, 0, "0010 应清空 product-dict 游标");

  console.log("\n全部断言通过 ✓ —— 合成 + 0008/0010 数据迁移 + 真实数据(生产路径)+ 手动改码守卫 + 手动锁定全部通过");
  await pool.end();
}

main().catch(async (error) => {
  console.error("✗ 集成测试失败:", error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
