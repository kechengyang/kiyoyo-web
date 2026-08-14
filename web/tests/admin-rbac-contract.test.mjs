import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin shell exposes the task home and management only through allowed tabs", async () => {
  const [shell, app, home, management] = await Promise.all([
    read("../app/admin/shell/AdminShell.tsx"),
    read("../app/admin/AdminApp.tsx"),
    read("../app/admin/home/AdminHomeView.tsx"),
    read("../app/admin/management/AdminManagementView.tsx"),
  ]);
  assert.match(shell, /allowedTabs\.includes\(item\)/);
  assert.match(app, /session\.role === "ADMIN"/);
  assert.match(app, /AccessManagementView/);
  assert.match(app, /useState<AdminTab>\(initialTab\)/);
  assert.match(home, /Redeem/);
  assert.match(home, /Orders/);
  assert.match(home, /Customers/);
  assert.match(home, /adminOnly: true/);
  assert.doesNotMatch(home, /What do you need to do/);
  assert.doesNotMatch(home, /admin-home-intro/);
  assert.match(management, /Users & access/);
});

test("Operator navigation is limited to operations and customer viewing", async () => {
  const app = await read("../app/admin/AdminApp.tsx");
  assert.match(app, /\["home", "orders", "redeem", "customers"\]/);
  assert.match(app, /staffSession\.role === "ADMIN"/);
  assert.match(app, /setCoupons\(\[\]\)/);
});

test("Customer viewer surface does not receive write affordances", async () => {
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
