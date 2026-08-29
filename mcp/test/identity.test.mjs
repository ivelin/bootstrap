/**
 * Hosted identity: public OS stays open; gated whoami + labels need a bearer token.
 * File + in-memory store. Does not claim a human logged in on the live pin.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleHostedReadFetch } from "../dist/hosted-handler.js";
import {
  HOSTED_GATED_TOOL_NAMES,
  HOSTED_READ_TOOL_NAMES,
} from "../dist/constants.js";
import {
  hashMcpToken,
  ivelinMemoryFixture,
  IVELIN_SEED_EMAIL,
  IVELIN_SEED_LABELS,
  parseBearerToken,
  setIdentityStoreForTests,
} from "../dist/identity.js";

const IVELIN_TOKEN = "bos_ivelin_fixture_token_ok";
const OTHER_TOKEN = "bos_other_token_fixture_xx";

afterEach(() => {
  setIdentityStoreForTests(undefined);
});

async function rpc(method, params, id = 1, token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await handleHostedReadFetch(
    new Request("https://preview.example/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  const text = await res.text();
  assert.ok(res.ok, `RPC ${method} failed ${res.status}: ${text}`);
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

describe("hosted identity (optional, gated)", () => {
  it("parses Bearer tokens and hashes them", () => {
    assert.equal(parseBearerToken("Bearer bos_abc1234567890xyz"), "bos_abc1234567890xyz");
    assert.equal(parseBearerToken("bearer bos_abc1234567890xyz"), "bos_abc1234567890xyz");
    assert.equal(parseBearerToken("Token nope"), undefined);
    assert.equal(parseBearerToken("Bearer short"), undefined);
    assert.equal(hashMcpToken("bos_a").length, 64);
    assert.notEqual(hashMcpToken("bos_a"), hashMcpToken("bos_b"));
  });

  it("anonymous still gets published OS tools and no login wall", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const res = await handleHostedReadFetch(new Request("https://preview.example/health"));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "ok");

    const listed = await rpc("tools/list", {}, 2);
    const names = listed.result.tools.map((t) => t.name);
    for (const n of HOSTED_READ_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing public ${n}`);
    }
    for (const n of HOSTED_GATED_TOOL_NAMES) {
      assert.ok(names.includes(n), `missing gated ${n}`);
    }
    assert.ok(!names.includes("bootstrap_init_company"));
    assert.ok(!names.includes("bootstrap_get_state"));

    const info = parseTool(await rpc("tools/call", { name: "bootstrap_os_info", arguments: {} }, 3));
    assert.equal(info.surface, "hosted-read");
    assert.match(String(info.companyState), /Not hosted/i);
    assert.ok(!info.paths?.statePath);

    const who = parseTool(await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 4));
    assert.equal(who.authenticated, false);
    assert.deepEqual(who.labels, []);
    assert.equal(who.email, null);
  });

  it("logged-in Ivelin fixture whoami sees pirin, zk0, totbox only", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const who = parseTool(
      await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 5, IVELIN_TOKEN),
    );
    assert.equal(who.authenticated, true);
    assert.equal(who.email, IVELIN_SEED_EMAIL);
    assert.deepEqual(who.labels, ["pirin", "totbox", "zk0"]);
    assert.deepEqual(who.labels, [...IVELIN_SEED_LABELS]);
    const blob = JSON.stringify(who);
    assert.doesNotMatch(blob, /journeyPhase|instanceRoot|secret-other|company-state\.json/);
    assert.match(blob, /Labels only/);

    const labels = parseTool(
      await rpc("tools/call", { name: "bootstrap_list_company_labels", arguments: {} }, 6, IVELIN_TOKEN),
    );
    assert.deepEqual(labels.labels, [...IVELIN_SEED_LABELS]);
    assert.match(String(labels.note), /Labels only/i);
  });

  it("other mentee token cannot see Ivelin labels", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const who = parseTool(
      await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 7, OTHER_TOKEN),
    );
    assert.equal(who.authenticated, true);
    assert.equal(who.email, "other@example.test");
    assert.deepEqual(who.labels, ["secret-other"]);
    assert.ok(!who.labels.includes("pirin"));
    assert.ok(!who.labels.includes("zk0"));
    assert.ok(!who.labels.includes("totbox"));
  });

  it("invalid token does not leak labels", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const who = parseTool(
      await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 8, "bos_not_a_real_token_xx"),
    );
    assert.equal(who.authenticated, false);
    assert.deepEqual(who.labels, []);
    const labels = await rpc(
      "tools/call",
      { name: "bootstrap_list_company_labels", arguments: {} },
      9,
      "bos_not_a_real_token_xx",
    );
    assert.equal(labels.result.isError, true);
  });

  it("CORS allows Authorization so a client can send a bearer token", async () => {
    const res = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", { method: "OPTIONS" }),
    );
    assert.equal(res.status, 204);
    assert.match(res.headers.get("Access-Control-Allow-Headers") ?? "", /Authorization/i);
  });
});
