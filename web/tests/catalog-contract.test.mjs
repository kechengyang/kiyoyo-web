import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webMenuPath = fileURLToPath(new URL("../app/menu.ts", import.meta.url));
const apiSeedPath = fileURLToPath(
  new URL("../../api/src/seed.ts", import.meta.url),
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
