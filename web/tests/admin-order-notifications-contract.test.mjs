import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("new orders use authenticated SSE with server-side store scope", async () => {
  const [app, platform, server, events] = await Promise.all([
    read("../app/admin/AdminApp.tsx"),
    read("../app/platform.ts"),
    read("../../api/src/server.ts"),
    read("../../api/src/order-events.ts"),
  ]);
  assert.match(server, /\/v1\/admin\/order-alerts/);
  assert.match(server, /\/v1\/admin\/order-events/);
  assert.match(server, /requirePermission\("orders\.read"\)/);
  assert.match(server, /staff\.role === "ADMIN" \? null : staff\.storeIds/);
  assert.match(server, /f\.store_id=any\(\$1::uuid\[\]\)/);
  assert.match(server, /scope\.includes\(event\.storeId\)/);
  assert.match(server, /text\/event-stream/);
  assert.match(events, /ORDER_CHANNEL = "kiyoyo_new_orders"/);
  assert.match(events, /client\.query\(`listen \$\{ORDER_CHANNEL\}`\)/);
  assert.match(events, /pg_notify/);
  assert.match(platform, /Authorization: `Bearer \$\{token\}`/);
  assert.match(platform, /response\.body\.getReader\(\)/);
  assert.match(app, /knownOrderIdsRef/);
  assert.match(app, /streamAdminOrderEvents/);
  assert.doesNotMatch(app, /setInterval\(pollOrderAlerts/);
  assert.match(app, /\/v1\/admin\/overview/);
});

test("new order notice provides a chime, exact copy, and accessible controls", async () => {
  const [notice, shell] = await Promise.all([
    read("../app/admin/orders/NewOrderNotifications.tsx"),
    read("../app/admin/shell/AdminShell.tsx"),
  ]);
  assert.match(notice, /You have a new order!/);
  assert.match(notice, /您有一个新订单！/);
  assert.match(notice, /role="alert"/);
  assert.match(notice, /createOscillator/);
  assert.match(shell, /aria-pressed=\{soundEnabled\}/);
  assert.match(shell, /New order alerts are reconnecting/);
});
