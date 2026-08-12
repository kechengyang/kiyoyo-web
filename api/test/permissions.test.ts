import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessStore,
  isValidUsername,
  permissionsForRole,
  roleHasPermission,
  staffIdentityAlias,
} from "../src/admin/permissions.js";

test("Admin receives every sensitive permission", () => {
  assert.equal(roleHasPermission("ADMIN", "access.create"), true);
  assert.equal(roleHasPermission("ADMIN", "customers.password_set"), true);
  assert.equal(roleHasPermission("ADMIN", "products.write"), true);
});

test("Operator permissions match the approved viewer/full-access matrix", () => {
  const permissions = permissionsForRole("OPERATOR");
  assert.equal(permissions.includes("overview.read"), true);
  assert.equal(permissions.includes("orders.transition"), true);
  assert.equal(permissions.includes("redeem.execute"), true);
  assert.equal(permissions.includes("customers.read"), true);
  assert.equal(permissions.includes("products.read"), true);
  assert.equal(permissions.includes("coupons.read"), true);
  assert.equal(permissions.includes("customers.write"), false);
  assert.equal(permissions.includes("products.write"), false);
  assert.equal(permissions.includes("coupons.write"), false);
  assert.equal(permissions.includes("access.read"), false);
});

test("Operator store access is limited to assigned IDs while Admin is global", () => {
  assert.equal(canAccessStore("OPERATOR", ["store-a", "store-b"], "store-a"), true);
  assert.equal(canAccessStore("OPERATOR", ["store-a", "store-b"], "store-c"), false);
  assert.equal(canAccessStore("ADMIN", [], "store-c"), true);
});

test("staff usernames are normalized and mapped without a real email address", () => {
  assert.equal(isValidUsername("Westlands.Lead"), true);
  assert.equal(isValidUsername("bad username"), false);
  assert.equal(staffIdentityAlias("Westlands.Lead"), "westlands.lead@staff.kiyoyo.internal");
});
