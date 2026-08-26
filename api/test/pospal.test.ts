import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { createPospalClient, PospalError, signRequest } from "../src/pospal/client.js";
import {
  dedupeByBarcode,
  deriveCategoryKind,
  deriveCategorySlug,
  mapCategorySlug,
  normalizeCategoryRow,
  normalizePospalProductRow,
  normalizeProductRow,
  normalizeTasteRow,
  syncProductDictionary,
  type CategoryRow,
  type PospalProductRow,
  type ProductDiff,
  type ProductRow,
  type ProductSyncStore,
  type TasteRow,
} from "../src/pospal/product-sync/service.js";
import type { CategoryPageResult, ProductPageResult, TastePageResult } from "../src/pospal/types.js";

const CLIENT_CONFIG = { baseUrl: "http://127.0.0.1:0", appId: "APPID0001", appKey: "APPSECRET999" };

/** 起一个本地假 POSPAL 服务器,把收到的请求交给 handler 并注入真实 baseUrl */
async function withFakeServer(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    handler(req, res, body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("签名:X-Sign = MD5(appId|requestId|timestamp|appKey).toUpperCase()", () => {
  // 向量:docs/12-pospal-integration.md §2.1 公式的固定输入
  assert.equal(
    signRequest("APPID0001", "req-123456", 1755075000, "APPSECRET999"),
    "CFE659944A45C726305D8DB106D28DB9",
  );
});

test("请求携带完整签名头,成功响应解析为 result", async () => {
  let captured: { headers: Record<string, string | string[] | undefined>; body: string } | null = null;
  await withFakeServer((req, res, body) => {
    captured = { headers: req.headers as Record<string, string | string[] | undefined>, body };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "success", errorCode: 0, result: { list: [], hasMore: false } }));
  }, async (baseUrl) => {
    const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl });
    const result = await client.getUserPage({ account: "store001" });

    assert.deepEqual(result, { list: [], hasMore: false });
    assert.ok(captured, "server 未收到请求");

    const headers = captured!.headers;
    assert.equal(headers["x-app-id"], "APPID0001");
    assert.equal(headers["content-type"], "application/json;charset=UTF-8");
    assert.ok(headers["x-request-id"], "缺少 X-Request-Id");

    const timestamp = Number(headers["x-timestamp"]);
    assert.ok(Math.abs(timestamp - Math.floor(Date.now() / 1000)) <= 300, "X-Timestamp 超出 ±5 分钟窗口");

    const expectedSign = signRequest("APPID0001", String(headers["x-request-id"]), timestamp, "APPSECRET999");
    assert.equal(headers["x-sign"], expectedSign);
    assert.deepEqual(JSON.parse(captured!.body), { account: "store001" });
  });
});

test("目录接口:category/attribute 路径与 limit,商品页扩展 flags 进入请求体", async () => {
  const captures: { url: string; body: string }[] = [];
  await withFakeServer((req, res, body) => {
    captures.push({ url: req.url ?? "", body });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "success", errorCode: 0, result: { list: [], hasMore: false } }));
  }, async (baseUrl) => {
    const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl });
    await client.getCategoryPage({ account: "store001", limit: 100 });
    await client.getAttributePage({ account: "store001" });
    await client.getProductPage({ account: "store001", needImages: true, needTastes: true });
  });

  assert.equal(captures[0].url, "/openapi/v3/product/category-page");
  assert.deepEqual(JSON.parse(captures[0].body), { account: "store001", limit: 100 });
  assert.equal(captures[1].url, "/openapi/v3/product/attribute-page");
  assert.deepEqual(JSON.parse(captures[1].body), { account: "store001" });
  assert.equal(captures[2].url, "/openapi/v3/product/increment-page");
  assert.deepEqual(JSON.parse(captures[2].body), { account: "store001", needImages: true, needTastes: true });
});

