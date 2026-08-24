/**
 * Visitor matrix for surfaces this package claims a mentee agent will see.
 * File + listing only. Live HTTP is mcp/test/preview-live.mjs.
 * Not a Cursor GUI test. Not mentee-ready hosted boards.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./helpers.mjs";

const PLUGIN = path.join(REPO_ROOT, "plugin");
const COVERAGE = path.join(PLUGIN, "COVERAGE.md");
const README = path.join(PLUGIN, "README.md");
const MARKET = path.join(REPO_ROOT, ".cursor-plugin", "marketplace.json");
const HOSTED = "https://bootstrap-os-mcp.vercel.app/mcp";

const VISITORS = [
  {
    id: "cold-mentee-cos-0-1",
    skill: "query-os-first",
    must: [
      "0-1",
      "spoken yes",
      "Do not speak as Ivelin",
      "Do not host mentee",
      "Path 1 stays the front door",
      "https://github.com/ivelin/bootstrap",
    ],
  },
  {
    id: "specialist-promote",
    skill: "house-rule-pins",
    must: [
      "house-rule-marketing-volume-cannot-promote",
      "house-rule-a-security-program-cannot-promote",
      "https://github.com/ivelin/bootstrap",
    ],
  },
  {
    id: "day0-founder",
    skill: "path-1-default",
    must: ["https://github.com/ivelin/bootstrap", "Path 1", "front door"],
  },
  {
    id: "first-hour",
    skill: "first-hour",
    must: ["https://github.com/ivelin/bootstrap", "first-hour.md"],
  },
];

describe("mentee-agent visitor matrix (claimed surfaces)", () => {
  it("names locked vs not-locked coverage and stays on the one connector", () => {
    const body = fs.readFileSync(COVERAGE, "utf8");
    assert.match(body, /## Locked/);
    assert.match(body, /## Not locked/);
    assert.match(body, /## Visitor matrix/);
    assert.match(body, /GET \/health/);
    assert.match(body, /Rollback/);
    assert.match(body, /Import from Repo/);
    assert.ok(body.includes(HOSTED));
    assert.match(body, /No Gmail\/Stripe\/other/);
    assert.match(body, /not claimed as mentee-visible/);
    const mcpRaw = fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8");
    assert.doesNotMatch(mcpRaw, /mcp\.pirin\.ai/);
    assert.doesNotMatch(mcpRaw, /gmail/i);
    assert.doesNotMatch(mcpRaw, /stripe/i);
  });

  it("walks each mentee skill visitor", () => {
    for (const visitor of VISITORS) {
      const file = path.join(PLUGIN, "skills", visitor.skill, "SKILL.md");
      assert.ok(fs.existsSync(file), `${visitor.id}: missing ${visitor.skill}`);
      const body = fs.readFileSync(file, "utf8");
      assert.ok(body.length < 1600, `${visitor.id}: skill copied the OS`);
      for (const needle of visitor.must) {
        assert.ok(body.includes(needle), `${visitor.id}: missing ${needle}`);
      }
    }
  });

  it("install-reader visitor sees a/b/c and no public catalog submit", () => {
    const body = fs.readFileSync(README, "utf8");
    assert.match(body, /Import from Repo/);
    assert.ok(body.includes("https://github.com/ivelin/bootstrap"));
    assert.ok(body.includes(HOSTED));
    assert.match(body, /~\/\.cursor\/plugins\/local\/bootstrap-os/);
    assert.match(body, /\/add-plugin/);
    assert.match(body, /[Ww]e have not submitted/);
    assert.match(body, /query-os-first/);
    assert.doesNotMatch(body, /gmail/i);
    assert.doesNotMatch(body, /stripe/i);
  });

  it("team-listing visitor sees one plugin at plugin/", () => {
    const market = JSON.parse(fs.readFileSync(MARKET, "utf8"));
    assert.equal(market.plugins.length, 1);
    assert.equal(market.plugins[0].name, "bootstrap-os");
    assert.equal(market.plugins[0].source, "plugin");
    const mcp = JSON.parse(fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8"));
    assert.deepEqual(Object.keys(mcp.mcpServers), ["bootstrap-os"]);
    assert.equal(mcp.mcpServers["bootstrap-os"].url, HOSTED);
  });
});
