import assert from "node:assert/strict";
import test from "node:test";

process.env.DB_PASSWORD ??= "refactor-contract-db-password";
process.env.PICKUP_SIGNING_KEY ??= "refactor-contract-pickup-signing-key";
process.env.POSPAL_APP_ID ??= "refactor-contract-pospal-app-id";
process.env.POSPAL_APP_KEY ??= "refactor-contract-pospal-app-key";
process.env.POSPAL_HQ_ACCOUNT ??= "refactor-contract-pospal-hq";

const { createPickupToken, hashPickupToken, verifyPickupSignature } =
  await import("../src/crypto.js");

test("pickup tokens are signed, hashed, and unique", () => {
  const expiresAt = new Date("2026-08-11T12:00:00.000Z");
  const first = createPickupToken("fulfillment-contract", expiresAt);
  const second = createPickupToken("fulfillment-contract", expiresAt);

  assert.equal(first.token.split(".").length, 4);
  assert.equal(first.hash, hashPickupToken(first.token));
  assert.equal(first.hash.length, 64);
  assert.equal(verifyPickupSignature(first.token), true);
  assert.notEqual(first.token, second.token);
});

test("pickup token verification rejects malformed and tampered values", () => {
  const { token } = createPickupToken(
    "fulfillment-contract",
    new Date("2026-08-11T12:00:00.000Z"),
  );
  const parts = token.split(".");
  const tamperedPayload = ["different-fulfillment", ...parts.slice(1)].join(".");
  const tamperedSignature = [...parts.slice(0, 3), `${parts[3]}x`].join(".");

  assert.equal(verifyPickupSignature("not-a-pickup-token"), false);
  assert.equal(verifyPickupSignature(tamperedPayload), false);
  assert.equal(verifyPickupSignature(tamperedSignature), false);
});
