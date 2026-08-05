import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export function createPickupToken(fulfillmentId: string, expiresAt: Date) {
  const nonce = randomBytes(24).toString("base64url");
  const payload = `${fulfillmentId}.${expiresAt.getTime()}.${nonce}`;
  const signature = createHmac("sha256", config.pickupSigningKey).update(payload).digest("base64url");
  const token = `${payload}.${signature}`;
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export function hashPickupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPickupSignature(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const signature = parts.pop()!;
  const payload = parts.join(".");
  const expected = createHmac("sha256", config.pickupSigningKey).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
