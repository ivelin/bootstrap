/**
 * Merge-gate visitor matrix (CoS smell-test).
 * Seven cases the package must support. File locks only.
 * Live HTTP is mcp/test/preview-live.mjs. Not a Cursor GUI test.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  emptyContextMayInventStage,
  spokenYesIsGtm,
  spokenYesMayPromote,
  handfulSurveyMaySetOptimalPrice,
  ltvModelMayPromoteAtZeroToOne,
  emptyContextMayInventPriceOrLtv,
} from "../dist/house-rules.js";
import { REPO_ROOT } from "./helpers.mjs";

const PLUGIN = path.join(REPO_ROOT, "plugin");
const COVERAGE = path.join(PLUGIN, "COVERAGE.md");
const README = path.join(PLUGIN, "README.md");
const MARKET = path.join(REPO_ROOT, ".cursor-plugin", "marketplace.json");
const HOSTED = "https://bootstrap-os-mcp.vercel.app/mcp";

function skill(name) {
  return fs.readFileSync(path.join(PLUGIN, "skills", name, "SKILL.md"), "utf8");
}

describe("merge-gate visitor matrix (CoS smell-test)", () => {
  it("names the seven cases and stays on the one connector", () => {
    const coverage = fs.readFileSync(COVERAGE, "utf8");
    const readme = fs.readFileSync(README, "utf8");
    for (const body of [coverage, readme]) {
      assert.match(body, /Installing founder/);
      assert.match(body, /0-1/);
      assert.match(body, /GTM/);
      assert.match(body, /Install-first|install-first/);
      assert.match(body, /do not invent their stage/);
      assert.match(body, /Spoken yes|spoken yes/);
    }
    assert.match(coverage, /emptyContextMayInventStage/);
    assert.match(coverage, /spokenYesMayPromote/);
    const mcpRaw = fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8");
    assert.doesNotMatch(mcpRaw, /mcp\.pirin\.ai/);
    assert.doesNotMatch(mcpRaw, /gmail/i);
    assert.doesNotMatch(mcpRaw, /stripe/i);
  });

  it("H1 + A1 install-first: plugin + connector only", () => {
    const first = skill("first-hour");
    assert.ok(first.length < 1600);
    assert.match(first, /install-first|Install-first/i);
    assert.ok(first.includes(HOSTED));
    assert.match(first, /No auth/);
    assert.match(first, /No database/);
    assert.match(first, /No other connectors/);
    assert.match(first, /https:\/\/github.com\/ivelin\/bootstrap/);
    const readme = fs.readFileSync(README, "utf8");
    assert.ok(readme.includes(HOSTED));
    assert.match(readme, /Import from Repo/);
    assert.match(readme, /plugin \+ MCP connector/);
    assert.match(readme, /## Feedback/);
    assert.match(readme, /escalation to Ivelin/i);
    assert.match(readme, /not a public suggestion box/);
    assert.match(readme, /ivelin@pirin\.ai/);
    assert.match(readme, /public GitHub issue on ivelin\/bootstrap/);
    assert.match(readme, /Either path is fine/);
    assert.match(readme, /No mentee names/);
    assert.match(readme, /no secret sauce/);
    assert.match(readme, /Cos brings it to him/);
    assert.match(readme, /Feedback does not auto-change house rules/);
    assert.doesNotMatch(readme, /GitHub issue is not the escalate path/);
    assert.equal((readme.match(/ivelin@pirin\.ai/g) || []).length, 1);
  });

  it("H2 + A2 query-OS-first on a 0-1 placement ask", () => {
    const standing = skill("query-os-first");
    assert.ok(standing.length < 1600);
    assert.match(standing, /0-1/);
    assert.match(standing, /the-9-phases-simple-view/);
    assert.match(standing, /Call this plugin first/);
    assert.match(standing, /Do not speak as Ivelin/);
    assert.match(standing, /plugin\/README\.md#feedback/);
    assert.match(standing, /Escalation to Ivelin/);
    assert.match(standing, /no PII/);
    assert.doesNotMatch(standing, /ivelin@pirin\.ai/);
    const fm = standing.match(/^description:\s*(.+)$/m);
    assert.ok(fm, "query-os-first needs a description trigger");
    assert.match(fm[1], /0-1/);
  });

  it("H3 + A4 spoken-yes / conversation is not GTM — refuse and cite OS", () => {
    const standing = skill("query-os-first");
    const pins = skill("house-rule-pins");
    for (const body of [standing, pins]) {
      assert.match(body, /GTM/);
      assert.match(body, /spoken yes/i);
      assert.match(body, /how-to-do-honest-research/);
    }
    assert.match(standing, /verbal maybe/);
    assert.match(standing, /is not GTM/);
    assert.match(pins, /Refuse/);
    assert.equal(spokenYesMayPromote(), false);
    assert.equal(spokenYesIsGtm(), false);
  });

  it("A3 empty-context must not invent their stage", () => {
    const standing = skill("query-os-first");
    assert.match(standing, /Empty context/);
    assert.match(standing, /no founder update/);
    assert.match(standing, /do not invent their stage/);
    assert.match(standing, /unknown \/ none yet/);
    assert.match(standing, /first-hour.md/);
    assert.equal(emptyContextMayInventStage(), false);
  });

  it("price / handful WTP / LTV at 0-1 — refuse and cite OS; empty context invents no price", () => {
    const standing = skill("query-os-first");
    const pins = skill("house-rule-pins");
    for (const body of [standing, pins]) {
      assert.match(body, /optimal price/i);
      assert.match(body, /house-rule-there-is-no-optimal-price-until-people-have-paid-and-stayed/);
    }
    assert.match(standing, /handful WTP/i);
    assert.match(standing, /LTV/);
    assert.match(standing, /old SaaS playbook/);
    assert.match(pins, /old SaaS playbook/);
    assert.match(standing, /do not invent their stage, a price, or an LTV number/);
    assert.match(pins, /Refuse/);
    assert.equal(handfulSurveyMaySetOptimalPrice(), false);
    assert.equal(ltvModelMayPromoteAtZeroToOne(), false);
    assert.equal(emptyContextMayInventPriceOrLtv(), false);
  });

  it("Day 0 lifestyle or fences is a Path 1 pin, not a house-rule essay", () => {
    const first = skill("first-hour");
    const path1 = skill("path-1-default");
    for (const body of [first, path1]) {
      assert.match(body, /lifestyle or swinging for the fences/i);
      assert.match(body, /day-0-lifestyle-or-swinging-for-the-fences/);
      assert.match(body, /not a house rule/);
      assert.doesNotMatch(body, /Watch three numbers/);
      assert.doesNotMatch(body, /day 31/);
      assert.doesNotMatch(body, /popcorn stand/);
    }
  });

  it("install-reader and team listing still lock the pin", () => {
    const body = fs.readFileSync(README, "utf8");
    assert.match(body, /~\/\.cursor\/plugins\/local\/bootstrap-os/);
    assert.match(body, /\/add-plugin/);
    assert.match(body, /[Ww]e have not submitted/);
    const market = JSON.parse(fs.readFileSync(MARKET, "utf8"));
    assert.equal(market.plugins.length, 1);
    assert.equal(market.plugins[0].source, "plugin");
    const mcp = JSON.parse(fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8"));
    assert.deepEqual(Object.keys(mcp.mcpServers), ["bootstrap-os"]);
    assert.equal(mcp.mcpServers["bootstrap-os"].url, HOSTED);
  });
});