test("业务错误(4005)抛出 PospalError,标记为不可重试", async () => {
  await withFakeServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "error", errorCode: 4005, messages: ["无效的 account"] }));
  }, async (baseUrl) => {
    const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl });
    await assert.rejects(
      client.getUserPage({ account: "unknown" }),
      (error: PospalError) =>
        error instanceof PospalError && error.errorCode === 4005 && error.retryable === false && error.messages[0] === "无效的 account",
    );
  });
});

test("服务端 5xx 与瞬时错误码(5000)标记为可重试", async () => {
  await withFakeServer((req, res) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "error", errorCode: 5000, messages: ["系统异常"] }));
  }, async (baseUrl) => {
    const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl });
    await assert.rejects(
      client.getUserPage({ account: "store001" }),
      (error: PospalError) => error instanceof PospalError && error.retryable === true,
    );
  });
});

test("非 JSON 响应(500 HTML)抛出可重试错误", async () => {
  await withFakeServer((req, res) => {
    res.statusCode = 500;
    res.end("<html>Bad Gateway</html>");
  }, async (baseUrl) => {
    const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl });
    await assert.rejects(
      client.getUserPage({ account: "store001" }),
      (error: PospalError) => error instanceof PospalError && error.retryable === true && error.errorCode === null,
    );
  });
});

test("网络错误(连接拒绝)抛出可重试错误", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const client = createPospalClient({ ...CLIENT_CONFIG, baseUrl: `http://127.0.0.1:${port}` });
  await assert.rejects(
    client.getUserPage({ account: "store001" }),
    (error: PospalError) => error instanceof PospalError && error.retryable === true && error.errorCode === null,
  );
});

test("商品行归一化:uid 转字符串、售价元转分、缺省值兜底", () => {
  assert.deepEqual(normalizeProductRow({ uid: 123, barcode: "d1", name: "Mango Tea", sellPrice: 45.5 }), {
    uid: "123",
    barcode: "d1",
    name: "Mango Tea",
    sellPriceCents: 4550,
  });
  assert.deepEqual(normalizeProductRow({ uid: "456", barcode: null, name: undefined, sellPrice: null }), {
    uid: "456",
    barcode: null,
    name: "",
    sellPriceCents: null,
  });
});

test("分类派生:slug NFKD 化、空名兜底、kind 按分类名判断", () => {
  assert.equal(deriveCategorySlug("A奶茶BOBA TEA", "11112222333344445555"), "a-boba-tea");
  assert.equal(deriveCategorySlug("咖啡豆☕", "11112222333344445555"), "category-44445555");
  assert.equal(deriveCategoryKind("H咖啡豆Coffee beans"), "GOODS");
  assert.equal(deriveCategoryKind("J杯子 Cup"), "GOODS");
  assert.equal(deriveCategoryKind("A奶茶BOBA TEA"), "DRINK");
  assert.equal(deriveCategoryKind("VIP储值卡 promotional"), "GOODS");
});

test("分类 slug 白名单映射:银豹分类名归入 Web 规范分类,未命中走派生", () => {
  const uid = "11112222333344445555";
  assert.equal(mapCategorySlug("A奶茶BOBA TEA", uid), "milk-tea");
  assert.equal(mapCategorySlug("B水果茶VITAMIN C", uid), "fruit-tea");
  assert.equal(mapCategorySlug("C果咖FRUIT coffee", uid), "coffee");
  assert.equal(mapCategorySlug("D冻冻茶JELLY TEA", uid), "jelly-tea");
  assert.equal(mapCategorySlug("E 奶昔ROCKING SHAKE", uid), "shake");
  assert.equal(mapCategorySlug("F 圣代SUMMY SUNDAE", uid), "sundae");
  assert.equal(mapCategorySlug("S冰沙 FRUIT SMOOTHIE", uid), "cheese-smoothie");
  assert.equal(mapCategorySlug("L舒芙蕾 Shufulei", uid), "souffle");
  assert.equal(mapCategorySlug("G 热饮HOT DRINK", uid), "hot-drinks");
  assert.equal(mapCategorySlug("J加料ADD ONS", uid), "add-ons");
  assert.equal(mapCategorySlug("H咖啡豆Coffee beans", uid), "coffee-beans");
  assert.equal(mapCategorySlug("J杯子 Cup", uid), "cups");
  assert.equal(mapCategorySlug("VIP储值卡 Promotional", uid), "promotional-card");
  assert.equal(mapCategorySlug("未知分类XYZ", uid), "xyz"); // 未命中 → 派生
});

