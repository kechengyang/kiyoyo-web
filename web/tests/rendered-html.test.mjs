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
  assert.match(html, /aria-label="Your KIYOYO: Kilimani"/);
  assert.match(html, /class=" shop-entry"/);
  assert.match(html, />Shop<\/span>/);
  assert.match(html, /Assam Boba Tea/);
  assert.match(html, /KSh 380/);
  assert.match(html, /product-card drink-product/);
  const featured = html.match(
    /class="product-grid featured"[\s\S]*?<\/div><\/section>/,
  )?.[0];
  assert.ok(featured, "homepage trending section should render");
  assert.equal(
    featured.match(/product-card drink-product/g)?.length,
    8,
    "homepage trending should show one product from each drink category",
  );
  assert.doesNotMatch(featured, />Add-ons</);
  assert.match(featured, /Passion Fruit Tea/);
  assert.match(featured, /Raw Coconut Latte/);
  assert.match(html, /Home<\/span>/);
  assert.doesNotMatch(html, /Saved<\/span>/);
  assert.match(html, /Cart<\/span>/);
  assert.match(html, /Account<\/span>/);
});

test("server-renders the Nairobi operations admin", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /KIYOYO Admin/);
  assert.match(html, /SECURE OPERATIONS/);
  assert.match(html, /Checking access…/);
  assert.match(html, /Loading permissions and live Cloud SQL data/);
  assert.doesNotMatch(html, /Today’s orders|KYO-/);
});
