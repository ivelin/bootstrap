/**
 * Smell test + eval: the portable template must not contain instance
 * company names, theses, scores, decision traces, or local paths.
 * Contribution rule: AGENTS.md #13, README template-change-policy,
 * OS stability contract item 6, ROADMAP M11, mcp/QA.md #9.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IVELIN_SEED_EMAIL, IVELIN_SEED_LABELS } from "../dist/identity.js";
import { REPO_ROOT } from "./helpers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "artifacts",
  "coverage",
]);
const SKIP_FILES = new Set([
  path.join(HERE, "no-instance-secrets.test.mjs"),
  path.join(REPO_ROOT, "tests", "test_day0.sh"),
]);

function forbiddenNeedles() {
  return [
    "z" + "k0",
    "tot" + "box",
    "tot" + "boxapp",
    "tok" + "box",
    "Fed" + "Prox",
    "Smol" + "VLA",
    "hvac" + "_cleaning",
    "3 paid " + "deposits",
    "cocoon" + "hive",
    "/home/ivelin/" + "pirin-ai",
    "/home/ivelin/" + "tot" + "boxapp",
    "ivelin@" + "z" + "k0" + ".bot",
    "hold_" + "z" + "k0",
  ];
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!name.isFile()) continue;
    if (SKIP_FILES.has(full)) continue;
    if (name.name.endsWith(".lock") || name.name === "package-lock.json") continue;
    out.push(full);
  }
  return out;
}

function hitsIn(text, needles) {
  const lower = text.toLowerCase();
  return needles.filter((n) => lower.includes(n.toLowerCase()));
}

describe("no instance secrets in the portable template", () => {
  it("records the contribution rule in AGENTS.md, README, OS, ROADMAP, QA, plugin coverage", () => {
    const agents = fs.readFileSync(path.join(REPO_ROOT, "AGENTS.md"), "utf8");
    const readme = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");
    const os = fs.readFileSync(path.join(REPO_ROOT, "company-os/operating-system.md"), "utf8");
    const roadmap = fs.readFileSync(path.join(REPO_ROOT, "ROADMAP.md"), "utf8");
    const qa = fs.readFileSync(path.join(REPO_ROOT, "mcp/QA.md"), "utf8");
    const coverage = fs.readFileSync(path.join(REPO_ROOT, "plugin/COVERAGE.md"), "utf8");
    assert.match(agents, /No instance secrets in this template \(hard\)/);
    assert.match(agents, /fictional labels `alpha` \/ `bravo` \/ `charlie`/);
    assert.match(readme, /Instance secrets in the template/);
    assert.match(readme, /no-instance-secrets\.test\.mjs/);
    assert.match(os, /No instance secrets in the portable template/);
    assert.match(roadmap, /\*\*No instance secrets in the template/);
    assert.match(qa, /No instance secrets in the template/);
    assert.match(qa, /no-instance-secrets\.test\.mjs/);
    assert.match(coverage, /no-instance-secrets smell/);
  });

  it("identity seed is fictional founder@example.test + alpha/bravo/charlie", () => {
    assert.equal(IVELIN_SEED_EMAIL, "founder@example.test");
    assert.deepEqual([...IVELIN_SEED_LABELS], ["alpha", "bravo", "charlie"]);
    const sql = fs.readFileSync(
      path.join(REPO_ROOT, "mcp/supabase/migrations/20260829_bootstrap_mcp_identity.sql"),
      "utf8",
    );
    assert.match(sql, /founder@example\.test/);
    assert.match(sql, /VALUES \('alpha'\), \('bravo'\), \('charlie'\)/);
    assert.doesNotMatch(sql, /VALUES \('pirin'\)/);
  });

  it("import fixture boards are fictional alpha/bravo/charlie only", () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "mcp/docs/hosted-board-import.json"), "utf8"),
    );
    assert.deepEqual(
      fixture.companies.map((c) => c.slug).sort(),
      ["alpha", "bravo", "charlie"],
    );
    assert.equal(fixture.who, "founder@example.test");
    const blob = JSON.stringify(fixture);
    assert.doesNotMatch(blob, /\/home\/ivelin\//);
    const sql = fs.readFileSync(
      path.join(REPO_ROOT, "mcp/supabase/migrations/20260916_bootstrap_os_import_local_boards.sql"),
      "utf8",
    );
    assert.match(sql, /Never apply this DO block to production/);
    assert.match(sql, /founder@example\.test/);
  });

  it("CI wires this smell test into test:unit", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "mcp/package.json"), "utf8"));
    assert.match(pkg.scripts["test:unit"], /no-instance-secrets\.test\.mjs/);
  });

  it("walks the template and fails on instance names / confidential phrases", () => {
    const needles = forbiddenNeedles();
    const files = walk(REPO_ROOT);
    const leaks = [];
    for (const file of files) {
      let text;
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (text.includes("\u0000")) continue;
      const found = hitsIn(text, needles);
      if (found.length) leaks.push({ file: path.relative(REPO_ROOT, file), found });
    }
    assert.equal(
      leaks.length,
      0,
      leaks.map((l) => `${l.file}: ${l.found.join(", ")}`).join("\n"),
    );
  });
});