test("分类/口味归一化:uid 字符串化、字段透传", () => {
  assert.deepEqual(
    normalizeCategoryRow({ uid: "1736582354288124477", name: "A奶茶BOBA TEA", parentUid: "0", enable: 1, categoryOrder: 1 }),
    { uid: "1736582354288124477", name: "A奶茶BOBA TEA", parentUid: "0", enable: 1, categoryOrder: 1, categorySlug: "milk-tea", kind: "DRINK" },
  );
  assert.deepEqual(
    normalizeTasteRow({ uid: "111", attributeName: "boba", attributeValue: "50", isDefault: 0, packageUid: "p1", packageName: "ADD ONS", packageType: 1 }),
    { uid: "111", attributeName: "boba", attributeValue: "50", isDefault: 0, packageUid: "p1", packageName: "ADD ONS", packageType: 1 },
  );
  // 缺失 enable/categoryOrder → 默认启用/排序 0(DB 列 not null)
  const defaults = normalizeCategoryRow({ uid: "x", name: "咖啡" });
  assert.equal(defaults.enable, 1);
  assert.equal(defaults.categoryOrder, 0);
});

test("商品行归一化:分类映射注入、口味/图片透传、noStock 三态、未知分类兜底", () => {
  const categoryByUid = new Map([["cat-1", normalizeCategoryRow({ uid: "cat-1", name: "A奶茶BOBA TEA" })]]);
  const row = normalizePospalProductRow(
    {
      uid: "u1",
      barcode: "d1",
      name: "Mango Tea",
      sellPrice: 45.5,
      categoryUid: "cat-1",
      noStock: 1,
      images: [{ path: "https://img.pospal.cn/x.jpg", isCover: 1 }],
      tastes: [{ uid: "111", attributeName: "100%sugar" }],
    },
    categoryByUid,
  );
  assert.equal(row.categorySlug, "milk-tea");
  assert.equal(row.kind, "DRINK");
  assert.equal(row.basePrice, 46); // products.base_price 为 KES 整元(映射表才是分)
  assert.equal(row.noStock, true);
  assert.equal(row.images?.length, 1);
  assert.equal(row.tastes?.length, 1);
  assert.match(row.slug, /^milk-tea-mango-tea-[a-f0-9]{8}$/);

  const fallback = normalizePospalProductRow({ uid: "u2", barcode: "d2", name: "X", noStock: 0 }, categoryByUid);
  assert.equal(fallback.categorySlug, "uncategorized");
  assert.equal(fallback.kind, "DRINK");
  assert.equal(fallback.noStock, false);
});

test("按条码去重:首个生效,无条码行保留", () => {
  const baseRow = (uid: string, barcode: string | null): PospalProductRow => ({
    uid,
    barcode,
    name: "X",
    basePrice: 100,
    categoryUid: null,
    categorySlug: "cat",
    kind: "DRINK",
    tastes: null,
    images: null,
    noStock: null,
    slug: `s-${uid}`,
  });
  const result = dedupeByBarcode([baseRow("u1", "d1"), baseRow("u2", "d1"), baseRow("u3", null)]);
  assert.equal(result.length, 2);
  assert.equal(result[0].uid, "u1");
  assert.equal(result[1].uid, "u3");
});

