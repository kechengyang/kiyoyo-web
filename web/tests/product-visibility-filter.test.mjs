import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("product visibility defaults to alive products", async () => {
  const app = await read("../app/admin/AdminApp.tsx");
  assert.match(
    app,
    /useState<[\s\S]*?"alive" \| "offline" \| "all"[\s\S]*?>\("alive"\)/,
  );
  assert.match(app, /productVisibility === "alive"/);
  assert.match(app, /product\.active !== false/);
  assert.match(app, /productVisibility === "all"/);
});

test("Visibility column exposes alive, offline and all labels", async () => {
  const products = await read("../app/admin/products/ProductsView.tsx");
  assert.match(products, /aria-label="Filter products by visibility"/);
  assert.match(products, /<option value="alive">Alive<\/option>/);
  assert.match(products, /<option value="offline">Offline<\/option>/);
  assert.match(products, /<option value="all">All<\/option>/);
  assert.match(products, /No products match the current filters\./);
});
