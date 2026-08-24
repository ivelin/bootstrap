import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./helpers.mjs";

const PLUGIN = path.join(REPO_ROOT, "plugin");
const HOSTED_MCP_URL = "https://bootstrap-os-mcp.vercel.app/mcp";
const ESSAY_FORBIDDEN = [
  "Text eight people",
  "waitlist of 400",
  "does not mean get a crowd looking",
  "Dense leftover text is good",
  "### House rule:",
];

function skillFiles() {
  const skillsDir = path.join(PLUGIN, "skills");
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(skillsDir, d.name, "SKILL.md"));
}

describe("preview plugin (hyperlink only)", () => {
  it("has portable Agent Plugins manifests and a team Import from Repo listing", () => {
    const pluginJson = JSON.parse(fs.readFileSync(path.join(PLUGIN, "plugin.json"), "utf8"));
    assert.equal(pluginJson.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    assert.equal(pluginJson.name, "bootstrap-os");
    assert.equal(pluginJson.version, "0.1.1");

    const cursorPlugin = JSON.parse(
      fs.readFileSync(path.join(PLUGIN, ".cursor-plugin", "plugin.json"), "utf8"),
    );
    assert.equal(cursorPlugin.version, "0.1.1");
    assert.equal(
      cursorPlugin.variables.properties.BOOTSTRAP_MCP_URL.default,
      HOSTED_MCP_URL,
    );

    const mcpJson = JSON.parse(fs.readFileSync(path.join(PLUGIN, "mcp.json"), "utf8"));
    assert.equal(mcpJson.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    assert.deepEqual(Object.keys(mcpJson.mcpServers), ["bootstrap-os"]);
    const server = mcpJson.mcpServers["bootstrap-os"];
    assert.equal(server.type, "streamable-http");
    assert.equal(server.url, HOSTED_MCP_URL);
    assert.doesNotMatch(server.url, /pirin\.ai/);
    assert.ok(!("command" in server));
    const mcpRaw = JSON.stringify(mcpJson);
    assert.doesNotMatch(mcpRaw, /mcp\.pirin\.ai/);
    assert.doesNotMatch(mcpRaw, /\bnpx\b/);
    assert.doesNotMatch(mcpRaw, /gmail/i);
    assert.doesNotMatch(mcpRaw, /stripe/i);

    assert.ok(fs.existsSync(path.join(PLUGIN, ".cursor-plugin", "plugin.json")));
    assert.ok(!fs.existsSync(path.join(PLUGIN, "marketplace.json")));
    const market = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, ".cursor-plugin", "marketplace.json"), "utf8"),
    );
    assert.equal(market.name, "bootstrap-os");
    assert.equal(market.plugins.length, 1);
    assert.equal(market.plugins[0].name, "bootstrap-os");
    assert.equal(market.plugins[0].source, "plugin");
    assert.ok(!fs.existsSync(path.join(PLUGIN, "operating-system.md")));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, "mcp", "vercel.json")));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, "mcp", "api", "mcp.ts")));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, "mcp", "api", "health.ts")));
  });

  it("skills exist, stay thin, and only hyperlink the published OS", () => {
    const files = skillFiles();
    assert.ok(files.length >= 4, `expected thin skills, got ${files.length}`);
    const required = ["path-1-default", "house-rule-pins", "first-hour", "query-os-first"];
    for (const name of required) {
      assert.ok(
        files.some((f) => f.endsWith(`${path.sep}${name}${path.sep}SKILL.md`)),
        `missing skill ${name}`,
      );
    }
    for (const file of files) {
      const body = fs.readFileSync(file, "utf8");
      assert.ok(body.length < 1600, `${file} is too long — link, do not copy the OS`);
      assert.match(body, /https:\/\/github.com\/ivelin\/bootstrap/);
      for (const phrase of ESSAY_FORBIDDEN) {
        assert.ok(!body.includes(phrase), `${file} must not copy OS essay: ${phrase}`);
      }
    }
    const pins = fs.readFileSync(path.join(PLUGIN, "skills", "house-rule-pins", "SKILL.md"), "utf8");
    assert.match(pins, /house-rule-marketing-volume-cannot-promote/);
    assert.match(pins, /house-rule-a-security-program-cannot-promote/);
    const standing = fs.readFileSync(
      path.join(PLUGIN, "skills", "query-os-first", "SKILL.md"),
      "utf8",
    );
    assert.match(standing, /0-1/);
    assert.match(standing, /spoken yes/);
    assert.match(standing, /do not invent their stage/);
    assert.match(standing, /is not GTM/);
    assert.match(standing, /Do not speak as Ivelin/);
    assert.match(standing, /Do not host mentee/);
    assert.match(standing, /Path 1 stays the front door/);
    assert.match(standing, /plugin\/README\.md#feedback/);
    assert.doesNotMatch(standing, /ivelin@pirin\.ai/);
    const firstHour = fs.readFileSync(path.join(PLUGIN, "skills", "first-hour", "SKILL.md"), "utf8");
    assert.match(firstHour, /Install-first|install-first/);
    assert.match(firstHour, /bootstrap-os-mcp\.vercel\.app\/mcp/);
  });
});
