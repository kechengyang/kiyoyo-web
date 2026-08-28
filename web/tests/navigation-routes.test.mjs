import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("customer destinations have refresh-safe static routes", async () => {
  const [page, routes, app, navigation] = await Promise.all([
    read("../app/[tab]/page.tsx"),
    read("../app/components/customer/core/routes.ts"),
    read("../app/components/KiyoyoApp.tsx"),
    read("../app/components/customer/shell/navigation.tsx"),
  ]);

  for (const route of ["shop", "cart", "account"]) {
    assert.match(page, new RegExp(`"${route}"`));
    assert.match(routes, new RegExp(`"/${route}"`));
  }
  assert.match(page, /generateStaticParams/);
  assert.match(app, /useState<Tab>\(initialTab\)/);
  assert.match(app, /window\.history\.pushState/);
  assert.match(app, /window\.addEventListener\("popstate"/);
  assert.match(navigation, /href=\{customerTabPath\(item\)\}/);
  assert.match(navigation, /aria-current=\{tab === item \? "page"/);
});

test("admin destinations have refresh-safe static routes", async () => {
  const [page, routes, app, shell] = await Promise.all([
    read("../app/admin/[section]/page.tsx"),
    read("../app/admin/core/routes.ts"),
    read("../app/admin/AdminApp.tsx"),
    read("../app/admin/shell/AdminShell.tsx"),
  ]);

  for (const route of [
    "orders",
    "redeem",
    "customers",
    "management",
    "overview",
    "products",
    "coupons",
    "loyalty",
    "stores",
    "access",
  ]) {
    assert.match(page + routes, new RegExp(`"${route}"`));
  }
  assert.match(page, /generateStaticParams/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /KIYOYO Admin/);
  assert.match(app, /useState<AdminTab>\(initialTab\)/);
  assert.match(app, /window\.history\.pushState/);
  assert.match(app, /window\.addEventListener\("popstate"/);
  assert.match(app, /window\.history\.replaceState/);
  assert.match(shell, /href=\{adminTabPath\(item\)\}/);
  assert.match(shell, /aria-current=/);
});
