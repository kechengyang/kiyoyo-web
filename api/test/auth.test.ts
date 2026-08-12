import assert from "node:assert/strict";
import test from "node:test";

process.env.DB_PASSWORD ??= "auth-contract-db-password";
process.env.PICKUP_SIGNING_KEY ??= "auth-contract-pickup-signing-key";

const { trustedProviderIdentities } = await import(
  "../src/modules/auth/middleware.js"
);

test("trustedProviderIdentities maps and deduplicates Firebase identities", () => {
  const providers = trustedProviderIdentities({
    uid: "firebase-user-1",
    email: "Member@Example.com",
    email_verified: true,
    firebase: {
      sign_in_provider: "google.com",
      identities: {
        email: ["Member@Example.com"],
        "google.com": ["google-subject-1", "google-subject-1"],
        "facebook.com": ["facebook-subject-1"],
      },
    },
  });

  assert.deepEqual(providers, [
    { provider: "PASSWORD", subject: "member@example.com" },
    { provider: "GOOGLE", subject: "google-subject-1" },
    { provider: "FACEBOOK", subject: "facebook-subject-1" },
  ]);
});

test("trustedProviderIdentities falls back to the current provider", () => {
  const providers = trustedProviderIdentities({
    uid: "firebase-user-2",
    email: "member@example.com",
    email_verified: false,
    firebase: { sign_in_provider: "password", identities: {} },
  });

  assert.deepEqual(providers, [
    { provider: "PASSWORD", subject: "member@example.com" },
  ]);
});
