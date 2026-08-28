import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEarnedPoints,
  calculatePointsRedemption,
  earnRatePercent,
  recordLoyaltyTransaction,
} from "../src/loyalty.js";

test("loyalty earn rate uses basis points and rounds down", () => {
  assert.equal(earnRatePercent(100), 1);
  assert.equal(calculateEarnedPoints(999, 100), 9);
  assert.equal(calculateEarnedPoints(1_000, 100), 10);
  assert.equal(calculateEarnedPoints(-1, 100), 0);
});

test("one point deducts one KES and cannot exceed balance or amount due", () => {
  assert.deepEqual(calculatePointsRedemption(250, 500, 600), {
    points: 250,
    discount: 250,
  });
  assert.equal(calculatePointsRedemption(501, 500, 600).error, "Your points balance is too low");
  assert.equal(calculatePointsRedemption(500, 500, 499).error, "Points cannot exceed the amount due");
});

test("points may cover the entire payable amount including delivery", () => {
  assert.deepEqual(calculatePointsRedemption(1_150, 2_000, 1_150), {
    points: 1_150,
    discount: 1_150,
  });
});

test("earn calculation excludes delivery and point-paid merchandise", () => {
  const merchandiseAfterCoupon = 1_000;
  const pointsDiscount = 250;
  assert.equal(calculateEarnedPoints(merchandiseAfterCoupon - pointsDiscount, 100), 7);
});

test("redemption rejects fractional and negative requests", () => {
  assert.match(calculatePointsRedemption(1.5, 100, 100).error, /whole number/);
  assert.match(calculatePointsRedemption(-1, 100, 100).error, /non-negative/);
});

test("manual debit cannot take a locked wallet below zero", async () => {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("for update")) {
        return { rows: [{ balance_points: 20, lifetime_earned_points: 0, lifetime_redeemed_points: 0 }] };
      }
      return { rows: [] };
    },
  };
  await assert.rejects(
    recordLoyaltyTransaction(client as never, {
      userId: "user",
      transactionType: "MANUAL_DEBIT",
      points: -21,
      reason: "Correction",
    }),
    /LOYALTY_BALANCE_TOO_LOW/,
  );
  assert.equal(statements.some((statement) => statement.startsWith("update loyalty_wallets")), false);
});
