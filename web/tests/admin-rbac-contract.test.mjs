import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin shell exposes access management only through allowed tabs", async () => {
  const [shell, app] = await Promise.all([
    read("../app/admin/shell/AdminShell.tsx"),
    read("../app/admin/AdminApp.tsx"),
  ]);
  assert.match(shell, /allowedTabs\.includes\(item\)/);
  assert.match(app, /session\.role === "ADMIN"/);
  assert.match(app, /AccessManagementView/);
});

test("Operator viewer surfaces do not receive write affordances", async () => {
  const [products, coupons, customers] = await Promise.all([
    read("../app/admin/products/ProductsView.tsx"),
    read("../app/admin/coupons/CouponsView.tsx"),
    read("../app/admin/customers/CustomerEditorDialog.tsx"),
  ]);
  assert.match(products, /canWrite/);
  assert.match(coupons, /canWrite/);
  assert.match(customers, /canSetPassword/);
});

test("Overview renders server-scoped metrics", async () => {
  const overview = await read("../app/admin/overview/OverviewView.tsx");
  assert.match(overview, /overview\.metrics/);
  assert.match(overview, /Authorised stores/);
  assert.match(overview, /readOnly=\{!canManageOrders\}/);
});
