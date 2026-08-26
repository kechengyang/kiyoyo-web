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

const { resolveFirebaseAuthDomain } = await importTypeScriptModule(
  "../app/auth/domain.ts",
);

const firebaseSource = readFileSync(
  new URL("../app/auth/firebase.ts", import.meta.url),
  "utf8",
);

test("Firebase initialization delegates custom-domain selection", () => {
  assert.match(firebaseSource, /NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN/);
  assert.match(firebaseSource, /resolveFirebaseAuthDomain/);
  assert.match(firebaseSource, /window\.location\.hostname/);
});

test("the custom auth domain is selected only on the connected domain", () => {
  const input = {
    configuredAuthDomain: "kiyoyo.firebaseapp.com",
    customAuthDomain: "kiyoyo.africa",
  };

  assert.equal(
    resolveFirebaseAuthDomain({
      ...input,
      browserHostname: "kiyoyo.africa",
    }),
    "kiyoyo.africa",
  );
  assert.equal(
    resolveFirebaseAuthDomain({
      ...input,
      browserHostname: "www.kiyoyo.africa",
    }),
    "kiyoyo.africa",
  );
});

test("the Firebase domain remains active before DNS cutover and on localhost", () => {
  const input = {
    configuredAuthDomain: "kiyoyo.firebaseapp.com",
    customAuthDomain: "kiyoyo.africa",
  };

  assert.equal(
    resolveFirebaseAuthDomain({
      ...input,
      browserHostname: "kiyoyo-dev.web.app",
    }),
    "kiyoyo.firebaseapp.com",
  );
  assert.equal(
    resolveFirebaseAuthDomain({ ...input, browserHostname: "localhost" }),
    "kiyoyo.firebaseapp.com",
  );
});
