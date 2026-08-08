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
      "templates/company/state/company-state.json",
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
      assert.equal(docs.length, 4);
      const body = readOsDoc("ai-instructions");
      assert.match(body, /Hard rules/i);
      assert.ok(body.length > 200);
    } finally {
      clearSession();
      rmrf(dataRoot);
    }
  });
});
