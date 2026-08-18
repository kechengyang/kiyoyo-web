import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = readFileSync(sourceUrl, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}

const ownership = await importTypeScriptModule(
  "../app/auth/favoriteOwnership.ts",
);
const authState = await importTypeScriptModule("../app/auth/state.ts");
const toolkitErrors = await importTypeScriptModule(
  "../app/auth/identityToolkitErrors.ts",
);
const providerMapping = await importTypeScriptModule(
  "../app/auth/providers.ts",
);

test("only explicitly guest-owned favourites are uploaded", () => {
  assert.deepEqual(
    ownership.planFavoriteSync({
      owner: "guest",
      memberId: "member-b",
      localIds: ["drink-1"],
    }),
    {
      targetOwner: "member:member-b",
      resetLocal: false,
      uploadIds: ["drink-1"],
    },
  );
  assert.deepEqual(
    ownership.planFavoriteSync({
      owner: null,
      memberId: "member-b",
      localIds: ["legacy-unknown"],
    }),
    {
      targetOwner: "member:member-b",
      resetLocal: true,
      uploadIds: [],
    },
  );
});

test("switching members resets local favourites without uploading them", () => {
  assert.deepEqual(
    ownership.planFavoriteSync({
      owner: "member:member-a",
      memberId: "member-b",
      localIds: ["member-a-private"],
    }),
    {
      targetOwner: "member:member-b",
      resetLocal: true,
      uploadIds: [],
    },
  );
  assert.deepEqual(
    ownership.planFavoriteSync({
      owner: "member:member-b",
      memberId: "member-b",
      localIds: ["member-b-cached"],
    }),
    {
      targetOwner: "member:member-b",
      resetLocal: false,
      uploadIds: [],
    },
  );
});

test("the sync target claims guest favourites before any network request", () => {
  const plan = ownership.planFavoriteSync({
    owner: "guest",
    memberId: "member-a",
    localIds: ["guest-favourite"],
  });
  assert.equal(plan.targetOwner, "member:member-a");
  assert.equal(ownership.shouldClearFavoritesOnSignOut(plan.targetOwner), true);
});

test("member data is cleared only after a confirmed Firebase sign-out", () => {
  assert.equal(authState.shouldClearMemberData("signedOut"), true);
  assert.equal(authState.shouldClearMemberData("bootstrapError"), false);
  assert.equal(authState.shouldClearMemberData("loading"), false);
  assert.equal(authState.shouldClearMemberData("authenticated"), false);
  assert.equal(
    ownership.shouldClearFavoritesOnSignOut("member:member-a"),
    true,
  );
  assert.equal(ownership.shouldClearFavoritesOnSignOut("guest"), false);
});

test("Identity Toolkit failures retain their business meaning", () => {
  assert.equal(
    toolkitErrors.identityToolkitFirebaseCode(
      "WEAK_PASSWORD : Password should be at least 10 characters",
    ),
    "auth/weak-password",
  );
  assert.equal(
    toolkitErrors.identityToolkitFirebaseCode("EMAIL_EXISTS"),
    "auth/email-already-in-use",
  );
  assert.equal(
    toolkitErrors.identityToolkitFirebaseCode(
      "CREDENTIAL_TOO_OLD_LOGIN_AGAIN",
    ),
    "auth/requires-recent-login",
  );
  assert.equal(
    toolkitErrors.identityToolkitFirebaseCode("UNEXPECTED_BACKEND_CODE"),
    "auth/internal-error",
  );
});

test("provider display never infers password from a social email", () => {
  assert.deepEqual(
    providerMapping.providersFromProviderData([
      { providerId: "google.com", email: "member@example.com" },
      { providerId: "google.com", email: "member@example.com" },
    ]),
    ["google"],
  );
  assert.deepEqual(
    providerMapping.providersFromProviderData([
      { providerId: "password", email: "member@example.com" },
    ]),
    ["password"],
  );
});
