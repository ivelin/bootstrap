import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, makeTempEnv, rmrf } from "./helpers.mjs";
import { clearSession } from "../dist/companies.js";
import { listOsDocs, readOsDoc } from "../dist/docs.js";

describe("markdown install path (zero MCP required)", () => {
  it("portable docs exist on disk without node mcp runtime", () => {
    const required = [
      "company-os/operating-system.md",
      "company-os/live-runtime.md",
      "company-os/ready-for-human-eyes.md",
      "company-os/ai-instructions.md",
      "company-os/first-hour.md",
      "templates/company/state/company-state.json",
      "templates/company/state/where-are-we.py",
      "templates/applied-here.md",
    ];
    for (const rel of required) {
      const full = path.join(REPO_ROOT, rel);
      assert.ok(fs.existsSync(full), `missing ${rel}`);
      assert.ok(fs.statSync(full).size > 50, `too small: ${rel}`);
    }
  });

  it("company-state template is valid JSON with required fields", () => {
    const raw = fs.readFileSync(
      path.join(REPO_ROOT, "templates/company/state/company-state.json"),
      "utf8",
    );
    const state = JSON.parse(raw);
    for (const key of [
      "companyId",
      "hypothesis",
      "journeyPhase",
      "loopStage",
      "readyForHumanEyes",
      "openQuestions",
      "scores",
    ]) {
      assert.ok(key in state, `missing field ${key}`);
    }
    assert.equal(state.readyForHumanEyes.status, "unknown");
  });

  it("MCP docs reader resolves blueprint from OS root", () => {
    const dataRoot = makeTempEnv();
    clearSession();
    try {
      const docs = listOsDocs();
      assert.equal(docs.length, 5);
      const body = readOsDoc("ai-instructions");
      assert.match(body, /Hard rules/i);
      assert.match(body, /stated, synthetic, and observed/i);
      assert.match(body, /Likert/);
      assert.match(body, /then map/);
      assert.ok(body.length > 200);
      const firstHour = readOsDoc("first-hour");
      assert.match(firstHour, /demographic one-liner/i);
      assert.match(firstHour, /demo-only role-play is the weak case/i);
      assert.match(firstHour, /Eyeballs aren't buyers/);
      assert.match(firstHour, /house-rule-marketing-volume-cannot-promote/);
      const os = readOsDoc("operating-system");
      assert.match(os, /2\.8\.6/);
      assert.match(os, /### House rule: marketing volume cannot promote/);
      assert.match(os, /Text eight people/);
      assert.match(os, /### Starter legal templates/);
      assert.match(os, /https:\/\/github.com\/General-Legal\/legal-templates/);
      assert.match(os, /https:\/\/general\.legal\/library/);
      assert.match(os, /### Cap-table modeler/);
      assert.match(os, /https:\/\/startup-finance\.1984\.vc\//);
      assert.match(os, /https:\/\/github.com\/1984vc\/cap-table/);
      assert.match(os, /https:\/\/www\.ycombinator\.com\/safe\/calculator/);
      assert.match(os, /npx skills add 1984vc\/cap-table/);
      assert.match(os, /npx @1984vc\/cap-table/);
      assert.match(os, /CLI\/skill only/);
      assert.doesNotMatch(os, /startup-finance\.1984\.vc\/mcp/);
      assert.doesNotMatch(os, /1984 MCP is live/i);
    } finally {
      clearSession();
      rmrf(dataRoot);
    }
  });
});
