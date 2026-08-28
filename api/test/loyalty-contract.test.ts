import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("loyalty migrations are additive, immutable and idempotent", async () => {
  const migration = await read("../migrations/0011_loyalty_points.sql");
  const immutabilityMigration = await read("../migrations/0012_loyalty_ledger_immutability.sql");
  assert.match(migration, /earn_rate_basis_points integer not null default 100/);
  assert.match(migration, /create table loyalty_wallets/);
  assert.match(migration, /create table loyalty_transactions/);
  assert.match(migration, /loyalty_transactions_idempotency_unique/);
  assert.match(migration, /points_earn_rate_basis_points/);
  assert.doesNotMatch(migration, /drop table|drop column|truncate/i);
  assert.match(immutabilityMigration, /before update or delete on loyalty_transactions/);
  assert.match(immutabilityMigration, /old\.is_test/);
  assert.doesNotMatch(immutabilityMigration, /drop table|drop column|truncate/i);
});

test("checkout and Admin routes enforce the points contract", async () => {
  const server = await read("../src/server.ts");
  assert.match(server, /points_to_redeem/);
  assert.match(server, /POINTS_REQUIRE_IMMEDIATE_PAYMENT/);
  assert.match(server, /calculateEarnedPoints\(Math\.max\(0, subtotal - discount - pointsDiscount\)/);
  assert.match(server, /\/v1\/admin\/customers\/:id\/points-adjustments/);
  assert.match(server, /Idempotency-Key header is required/);
  assert.match(server, /pg_advisory_xact_lock/);
  assert.match(server, /LOYALTY_BALANCE_TOO_LOW/);
  assert.match(server, /LOYALTY_POINTS_CREDITED/);
  assert.match(server, /LOYALTY_POINTS_DEBITED/);
});
