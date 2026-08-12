import { appendFileSync } from "node:fs";

const COMPONENT_KEYS = ["web", "api", "infrastructure"];

export function classifyChangedComponents(paths) {
  const result = Object.fromEntries(
    COMPONENT_KEYS.map((component) => [component, false]),
  );

  for (const rawPath of paths) {
    const path = rawPath.trim().replace(/^\.\//, "");
    if (!path) continue;

    if (path === "firebase.json" || path.startsWith("web/")) {
      result.web = true;
    }
    if (path.startsWith("api/")) {
      result.api = true;
    }
    if (path.startsWith("infra/terraform/")) {
      result.infrastructure = true;
    }
  }

  return result;
}

export function serializeGitHubOutputs(components) {
  return COMPONENT_KEYS.map(
    (component) => `${component}=${components[component] ? "true" : "false"}`,
  ).join("\n");
}

async function main() {
  const paths = (await new Response(process.stdin).text()).split(/\r?\n/);
  const output = `${serializeGitHubOutputs(classifyChangedComponents(paths))}\n`;

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  } else {
    process.stdout.write(output);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
