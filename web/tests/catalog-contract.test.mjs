import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webMenuPath = fileURLToPath(new URL("../app/menu.ts", import.meta.url));
const apiSeedPath = fileURLToPath(
  new URL("../../api/src/seed.ts", import.meta.url),
);
const apiServerPath = fileURLToPath(
  new URL("../../api/src/server.ts", import.meta.url),
);
const webCatalogPath = fileURLToPath(
  new URL("../app/catalog.ts", import.meta.url),
);
const menuAssetDirectory = new URL(
  "../public/images/drinks/menu/",
  import.meta.url,
);

function extractRows(source, expression) {
  return [...source.matchAll(expression)].map((match) => ({
    code: match.groups.code,
    name: match.groups.name,
    nameZh: match.groups.nameZh,
    prices: match.groups.prices.replaceAll(/\s/g, ""),
    image: match.groups.image,
    badge: match.groups.badge ?? null,
  }));
}

const webRows = extractRows(
  readFileSync(webMenuPath, "utf8"),
  /^\s*\["(?<code>[A-Z]\d+)",\s*"[^"]+",\s*"(?<name>[^"]+)",\s*"(?<nameZh>[^"]+)",\s*(?<prices>\{[^}]+\}),\s*"(?<image>[^"]+)"(?:,\s*"(?<badge>[^"]+)")?\],$/gm,
);
const apiRows = extractRows(
  readFileSync(apiSeedPath, "utf8"),
  /^\s*\["(?<code>[A-Z]\d+)",\s*"[^"]+",\s*"[^"]+",\s*"(?<name>[^"]+)",\s*"(?<nameZh>[^"]+)",\s*(?<prices>\{[^}]+\}),\s*"(?<image>[^"]+)"(?:,\s*"(?<badge>[^"]+)")?\],$/gm,
);

test("web and API drink menu seeds remain equivalent during refactoring", () => {
  assert.equal(webRows.length, 47);
  assert.deepEqual(webRows, apiRows);
});

test("every seeded drink has a committed customer image", () => {
  for (const product of webRows) {
    assert.equal(
      existsSync(new URL(product.image, menuAssetDirectory)),
      true,
      `Missing menu image for ${product.code}: ${product.image}`,
    );
  }
});

test("customer product seeds resolve images through GCS bucket paths", () => {
  const menuSource = readFileSync(webMenuPath, "utf8");
  const dataSource = readFileSync(
    fileURLToPath(new URL("../app/data.ts", import.meta.url)),
    "utf8",
  );
  assert.match(menuSource, /seededProductMedia\(`products\/menu\/\$\{image\}`\)/);
  assert.match(dataSource, /seededProductMedia\("products\/goods\//);
  assert.doesNotMatch(menuSource, /image:\s*`\/images\/drinks\/menu\//);
  assert.doesNotMatch(dataSource, /image:\s*"\/images\/goods\//);
  // 以银豹为源后新商品 image_key 可为空,gcs:// 前缀不再区分目录来源;
  // API 目录必有 apiId(seed 目录无)
  assert.match(readFileSync(webCatalogPath, "utf8"), /isApiCatalog/);
});

test("the media proxy accepts encoded UUID product paths", () => {
  const apiServerSource = readFileSync(apiServerPath, "utf8");
  assert.match(apiServerSource, /maxParamLength:\s*1_000/);
  assert.match(
    apiServerSource,
    /methods:\s*\["GET",\s*"HEAD",\s*"POST",\s*"PATCH",\s*"DELETE",\s*"OPTIONS"\]/,
  );
});
