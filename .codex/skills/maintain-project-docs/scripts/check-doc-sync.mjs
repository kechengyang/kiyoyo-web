#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const base = valueAfter("--base", "origin/main");
const requireSync = args.includes("--require-sync");

const git = (...gitArgs) => execFileSync("git", gitArgs, { encoding: "utf8" }).trim();
const root = git("rev-parse", "--show-toplevel");

const trackedDocs = [
  "README.md",
  "web/README.md",
  "infra/terraform/README.md",
  ...git("ls-files", "--cached", "--others", "--exclude-standard", "--", "docs/*.md", "docs/**/*.md")
    .split("\n")
    .filter(Boolean),
];

const failures = [];
const chinese = /[\u3400-\u9fff]/u;
const englishWord = /\b[A-Za-z]{3,}\b/u;
const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

for (const relative of [...new Set(trackedDocs)].sort()) {
  const absolute = resolve(root, relative);
  if (!existsSync(absolute)) {
    failures.push(`${relative}: maintained document is missing`);
    continue;
  }
  const content = readFileSync(absolute, "utf8");
  if (!chinese.test(content) || !englishWord.test(content)) {
    failures.push(`${relative}: must contain both Chinese and English`);
  }
  for (const line of content.split("\n")) {
    if (/^#{1,6} /.test(line) && (!chinese.test(line) || !englishWord.test(line))) {
      failures.push(`${relative}: heading is not bilingual: ${line}`);
    }
  }
  for (const match of content.matchAll(markdownLink)) {
    const target = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:|\/)/.test(target)) continue;
    const resolved = resolve(dirname(absolute), decodeURIComponent(target));
    if (!existsSync(resolved)) failures.push(`${relative}: broken local link ${target}`);
    else if (statSync(resolved).isDirectory()) failures.push(`${relative}: local link points to a directory ${target}`);
  }
}

const changed = new Set();
const collect = (output) => output.split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));
try { collect(git("diff", "--name-only", `${base}...HEAD`)); } catch { failures.push(`cannot compare HEAD with base ${base}`); }
collect(git("diff", "--name-only"));
collect(git("diff", "--name-only", "--cached"));
for (const line of git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean)) changed.add(line);

const runtimeChange = [...changed].some((path) =>
  (/^(api|web|infra\/terraform|scripts|\.github\/workflows)\//.test(path) || path === "firebase.json") &&
  !/(^|\/)README\.md$/.test(path),
);
const docsChange = [...changed].some((path) =>
  path === "README.md" || path.startsWith("docs/") || /(^|\/)README\.md$/.test(path),
);

if (requireSync && runtimeChange && !docsChange) {
  failures.push("runtime/infrastructure files changed but no maintained documentation changed");
}

if (failures.length) {
  console.error("Documentation validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Documentation validation passed for ${trackedDocs.length} maintained files.`);
console.log(`Changed files: ${changed.size}; runtime change: ${runtimeChange}; documentation change: ${docsChange}.`);
