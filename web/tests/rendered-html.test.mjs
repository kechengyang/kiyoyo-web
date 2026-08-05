import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the KIYOYO customer storefront", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>KIYOYO — Tea, treats &amp; happy things<\/title>/i);
  assert.match(html, /Fruit Rush/);
  assert.match(html, /fruit-tea-campaign-v2\.jpg/);
  assert.match(html, /KIYOYO campaigns/);
  assert.match(html, />DRINK</);
  assert.match(html, /Assam Boba Milk Tea/);
  assert.match(html, /KSh 420/);
  assert.match(html, /product-card drink-product/);
});

test("server-renders the Nairobi operations admin", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /KIYOYO Admin/);
  assert.match(html, /Today’s orders/);
  assert.match(html, /Redeem pickup/);
  assert.match(html, /KYO-2608-3179/);
});
