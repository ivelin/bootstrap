/**
 * Hosted identity: public OS stays open; gated tools 401 without a pirin.ai token.
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
import {
  HOSTED_MCP_RESOURCE,
  isJwtAccessToken,
  PIRIN_AUTHORIZATION_SERVER,
  PIRIN_AUTHORIZATION_SERVER_METADATA,
  PREVIEW_AUTHORIZATION_SERVER_METADATA,
  PREVIEW_HOSTED_MCP_RESOURCE,
  PREVIEW_PIRIN_AUTHORIZATION_SERVER,
  PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL,
  WWW_AUTHENTICATE_CHALLENGE,
  authorizationServerMetadataDocument,
  authorizationServerUrl,
  hostedMcpResource,
  protectedResourceMetadataDocument,
  requiresPreviewHandshakeAuth,
  wwwAuthenticateChallenge,
  wwwAuthenticateChallengeFor,
} from "../dist/oauth.js";

const IVELIN_TOKEN = "bos_ivelin_fixture_token_ok";
const OTHER_TOKEN = "bos_other_token_fixture_xx";

afterEach(() => {
  setIdentityStoreForTests(undefined);
  delete process.env.BOOTSTRAP_OAUTH_RESOURCE_METADATA;
  delete process.env.VERCEL_ENV;
});

async function rawRpc(method, params, id = 1, token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return handleHostedReadFetch(
    new Request("https://preview.example/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
}

async function rpc(method, params, id = 1, token) {
  const res = await rawRpc(method, params, id, token);
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

async function assertGatedUnauthorized(res) {
  assert.equal(res.status, 401);
  const challenge = res.headers.get("WWW-Authenticate") ?? "";
  assert.equal(challenge, WWW_AUTHENTICATE_CHALLENGE);
  assert.equal(
    challenge,
    `Bearer realm="bootstrap-os-mcp", resource_metadata="https://pirin.ai/.well-known/oauth-protected-resource", resource="${HOSTED_MCP_RESOURCE}", scope="bootstrap-os"`,
  );
  const body = JSON.parse(await res.text());
  assert.equal(body.error, "invalid_token");
  assert.equal(body.resource, HOSTED_MCP_RESOURCE);
  assert.ok(body.identityStore === "memory" || body.identityStore === "supabase" || body.identityStore === "unset");
  return body;
}

describe("hosted identity (resource server, gated)", () => {
  it("parses Bearer tokens and recognizes JWTs", () => {
    assert.equal(parseBearerToken("Bearer bos_abc1234567890xyz"), "bos_abc1234567890xyz");
    assert.equal(parseBearerToken("bearer bos_abc1234567890xyz"), "bos_abc1234567890xyz");
    assert.equal(parseBearerToken("Token nope"), undefined);
    assert.equal(parseBearerToken("Bearer short"), undefined);
    assert.equal(hashMcpToken("bos_a").length, 64);
    assert.notEqual(hashMcpToken("bos_a"), hashMcpToken("bos_b"));
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhQGIifQ.sig";
    assert.equal(isJwtAccessToken(jwt), true);
    assert.equal(isJwtAccessToken("bos_not_a_jwt_token_xx"), false);
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
    assert.match(String(info.modes?.identity?.challenge ?? info.modes?.hostedReadPreview), /401|WWW-Authenticate|pirin\.ai/);
    assert.equal(info.modes?.identity?.identityStore, "memory");
  });

  it("gated tools without a token return 401 + WWW-Authenticate to pirin.ai", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    await assertGatedUnauthorized(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 4),
    );
    await assertGatedUnauthorized(
      await rawRpc("tools/call", { name: "bootstrap_list_company_labels", arguments: {} }, 5),
    );
  });

  it("logged-in Ivelin fixture whoami sees pirin, zk0, totbox only", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const who = parseTool(
      await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 6, IVELIN_TOKEN),
    );
    assert.equal(who.authenticated, true);
    assert.equal(who.email, IVELIN_SEED_EMAIL);
    assert.deepEqual(who.labels, ["pirin", "totbox", "zk0"]);
    assert.deepEqual(who.labels, [...IVELIN_SEED_LABELS]);
    const blob = JSON.stringify(who);
    assert.doesNotMatch(blob, /journeyPhase|instanceRoot|secret-other|company-state\.json/);
    assert.match(blob, /Labels only/);

    const labels = parseTool(
      await rpc("tools/call", { name: "bootstrap_list_company_labels", arguments: {} }, 7, IVELIN_TOKEN),
    );
    assert.deepEqual(labels.labels, [...IVELIN_SEED_LABELS]);
    assert.match(String(labels.note), /Labels only/i);
  });

  it("other mentee token cannot see Ivelin labels", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const who = parseTool(
      await rpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 8, OTHER_TOKEN),
    );
    assert.equal(who.authenticated, true);
    assert.equal(who.email, "other@example.test");
    assert.deepEqual(who.labels, ["secret-other"]);
    assert.ok(!who.labels.includes("pirin"));
    assert.ok(!who.labels.includes("zk0"));
    assert.ok(!who.labels.includes("totbox"));
  });

  it("invalid token does not leak labels and still challenges to pirin.ai", async () => {
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    await assertGatedUnauthorized(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 9, "bos_not_a_real_token_xx"),
    );
    await assertGatedUnauthorized(
      await rawRpc(
        "tools/call",
        { name: "bootstrap_list_company_labels", arguments: {} },
        10,
        "bos_not_a_real_token_xx",
      ),
    );
  });

  it("BOOTSTRAP_OAUTH_RESOURCE_METADATA overrides the challenge (preview #143)", async () => {
    process.env.BOOTSTRAP_OAUTH_RESOURCE_METADATA = PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL;
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const res = await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, 11);
    assert.equal(res.status, 401);
    assert.equal(
      res.headers.get("WWW-Authenticate"),
      wwwAuthenticateChallengeFor(PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL, HOSTED_MCP_RESOURCE),
    );
    assert.match(
      res.headers.get("WWW-Authenticate") ?? "",
      /v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132\.vercel\.app\/\.well-known\/oauth-protected-resource/,
    );
    const body = JSON.parse(await res.text());
    assert.equal(body.identityStore, "memory");
  });

  it("VERCEL_ENV=preview uses the #143 well-known and the preview resource, never the prod pin", async () => {
    process.env.VERCEL_ENV = "preview";
    const previewReq = new Request(`${PREVIEW_HOSTED_MCP_RESOURCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: { name: "bootstrap_whoami", arguments: {} },
      }),
    });
    assert.equal(hostedMcpResource(previewReq), PREVIEW_HOSTED_MCP_RESOURCE);
    assert.notEqual(hostedMcpResource(previewReq), HOSTED_MCP_RESOURCE);
    const challenge = wwwAuthenticateChallenge(previewReq);
    assert.equal(
      challenge,
      wwwAuthenticateChallengeFor(PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL, PREVIEW_HOSTED_MCP_RESOURCE),
    );
    assert.match(challenge, /resource="https:\/\/bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132\.vercel\.app\/mcp"/);
    assert.doesNotMatch(challenge, /resource="https:\/\/bootstrap-os-mcp\.vercel\.app\/mcp"/);
    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const res = await handleHostedReadFetch(previewReq);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("WWW-Authenticate"), challenge);
    const body = JSON.parse(await res.text());
    assert.equal(body.resource, PREVIEW_HOSTED_MCP_RESOURCE);
    const meta = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource"),
    );
    assert.equal(meta.status, 200);
    const doc = JSON.parse(await meta.text());
    assert.equal(doc.resource, PREVIEW_HOSTED_MCP_RESOURCE);
    assert.deepEqual(doc.authorization_servers, [PREVIEW_PIRIN_AUTHORIZATION_SERVER]);
    assert.equal(
      doc.authorization_servers[0],
      "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login",
    );
    const metaMcp = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource/mcp"),
    );
    assert.deepEqual(JSON.parse(await metaMcp.text()).authorization_servers, [
      PREVIEW_PIRIN_AUTHORIZATION_SERVER,
    ]);
    assert.equal(authorizationServerUrl(previewReq), PREVIEW_PIRIN_AUTHORIZATION_SERVER);
    const asMeta = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-authorization-server"),
    );
    assert.equal(asMeta.status, 200);
    const asDoc = JSON.parse(await asMeta.text());
    assert.deepEqual(asDoc, { ...PREVIEW_AUTHORIZATION_SERVER_METADATA });
    assert.equal(
      asDoc.issuer,
      "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login",
    );
    assert.equal(
      asDoc.authorization_endpoint,
      "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login",
    );
    assert.equal(
      asDoc.token_endpoint,
      "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/oauth/token",
    );
    assert.equal(
      asDoc.registration_endpoint,
      "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/oauth/register",
    );
    assert.doesNotMatch(JSON.stringify(asDoc), /bootstrap-os-mcp/);
    const asMetaMcp = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-authorization-server/mcp"),
    );
    assert.deepEqual(JSON.parse(await asMetaMcp.text()), { ...PREVIEW_AUTHORIZATION_SERVER_METADATA });
    const tokenOnMcp = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/oauth/token"),
    );
    assert.equal(tokenOnMcp.status, 404);
    process.env.VERCEL_ENV = "production";
    assert.equal(wwwAuthenticateChallenge(), WWW_AUTHENTICATE_CHALLENGE);
    assert.equal(hostedMcpResource(), HOSTED_MCP_RESOURCE);
    assert.equal(authorizationServerUrl(), PIRIN_AUTHORIZATION_SERVER);
    const prodDoc = protectedResourceMetadataDocument(
      new Request("https://bootstrap-os-mcp.vercel.app/.well-known/oauth-protected-resource"),
    );
    assert.equal(prodDoc.resource, HOSTED_MCP_RESOURCE);
    assert.deepEqual(prodDoc.authorization_servers, ["https://pirin.ai/bootstrap-os/login"]);
    assert.deepEqual(
      authorizationServerMetadataDocument(
        new Request("https://bootstrap-os-mcp.vercel.app/.well-known/oauth-authorization-server"),
      ),
      PIRIN_AUTHORIZATION_SERVER_METADATA,
    );
  });

  it("Hold preview cookie-less initialize / GET SSE / tools/list 401; prod pin initialize stays 200", async () => {
    process.env.VERCEL_ENV = "preview";
    const previewChallenge = wwwAuthenticateChallengeFor(
      PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL,
      PREVIEW_HOSTED_MCP_RESOURCE,
    );
    const previewInit = new Request(PREVIEW_HOSTED_MCP_RESOURCE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 20,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "preview-handshake", version: "0.0.0" },
        },
      }),
    });
    assert.equal(requiresPreviewHandshakeAuth(previewInit), true);
    const initRes = await handleHostedReadFetch(previewInit);
    assert.equal(initRes.status, 401);
    assert.equal(initRes.headers.get("WWW-Authenticate"), previewChallenge);
    assert.equal(JSON.parse(await initRes.text()).resource, PREVIEW_HOSTED_MCP_RESOURCE);

    const sse = await handleHostedReadFetch(
      new Request(PREVIEW_HOSTED_MCP_RESOURCE, {
        method: "GET",
        headers: { Accept: "text/event-stream" },
      }),
    );
    assert.equal(sse.status, 401);
    assert.equal(sse.headers.get("WWW-Authenticate"), previewChallenge);
    assert.doesNotMatch(sse.headers.get("content-type") ?? "", /text\/event-stream/i);

    const listed = await handleHostedReadFetch(
      new Request(PREVIEW_HOSTED_MCP_RESOURCE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 21, method: "tools/list", params: {} }),
      }),
    );
    assert.equal(listed.status, 401);
    assert.equal(listed.headers.get("WWW-Authenticate"), previewChallenge);

    const wk = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource"),
    );
    assert.equal(wk.status, 200);
    const asWk = await handleHostedReadFetch(
      new Request("https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-authorization-server"),
    );
    assert.equal(asWk.status, 200);

    setIdentityStoreForTests(ivelinMemoryFixture(IVELIN_TOKEN));
    const authedInit = await handleHostedReadFetch(
      new Request(PREVIEW_HOSTED_MCP_RESOURCE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${IVELIN_TOKEN}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 22,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "preview-handshake", version: "0.0.0" },
          },
        }),
      }),
    );
    assert.equal(authedInit.status, 200);

    process.env.VERCEL_ENV = "production";
    const prodInit = new Request("https://bootstrap-os-mcp.vercel.app/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 23,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "prod-pin", version: "0.0.0" },
        },
      }),
    });
    assert.equal(requiresPreviewHandshakeAuth(prodInit), false);
    const prodRes = await handleHostedReadFetch(prodInit);
    assert.equal(prodRes.status, 200);
  });

  it("CORS allows Authorization and exposes WWW-Authenticate", async () => {
    const res = await handleHostedReadFetch(
      new Request("https://preview.example/mcp", { method: "OPTIONS" }),
    );
    assert.equal(res.status, 204);
    assert.match(res.headers.get("Access-Control-Allow-Headers") ?? "", /Authorization/i);
    assert.match(res.headers.get("Access-Control-Expose-Headers") ?? "", /WWW-Authenticate/i);
  });
});
