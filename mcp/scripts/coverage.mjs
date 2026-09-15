#!/usr/bin/env node
/**
 * Line coverage gate for mcp/dist (compiled src). Threshold 80%.
 * Uses the same test file list as npm run test:unit.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const files = String(pkg.scripts["test:unit"] || "")
  .replace(/^node --test\s+/, "")
  .split(/\s+/)
  .filter(Boolean);
if (files.length === 0) {
  console.error("coverage: no test files in package.json test:unit");
  process.exit(1);
}

const args = [
  "--test",
  "--experimental-test-coverage",
  "--test-coverage-include=dist/**",
  "--test-coverage-exclude=**/*.d.ts",
  "--test-coverage-lines=80",
  ...files,
];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
