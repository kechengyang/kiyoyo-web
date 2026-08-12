import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyChangedComponents,
  serializeGitHubOutputs,
} from "./changed-components.mjs";

test("classifies each deployable component independently", () => {
  assert.deepEqual(classifyChangedComponents(["web/app/page.tsx"]), {
    web: true,
    api: false,
    infrastructure: false,
  });
  assert.deepEqual(classifyChangedComponents(["api/src/server.ts"]), {
    web: false,
    api: true,
    infrastructure: false,
  });
  assert.deepEqual(classifyChangedComponents(["infra/terraform/cloud_run.tf"]), {
    web: false,
    api: false,
    infrastructure: true,
  });
});

test("classifies mixed changes without deploying documentation-only commits", () => {
  assert.deepEqual(
    classifyChangedComponents([
      "./web/package-lock.json",
      "api/migrations/004_staff_roles.sql",
      "docs/05-gcp-deployment.md",
    ]),
    { web: true, api: true, infrastructure: false },
  );
  assert.deepEqual(
    classifyChangedComponents(["README.md", "docs/07-testing-operations.md"]),
    { web: false, api: false, infrastructure: false },
  );
});

test("firebase configuration deploys only the web application", () => {
  assert.deepEqual(classifyChangedComponents(["firebase.json"]), {
    web: true,
    api: false,
    infrastructure: false,
  });
});

test("serializes stable GitHub job outputs", () => {
  assert.equal(
    serializeGitHubOutputs({ web: true, api: false, infrastructure: true }),
    "web=true\napi=false\ninfrastructure=true",
  );
});