function fakeStore(): ProductSyncStore & {
  upserted: ProductRow[];
  productRows: PospalProductRow[];
  categoryRows: CategoryRow[];
  tasteRows: TasteRow[];
  cursors: string[];
  calls: string[];
  /** 测试可预置旧价(模拟已存在商品) */
  basePrices: Map<string, number>;
} {
  const state = {
    upserted: [] as ProductRow[],
    productRows: [] as PospalProductRow[],
    categoryRows: [] as CategoryRow[],
    tasteRows: [] as TasteRow[],
    cursors: [] as string[],
    calls: [] as string[],
    basePrices: new Map<string, number>(),
    alignCalls: 0,
  };
  return {
    upserted: state.upserted,
    productRows: state.productRows,
    categoryRows: state.categoryRows,
    tasteRows: state.tasteRows,
    cursors: state.cursors,
    calls: state.calls,
    basePrices: state.basePrices,
    async upsertCategories(rows) {
      state.calls.push("categories");
      state.categoryRows.push(...rows);
    },
    async upsertTastes(rows) {
      state.calls.push("tastes");
      state.tasteRows.push(...rows);
    },
    async upsertMappings(rows) {
      state.calls.push("mappings");
      state.upserted.push(...rows);
    },
    async upsertProducts(rows) {
      state.calls.push("products");
      state.productRows.push(...rows);
      let created = 0;
      let updated = 0;
      const diffs: ProductDiff[] = [];
      for (const row of rows) {
        const old = state.basePrices.get(row.barcode as string);
        const next = row.basePrice ?? 0;
        if (old == null) {
          created += 1;
        } else {
          updated += 1;
          if (old !== next) {
            diffs.push({
              barcode: row.barcode,
              name: row.name,
              oldBasePrice: old,
              newBasePrice: next,
              oldName: null,
              newName: null,
              oldCategorySlug: null,
              newCategorySlug: null,
            });
          }
        }
        state.basePrices.set(row.barcode as string, next);
      }
      return { created, updated, diffs };
    },
    async alignByBarcode() {
      state.calls.push("align");
      state.alignCalls += 1;
      return state.upserted.length >= 2 ? 1 : 0;
    },
    async loadCursor() {
      return null;
    },
    async saveCursor(lastId) {
      state.cursors.push(lastId);
    },
  };
}

test("字典同步:游标分页直至 hasMore=false,保存游标并执行条码对齐", async () => {
  const requestedLastIds: (string | undefined)[] = [];
  const pages: ProductPageResult[] = [
    {
      list: [
        { uid: "1", barcode: "d1", name: "Mango Tea", sellPrice: 4.5 },
        { uid: "2", barcode: "d2", name: "Pearls", sellPrice: 0.5 },
      ],
      hasMore: true,
      nextLastId: "100",
    },
    { list: [{ uid: "3", barcode: "d3", name: "Milk Tea", sellPrice: 4 }], hasMore: false, nextLastId: "200" },
  ];
  const fakeClient = {
    getCategoryPage: async () => ({ list: [], hasMore: false }) as CategoryPageResult,
    getAttributePage: async () => ({ list: [], hasMore: false }) as TastePageResult,
    getProductPage: async (input: { account: string; lastId?: string | number; needImages?: boolean; needTastes?: boolean }) => {
      requestedLastIds.push(input.lastId == null ? undefined : String(input.lastId));
      return pages.shift()!;
    },
  };

  const store = fakeStore();
  const result = await syncProductDictionary(fakeClient, store, "store001");

  assert.equal(result.pages, 2);
  assert.equal(result.items, 3);
  assert.equal(result.productsCreated, 3);
  assert.equal(result.productsUpdated, 0);
  assert.deepEqual(result.diffs, []);
  assert.equal(result.matchedProducts, 1);
  assert.equal(result.categories, 0);
  assert.equal(result.tastes, 0);
  assert.equal(result.skippedNoBarcode, 0);
  assert.deepEqual(requestedLastIds, [undefined, "100"], "第二页应携带上一页的 nextLastId(字符串)");
  assert.deepEqual(store.cursors, ["100", "200"], "含最后一页的终态游标(hasMore=false 时也保存,避免下次重拉)");
  assert.equal(store.upserted.length, 3);
  assert.equal(store.upserted[2].uid, "3");
});

