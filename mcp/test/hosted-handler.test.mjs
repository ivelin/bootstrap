import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleHostedReadFetch } from "../dist/hosted-handler.js";
import { HOSTED_GATED_TOOL_NAMES, HOSTED_READ_TOOL_NAMES } from "../dist/constants.js";

async function rpc(method, params, id = 1) {
  const res = await handleHostedReadFetch(
    new Request("https://preview.example/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  const text = await res.text();
  assert.ok(res.ok, `RPC ${method} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

describe("Vercel fetch handler (hosted-read)", () => {
  it("GET /health returns ok without a local clone", async () => {
    delete process.env.BOOTSTRAP_OS_ROOT;
    process.env.BOOTSTRAP_OS_DOCS_SOURCE = "published";
    const res = await handleHostedReadFetch(new Request("https://preview.example/health"));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "ok");
  });

  it("initialize + tools/list is hosted-read only", async () => {
    const init = await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "hosted-handler-test", version: "0.0.0" },
    });
    assert.equal(init.result.serverInfo.name, "bootstrap-os");

    await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      }),
    );

    const listed = await rpc("tools/list", {}, 2);
    const names = listed.result.tools.map((t) => t.name).sort();
    for (const n of HOSTED_READ_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
    for (const n of HOSTED_GATED_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing gated ${n}`);
    }
    assert.ok(!names.includes("bootstrap_init_company"));
    assert.ok(!names.includes("bootstrap_update_state"));
    assert.ok(!names.includes("bootstrap_get_state"));
  });
});
