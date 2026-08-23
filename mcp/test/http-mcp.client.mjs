/**
 * HTTP hosted-read gate: Streamable HTTP serves OS info / docs without a local clone.
 * Write / init / use-company stay off this surface.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { HOSTED_READ_TOOL_NAMES } from "../dist/constants.js";
import { startHostedReadServer } from "../dist/http.js";

const WRITE_TOOLS = [
  "bootstrap_init_company",
  "bootstrap_use_company",
  "bootstrap_list_companies",
  "bootstrap_get_state",
  "bootstrap_update_state",
  "bootstrap_where_are_we",
  "bootstrap_log_decision",
];

const FIXTURE_DOCS = {
  "company-os/operating-system.md":
    "# Fixture OS\nHouse rule pins live on GitHub. Version 2.8.7.\n",
  "company-os/live-runtime.md": "# Fixture live runtime\n",
  "company-os/ready-for-human-eyes.md": "# Fixture human eyes\n",
  "company-os/ai-instructions.md": "# Fixture AI instructions\nHard rules live in the published OS.\n",
  "company-os/first-hour.md": "# Fixture first hour\nDay 0 only.\n",
};

function parseToolText(result) {
  assert.ok(result?.content?.length, "tool result missing content");
  const text = result.content.map((c) => ("text" in c ? c.text : "")).join("\n");
  if (result.isError) {
    const err = new Error(text);
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return parseToolText(result);
}

function startFixtureDocs() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const rel = url.pathname.replace(/^\//, "");
      const body = FIXTURE_DOCS[rel];
      if (!body) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("fixture bind failed"));
        return;
      }
      resolve({
        base: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
    server.once("error", reject);
  });
}

async function main() {
  const emptyRoot = path.join(os.tmpdir(), `bootstrap-http-empty-${process.pid}`);
  delete process.env.BOOTSTRAP_OS_ROOT;
  delete process.env.BOOTSTRAP_INSTANCE_ROOT;
  delete process.env.BOOTSTRAP_DATA_ROOT;
  delete process.env.BOOTSTRAP_STATE_PATH;
  delete process.env.BOOTSTRAP_TRACES_DIR;
  process.env.BOOTSTRAP_OS_ROOT = emptyRoot;
  process.env.BOOTSTRAP_OS_DOCS_SOURCE = "published";

  const fixture = await startFixtureDocs();
  process.env.BOOTSTRAP_OS_DOCS_BASE = fixture.base;

  const hosted = await startHostedReadServer({ host: "127.0.0.1", port: 0 });
  const transport = new StreamableHTTPClientTransport(new URL(hosted.url));
  const client = new Client({ name: "bootstrap-os-http-smoke", version: "0.0.0" });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    for (const n of HOSTED_READ_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing hosted-read tool ${n}`);
    }
    for (const n of WRITE_TOOLS) {
      assert.ok(!names.includes(n), `hosted-read must not expose ${n}`);
    }

    const info = await call(client, "bootstrap_os_info");
    assert.equal(info.surface, "hosted-read");
    assert.equal(info.docsSource, "published");
    assert.match(String(info.docsBase), /127\.0\.0\.1/);
    assert.match(JSON.stringify(info.adoptionOrder), /No public mentee-ready host/);
    assert.match(JSON.stringify(info.companyState), /Not hosted/i);
    assert.equal(info.marketplace, false);
    assert.ok(!info.paths?.statePath, "hosted-read must not expose founder state paths");

    const listed = await call(client, "bootstrap_list_docs");
    assert.ok(Array.isArray(listed));
    assert.equal(listed.length, 5);
    assert.equal(listed[0].source, "published");

    const osDoc = await call(client, "bootstrap_get_doc", { doc: "operating-system" });
    assert.match(String(osDoc), /Fixture OS/);
    assert.doesNotMatch(String(osDoc), /Text eight people/);

    const pins = await call(client, "bootstrap_house_rule_pins");
    const pinBlob = JSON.stringify(pins);
    assert.match(pinBlob, /github.com\/ivelin\/bootstrap/);
    assert.match(pinBlob, /house-rule-marketing-volume-cannot-promote/);
    assert.match(pinBlob, /house-rule-a-security-program-cannot-promote/);

    console.log(
      JSON.stringify(
        {
          ok: true,
          gate: "hosted-read-http",
          url: hosted.url,
          tools: names,
          docsBase: fixture.base,
          osRootWas: emptyRoot,
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
    await hosted.close();
    await fixture.close();
  }
}

main().catch((e) => {
  console.error("HTTP MCP client smoke FAILED");
  console.error(e);
  process.exitCode = 1;
});