test("字典同步:空列表或 hasMore=false 立即结束,不保存多余游标", async () => {
  const store = fakeStore();
  const result = await syncProductDictionary(
    {
      getCategoryPage: async () => ({ list: [], hasMore: false }) as CategoryPageResult,
      getAttributePage: async () => ({ list: [], hasMore: false }) as TastePageResult,
      getProductPage: async () => ({ list: [], hasMore: false }),
    },
    store,
    "store001",
  );
  assert.equal(result.pages, 1);
  assert.equal(result.items, 0);
  assert.deepEqual(store.cursors, []);
  assert.deepEqual(store.productRows, []);
});

test("字典同步 v2:分类/口味先落库、商品开扩展 flags、重复条码去重、无条码跳过、价差报表", async () => {
  const store = fakeStore();
  store.basePrices.set("d2", 400); // 预置旧价:d2 命中更新并产生价差

  const productInputs: { needImages?: boolean; needTastes?: boolean; lastId?: string | number }[] = [];
  const pages: ProductPageResult[] = [
    {
      list: [
        { uid: "1", barcode: "d1", name: "Mango Tea", sellPrice: 4.5, categoryUid: "cat-1", noStock: 1 },
        { uid: "2", barcode: "d1", name: "Mango Tea dup", sellPrice: 9 },
        { uid: "3", barcode: null, name: "No barcode" },
      ],
      hasMore: true,
      nextLastId: "100",
    },
    { list: [{ uid: "4", barcode: "d2", name: "Milk Tea", sellPrice: 5 }], hasMore: false, nextLastId: "200" },
  ];
  const fakeClient = {
    getCategoryPage: async (input: { limit?: number }) => {
      assert.equal(input.limit, 100);
      return { list: [{ uid: "cat-1", name: "A奶茶BOBA TEA" }], hasMore: false };
    },
    getAttributePage: async (input: { limit?: number }) => {
      assert.equal(input.limit, 100);
      return { list: [{ uid: "t1", attributeName: "100%sugar", packageName: "sugar", packageType: 4 }], hasMore: false };
    },
    getProductPage: async (input: { needImages?: boolean; needTastes?: boolean; lastId?: string | number }) => {
      productInputs.push(input);
      return pages.shift()!;
    },
  };

  const result = await syncProductDictionary(fakeClient, store, "store001");

  // 调用顺序:categories → tastes → 每页 products+mappings → align
  assert.deepEqual(store.calls, ["categories", "tastes", "products", "mappings", "products", "mappings", "align"]);
  assert.equal(store.categoryRows.length, 1);
  assert.equal(store.categoryRows[0].categorySlug, "milk-tea");
  assert.equal(store.tasteRows.length, 1);
  for (const input of productInputs) {
    assert.equal(input.needImages, true);
    assert.equal(input.needTastes, true);
  }
  // 重复条码只 upsert 一次(首个生效);无条码行跳过
  assert.deepEqual(store.productRows.map((row) => row.barcode), ["d1", "d2"]);
  assert.deepEqual(result, {
    pages: 2,
    items: 4,
    productsCreated: 1,
    productsUpdated: 1,
    diffs: [
      { barcode: "d2", name: "Milk Tea", oldBasePrice: 400, newBasePrice: 5, oldName: null, newName: null, oldCategorySlug: null, newCategorySlug: null },
    ],
    matchedProducts: 1,
    categories: 1,
    tastes: 1,
    skippedNoBarcode: 1,
  });
});
