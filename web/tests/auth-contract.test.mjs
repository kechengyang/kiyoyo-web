import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = (relativePath) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("customer authentication stays behind its domain hook", () => {
  const app = source("../app/components/KiyoyoApp.tsx");
  const account = source(
    "../app/components/customer/account/AccountView.tsx",
  );
  const transport = source("../app/platform.ts");

  assert.match(app, /useCustomerAuth\(lang\)/);
  assert.doesNotMatch(app, /from ["']firebase\/auth["']/);
  assert.doesNotMatch(account, /from ["']firebase/);
  assert.doesNotMatch(transport, /signInWith|createUserWith|sendPasswordReset/);
});

test("all three providers and safe recovery actions are implemented", () => {
  const service = source("../app/auth/service.ts");
  const authTypes = source("../app/auth/types.ts");
  const actionPage = source("../app/auth/action/page.tsx");

  assert.match(authTypes, /"password" \| "google" \| "facebook"/);
  assert.match(service, /createUserWithEmailAndPassword/);
  assert.match(service, /GoogleAuthProvider/);
  assert.match(service, /FacebookAuthProvider/);
  assert.match(service, /sendPasswordResetEmail/);
  assert.match(service, /sendEmailVerification/);
  assert.match(actionPage, /applyEmailVerification/);
  assert.match(actionPage, /applyPasswordReset/);
});

test("checkout verification and local-state preservation remain explicit", () => {
  const app = source("../app/components/KiyoyoApp.tsx");
  const hook = source("../app/auth/useCustomerAuth.ts");

  assert.match(app, /if \(!session\.emailVerified\)/);
  assert.match(app, /setVerificationGate\(true\)/);
  assert.match(app, /saveMemberFavorite/);
  assert.match(app, /fetchMemberFavorites/);
  assert.doesNotMatch(app, /setCart\(\[\]\).*setSession/s);
  assert.match(hook, /removeItem\("kiyoyo-session"\)/);
  assert.match(hook, /setPhase\("bootstrapError"\)/);
  assert.match(app, /shouldClearMemberData\(customerAuth\.phase\)/);
  assert.doesNotMatch(serviceSource(), /pendingLinkCredential/);
});

function serviceSource() {
  return source("../app/auth/service.ts");
}

test("verification errors remain visible and handled", () => {
  const gate = source(
    "../app/components/customer/auth/VerificationGate.tsx",
  );
  assert.match(gate, /role="alert"/);
  assert.match(gate, /verificationNotComplete/);
  assert.match(gate, /\.catch\(\(\) => undefined\)/);
});
