import assert from "node:assert/strict";
import test from "node:test";
import { calculateCouponDiscount, type CouponRow } from "../src/coupons.js";

const coupon = (overrides: Partial<CouponRow> = {}): CouponRow => ({
  id: "coupon",
  code: "TEST10",
  name_en: "Test",
  name_zh: "测试",
  description_en: "",
  description_zh: "",
  discount_type: "PERCENT",
  discount_value: 10,
  max_discount: null,
  min_spend: 0,
  scope_type: "ALL",
  scope_value: null,
  fulfillment_scope: "ALL",
  issuance_mode: "ASSIGNED",
  starts_at: "2026-01-01T00:00:00Z",
  ends_at: "2027-01-01T00:00:00Z",
  issuance_limit: null,
  usage_limit: null,
  per_user_limit: 1,
  status: "ACTIVE",
  issuance_enabled: true,
  redemption_enabled: true,
  stackable: false,
  version: 1,
  ...overrides,
});

const drink = {
  quantity: 2,
  customization: { size: "L" },
  product: {
    id: "drink-id",
    external_code: "A1",
    slug: "assam-boba",
    kind: "DRINK",
    category_slug: "milk-tea",
    size_prices_json: { M: 380, L: 480 },
  },
  unitPrice: 480,
};

test("percentage coupons honor eligible subtotal and maximum discount", () => {
  assert.deepEqual(
    calculateCouponDiscount(coupon({ discount_value: 20, max_discount: 150 }), [drink]),
    { discount: 150, eligibleSubtotal: 960, error: null },
  );
});

test("category scope and minimum spend reject ineligible carts", () => {
  assert.equal(
    calculateCouponDiscount(coupon({ scope_type: "CATEGORY", scope_value: "fruit-tea" }), [drink]).error,
    "Coupon does not apply to these items",
  );
  assert.match(
    calculateCouponDiscount(coupon({ min_spend: 1_000 }), [drink]).error ?? "",
    /Spend at least/,
  );
});

test("fixed coupons never discount more than eligible items", () => {
  assert.equal(
    calculateCouponDiscount(coupon({ discount_type: "FIXED", discount_value: 2_000 }), [drink]).discount,
    960,
  );
});

test("free size upgrade discounts one largest upgrade", () => {
  assert.equal(
    calculateCouponDiscount(coupon({ discount_type: "FREE_SIZE_UPGRADE", discount_value: 0, scope_type: "DRINKS" }), [drink]).discount,
    100,
  );
});

