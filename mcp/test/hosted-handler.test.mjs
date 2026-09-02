import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { handleHostedReadFetch } from "../dist/hosted-handler.js";
import {
  HOSTED_GATED_JOURNEY_TOOL_NAMES,
  HOSTED_READ_TOOL_NAMES,
} from "../dist/constants.js";
import { fixtureJourneyStore, setJourneyStoreForTests } from "../dist/journey.js";
import { syntheticAccessToken } from "../dist/journey-auth.js";

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
    for (const n of HOSTED_GATED_JOURNEY_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing gated ${n} on this branch`);
    }
    assert.ok(!names.includes("bootstrap_init_company"));
    assert.ok(!names.includes("bootstrap_update_state"));
  });

  afterEach(() => {
    setJourneyStoreForTests(undefined);
  });

  it("public OS tools skip login; journey tools force 401 + WWW-Authenticate", async () => {
    const publicCall = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "bootstrap_os_info", arguments: {} },
        }),
      }),
    );
    assert.equal(publicCall.status, 200);

    const gated = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "get_journey", arguments: { q: "CoreHaul" } },
        }),
      }),
    );
    assert.equal(gated.status, 401);
    const challenge = gated.headers.get("www-authenticate");
    assert.match(challenge ?? "", /Bearer realm="bootstrap-os-mcp"/);
    assert.match(challenge ?? "", /resource_metadata=/);
    assert.match(challenge ?? "", /scope="bootstrap-os"/);
    const body = JSON.parse(await gated.text());
    assert.equal(body.error, "invalid_token");
    assert.match(body.error_description, /Public OS tools stay open/);
    assert.equal(body.identityStore, "unset");

    const subscribe = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 41,
          method: "tools/call",
          params: {
            name: "subscribe_board",
            arguments: {
              company: "corehaul",
              principal: "advisor-cos@example.test",
              principalKind: "email",
              webhookUrl: "https://hooks.example.test/core",
            },
          },
        }),
      }),
    );
    assert.equal(subscribe.status, 401);
  });

  it("random connector JWT is 401 on get_journey and notify tools; allowlisted founder can get_journey", async () => {
    setJourneyStoreForTests(fixtureJourneyStore());
    const stranger = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${syntheticAccessToken({ email: "stranger@example.test", extra: { fast: true } })}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: { name: "get_journey", arguments: { q: "CoreHaul" } },
        }),
      }),
    );
    assert.equal(stranger.status, 401);

    for (const [id, name, args] of [
      [
        51,
        "subscribe_board",
        {
          company: "corehaul",
          principal: "advisor-cos@example.test",
          principalKind: "email",
          webhookUrl: "https://hooks.example.test/core",
        },
      ],
      [
        52,
        "unsubscribe_board",
        {
          company: "corehaul",
          principal: "advisor-cos@example.test",
          principalKind: "email",
        },
      ],
      [53, "list_subscribers", { company: "corehaul" }],
    ]) {
      const notify = await handleHostedReadFetch(
        new Request("https://preview.example/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            Authorization: `Bearer ${syntheticAccessToken({ email: "stranger@example.test", extra: { fast: true } })}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        }),
      );
      assert.equal(notify.status, 401, name);
    }

    const founderTok = syntheticAccessToken({ email: "founder-core@example.test" });
    const founder = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${founderTok}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: { name: "get_journey", arguments: { q: "CoreHaul" } },
        }),
      }),
    );
    assert.equal(founder.status, 200);
    const payload = JSON.parse(await founder.text());
    const text = payload.result.content.map((c) => c.text ?? "").join("\n");
    const parsed = JSON.parse(text);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.company.slug, "corehaul");
    assert.equal(parsed.ideas.length, 1);
    assert.match(parsed.ideas[0].visualFlow, /mermaid/);
    assert.match(parsed.ideas[0].snapshot, /two-minute read/);
    assert.equal(parsed.ideas[0].constraintThisWeek, "");
    assert.match(
      parsed.ideas[0].snapshot,
      /Constraint this week \(honest biggest bottleneck; where help is required\)/,
    );
    assert.match(parsed.ideas[0].snapshot, /weakest link/);
    assert.match(parsed.ideas[0].snapshot, /slowest soldier/);
  });
});
