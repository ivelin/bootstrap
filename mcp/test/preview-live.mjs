/**
 * Optional maintainer check of the production pin. Not PR CI.
 * Cloud agents on PRs must not run this (it live-probes prod).
 * Hits the production pin on main. PR git preview is a separate public URL.
 *
 * Override pin with BOOTSTRAP_MCP_ORIGIN (default https://bootstrap-os-mcp.vercel.app).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { HOSTED_READ_TOOL_NAMES } from "../dist/constants.js";
import { REPO_ROOT } from "./helpers.mjs";

const ORIGIN = (process.env.BOOTSTRAP_MCP_ORIGIN ?? "https://bootstrap-os-mcp.vercel.app").replace(
  /\/+$/,
  "",
);
const WRITE_TOOLS = [
  "bootstrap_init_company",
  "bootstrap_use_company",
  "bootstrap_list_companies",
  "bootstrap_get_state",
  "bootstrap_update_state",
  "bootstrap_where_are_we",
  "bootstrap_log_decision",
];

async function fetchRetry(url, init = {}, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, { redirect: "manual", ...init });
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

async function rpc(method, params, id) {
  const res = await fetchRetry(`${ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  assert.equal(res.status, 200, `RPC ${method} ${res.status}: ${text}`);
  return JSON.parse(text);
}

function parseTool(result) {
  const text = result.result.content.map((c) => c.text ?? "").join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const root = await fetchRetry(`${ORIGIN}/`);
  assert.equal(root.status, 200, `GET / ${root.status}`);
  const rootText = await root.text();
  assert.match(rootText, /Not mentee-ready boards/);
  assert.match(rootText, /POST \/mcp/);
  assert.match(rootText, /GET \/health/);
  assert.doesNotMatch(rootText, /<html/i);
  assert.doesNotMatch(rootText, /sign in/i);
  assert.doesNotMatch(rootText, /company-state/i);

  const health = await fetchRetry(`${ORIGIN}/health`);
  assert.equal(health.status, 200, `GET /health ${health.status}`);
  assert.equal((await health.text()).trim(), "ok");

  const init = await rpc(
    "initialize",
    {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "bootstrap-os-preview-live", version: "0.0.0" },
    },
    1,
  );
  assert.equal(init.result.serverInfo.name, "bootstrap-os");

  const listed = await rpc("tools/list", {}, 2);
  const names = listed.result.tools.map((t) => t.name).sort();
  for (const n of HOSTED_READ_TOOL_NAMES) {
    assert.ok(names.includes(n), `missing live tool ${n}`);
  }
  for (const n of WRITE_TOOLS) {
    assert.ok(!names.includes(n), `live pin must not expose ${n}`);
  }

  const infoRaw = await rpc("tools/call", { name: "bootstrap_os_info", arguments: {} }, 3);
  const info = parseTool(infoRaw);
  assert.equal(info.surface, "hosted-read");
  assert.equal(info.marketplace, false);
  assert.match(String(info.companyState), /Not hosted/i);
  assert.match(JSON.stringify(info.adoptionOrder), /not mentee-ready boards/);
  assert.match(JSON.stringify(info.adoptionOrder), /Not pirin\.ai/);
  assert.ok(!info.paths?.statePath, "live pin must not expose founder state paths");

  const pinsRaw = await rpc("tools/call", { name: "bootstrap_house_rule_pins", arguments: {} }, 4);
  const pins = JSON.stringify(parseTool(pinsRaw));
  assert.match(pins, /github.com\/ivelin\/bootstrap/);
  assert.match(pins, /house-rule-marketing-volume-cannot-promote/);

  const skillsDir = path.join(REPO_ROOT, "plugin", "skills");
  const urls = new Set();
  for (const name of fs.readdirSync(skillsDir)) {
    const file = path.join(skillsDir, name, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, "utf8");
    for (const m of body.matchAll(/https:\/\/github.com\/ivelin\/bootstrap[^\s)]+/g)) {
      urls.add(m[0]);
    }
  }
  assert.ok(urls.size >= 4, `expected OS links in skills, got ${urls.size}`);
  for (const url of urls) {
    const res = await fetchRetry(url, {
      redirect: "follow",
      headers: { "User-Agent": "bootstrap-os-preview-live" },
    });
    if (res.status === 200) continue;
    const rel = url.match(/github\.com\/ivelin\/bootstrap\/blob\/main\/([^#]+)/)?.[1];
    const local = rel ? path.join(REPO_ROOT, decodeURIComponent(rel)) : "";
    assert.ok(
      local && fs.existsSync(local),
      `skill link ${url} → ${res.status} and missing locally`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        gate: "preview-live-public-pin",
        origin: ORIGIN,
        tools: names,
        menteeVisible: true,
        gitPreviewSso: "not-claimed-as-mentee-surface",
        note: "Production pluginPreview version may lag this draft until merge + Vercel production.",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("preview-live FAILED");
  console.error(e);
  process.exitCode = 1;
});
