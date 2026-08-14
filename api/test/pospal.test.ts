import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { createPospalClient, PospalError, signRequest } from "../src/pospal/client.js";
import {
  normalizeProductRow,
  syncProductDictionary,
  type ProductRow,
  type ProductSyncStore,
} from "../src/pospal/product-sync/service.js";
import type { ProductPageResult } from "../src/pospal/types.js";

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

function fakeStore(): ProductSyncStore & { upserted: ProductRow[]; cursors: string[] } {
  const state = { upserted: [] as ProductRow[], cursors: [] as string[], alignCalls: 0 };
  return {
    upserted: state.upserted,
    cursors: state.cursors,
    async upsertMappings(rows) {
      state.upserted.push(...rows);
    },
    async alignByBarcode() {
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
    getProductPage: async (input: { account: string; lastId?: string | number }) => {
      requestedLastIds.push(input.lastId == null ? undefined : String(input.lastId));
      return pages.shift()!;
    },
  };

  const store = fakeStore();
  const result = await syncProductDictionary(fakeClient, store, "store001");

  assert.deepEqual(result, { pages: 2, items: 3, matchedProducts: 1 });
  assert.deepEqual(requestedLastIds, [undefined, "100"], "第二页应携带上一页的 nextLastId(字符串)");
  assert.deepEqual(store.cursors, ["100", "200"], "含最后一页的终态游标(hasMore=false 时也保存,避免下次重拉)");
  assert.equal(store.upserted.length, 3);
  assert.equal(store.upserted[2].uid, "3");
});

test("字典同步:空列表或 hasMore=false 立即结束,不保存多余游标", async () => {
  const store = fakeStore();
  const result = await syncProductDictionary(
    { getProductPage: async () => ({ list: [], hasMore: false }) },
    store,
    "store001",
  );
  assert.deepEqual(result, { pages: 1, items: 0, matchedProducts: 0 });
  assert.deepEqual(store.cursors, []);
});
