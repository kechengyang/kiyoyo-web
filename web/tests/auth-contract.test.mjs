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

test("all providers and safe recovery actions are implemented", () => {
  const service = source("../app/auth/service.ts");
  const authTypes = source("../app/auth/types.ts");
  const actionPage = source("../app/auth/action/page.tsx");

  assert.match(authTypes, /"password" \| "google"/);
  assert.match(service, /createUserWithEmailAndPassword/);
  assert.match(service, /GoogleAuthProvider/);
  assert.doesNotMatch(service, /FacebookAuthProvider/);
  assert.match(service, /sendPasswordResetEmail/);
  assert.doesNotMatch(service, /sendEmailVerification/);
  assert.match(service, /linkWithPhoneNumber/);
  assert.match(service, /RecaptchaVerifier/);
  assert.match(actionPage, /applyEmailVerification/);
  assert.match(actionPage, /applyPasswordReset/);
});

test("checkout requires verified phone and preserves local state", () => {
  const app = source("../app/components/KiyoyoApp.tsx");
  const account = source(
    "../app/components/customer/account/AccountView.tsx",
  );
  const hook = source("../app/auth/useCustomerAuth.ts");

  assert.doesNotMatch(app, /if \(!session\.emailVerified\)/);
  assert.match(app, /if \(!session\.phoneVerified\)/);
  assert.doesNotMatch(app, /setVerificationGate\(true\)/);
  assert.doesNotMatch(account, /session\.emailVerified/);
  assert.doesNotMatch(account, /verifyEmail|resendVerification/);
  assert.doesNotMatch(hook, /sendMemberVerification/);
  assert.match(app, /saveMemberFavorite/);
  assert.match(app, /fetchMemberFavorites/);
  assert.doesNotMatch(app, /setCart\(\[\]\).*setSession/s);
  assert.match(hook, /removeItem\("kiyoyo-session"\)/);
  assert.match(hook, /setPhase\("bootstrapError"\)/);
  assert.match(app, /shouldClearMemberData\(customerAuth\.phase\)/);
  assert.doesNotMatch(serviceSource(), /pendingLinkCredential/);
});

test("verified phone membership is enforced across UI and infrastructure", () => {
  const gate = source(
    "../app/components/customer/auth/PhoneVerificationGate.tsx",
  );
  const terraform = source("../../infra/terraform/firebase.tf");

  assert.match(gate, /autoComplete="one-time-code"/);
  assert.match(gate, /normalizeKenyanMobile/);
  assert.match(gate, /role="alert"/);
  assert.match(terraform, /phone_number\s*{\s*enabled = true/s);
  assert.match(terraform, /allowed_regions = \["KE"\]/);
});

function serviceSource() {
  return source("../app/auth/service.ts");
}
