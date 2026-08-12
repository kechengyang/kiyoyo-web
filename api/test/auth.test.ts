import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import Fastify from "fastify";

process.env.DB_PASSWORD ??= "auth-contract-db-password";
process.env.PICKUP_SIGNING_KEY ??= "auth-contract-pickup-signing-key";

const { trustedProviderIdentities, verifiedEmailError } = await import(
  "../src/modules/auth/middleware.js"
);
const { registerAuthRoutes } = await import("../src/modules/auth/routes.js");
const { bootstrapUser } = await import("../src/modules/auth/service.js");

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
    { provider: "GOOGLE", subject: "google-subject-1" },
    { provider: "FACEBOOK", subject: "facebook-subject-1" },
  ]);
});

test("trustedProviderIdentities does not infer password from email claims", () => {
  const providers = trustedProviderIdentities({
    uid: "firebase-user-2",
    email: "member@example.com",
    email_verified: false,
    firebase: { sign_in_provider: "password", identities: {} },
  });

  assert.deepEqual(providers, []);
});

test("verified email gate returns the stable checkout error", () => {
  assert.deepEqual(verifiedEmailError(undefined), {
    code: "EMAIL_VERIFICATION_REQUIRED",
    message: "Verify your email before checking out",
  });
  assert.equal(
    verifiedEmailError({
      authId: "firebase-user-3",
      email: "member@example.com",
      emailVerified: true,
      providers: [],
      userId: "member-3",
      status: "ACTIVE",
      isAdmin: false,
    }),
    null,
  );
});

test("bootstrap service only persists trusted actor identity", async () => {
  let persisted: Record<string, unknown> | undefined;
  const actor = {
    authId: "trusted-firebase-uid",
    email: "trusted@example.com",
    emailVerified: true,
    providers: [{ provider: "GOOGLE" as const, subject: "google-subject" }],
    userId: null,
    status: null,
    isAdmin: false,
  };
  await bootstrapUser(
    actor,
    { nickname: "Member", locale: "en" },
    async (input) => {
      persisted = input;
      return { id: "member-1" };
    },
  );
  assert.deepEqual(persisted, {
    authId: actor.authId,
    email: actor.email,
    nickname: "Member",
    locale: "en",
    emailVerified: true,
    providers: actor.providers,
  });
});

test("bootstrap route validates input and returns compatible auth metadata", async () => {
  const app = Fastify();
  const actor = {
    authId: "firebase-route-user",
    email: "route@example.com",
    emailVerified: true,
    providers: [{ provider: "GOOGLE" as const, subject: "google-route-user" }],
    userId: null,
    status: null,
    isAdmin: false,
  };
  registerAuthRoutes(app, {
    authenticate: async (request) => {
      request.actor = actor;
    },
    bootstrapUser: async (_trustedActor, input) => ({
      id: "member-route",
      status: "ACTIVE",
      locale: input.locale,
    }),
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/bootstrap",
    payload: { locale: "zh", email: "attacker@example.com" },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    data: { id: "member-route", status: "ACTIVE", locale: "zh" },
    auth: {
      uid: actor.authId,
      emailVerified: true,
      providers: ["GOOGLE"],
    },
    permissions: { admin: false },
  });
  await app.close();
});

test("identity repository never transfers an active identity between users", async () => {
  const repository = await readFile(
    resolve(process.cwd(), "src/modules/auth/repository.ts"),
    "utf8",
  );
  assert.doesNotMatch(repository, /set user_id=excluded\.user_id/);
  assert.match(
    repository,
    /where user_identities\.user_id=excluded\.user_id/,
  );
  assert.match(repository, /IDENTITY_ALREADY_LINKED_TO_ANOTHER_USER/);
});

test("customer auth migration is forward-only and enforces active identities", async () => {
  const migration = await readFile(
    resolve(process.cwd(), "migrations/0004_customer_auth.sql"),
    "utf8",
  );
  assert.match(migration, /add column email_verified_at timestamptz/);
  assert.match(migration, /add column last_login_at timestamptz/);
  assert.match(migration, /create table user_identities/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /provider in \('PASSWORD','GOOGLE','FACEBOOK'\)/);
  assert.match(migration, /where unlinked_at is null/g);
  assert.doesNotMatch(migration, /\bdrop\b/i);
});
