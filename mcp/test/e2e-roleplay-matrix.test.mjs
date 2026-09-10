/**
 * CTO/PM E2E role-play matrix (PGlite + hosted handler).
 * Never supabase-pirin-ai. Never prod. No invite/accept tools invented here.
 *
 * Matrix + draft prod synthetic SRE (say once): mcp/docs/E2E_ROLEPLAY.md
 */
import { afterEach, before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { handleHostedReadFetch } from "../dist/hosted-handler.js";
import {
  HOSTED_GATED_TOOL_NAMES,
  HOSTED_READ_TOOL_NAMES,
} from "../dist/constants.js";
import {
  IVELIN_SEED_EMAIL,
  IVELIN_SEED_LABELS,
  setIdentityStoreForTests,
  whoamiFromLabelsRpc,
} from "../dist/identity.js";
import { actorClaimsFromAccessToken, syntheticAccessToken } from "../dist/journey-auth.js";
import { HOSTED_MCP_RESOURCE, WWW_AUTHENTICATE_CHALLENGE, isJwtAccessToken } from "../dist/oauth.js";
import { REPO_ROOT } from "./helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(__dirname, "pglite", "identity-schema.sql");
const E2E_DOC = path.join(REPO_ROOT, "mcp", "docs", "E2E_ROLEPLAY.md");
const HOSTED_DOC = path.join(REPO_ROOT, "mcp", "docs", "HOSTED_IDENTITY.md");

const IVELIN_UID = "33333333-3333-3333-3333-333333333333";
const A_UID = "11111111-1111-1111-1111-111111111111";
const B_UID = "22222222-2222-2222-2222-222222222222";
const STRANGER_UID = "99999999-9999-9999-9999-999999999999";
const CTO_UID = "55555555-5555-5555-5555-555555555555";

let db;
let rpcId = 80;

afterEach(() => {
  setIdentityStoreForTests(undefined);
  delete process.env.VERCEL_ENV;
});

function jwtExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

/** PGlite-backed store for role-play. Test-only. Never a prod adapter. */
function pgliteIdentityStore(database) {
  return {
    kind: "supabase",
    async whoami(token) {
      if (!token || token.length < 16) {
        return {
          authenticated: false,
          labels: [],
          reason: "missing_or_short_token",
          identityStore: "supabase",
        };
      }
      if (!isJwtAccessToken(token)) {
        return {
          authenticated: false,
          labels: [],
          reason: "not_a_pirin_access_token",
          identityStore: "supabase",
        };
      }
      const exp = jwtExp(token);
      if (typeof exp === "number" && exp * 1000 < Date.now()) {
        return {
          authenticated: false,
          labels: [],
          reason: "invalid_or_revoked_token",
          identityStore: "supabase",
        };
      }
      const claims = actorClaimsFromAccessToken(token);
      if (!claims) {
        return {
          authenticated: false,
          labels: [],
          reason: "not_a_pirin_access_token",
          identityStore: "supabase",
        };
      }
      const uid = claims.sub ?? "";
      const email = claims.email ?? "";
      await database.exec("RESET ROLE");
      await database.query("SELECT set_config('app.auth_uid', $1, false)", [uid]);
      await database.query("SELECT set_config('app.auth_email', $1, false)", [email]);
      try {
        const body = (await database.query("SELECT bootstrap_mcp_my_labels() AS body")).rows[0].body;
        return whoamiFromLabelsRpc(email || undefined, body, true);
      } catch {
        return {
          authenticated: false,
          labels: [],
          reason: "identity_lookup_failed",
          identityStore: "supabase",
        };
      }
    },
  };
}

async function rawRpc(method, params, token) {
  rpcId += 1;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return handleHostedReadFetch(
    new Request(HOSTED_MCP_RESOURCE, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: rpcId, method, params }),
    }),
  );
}

async function assertGated401(res, reason) {
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("WWW-Authenticate"), WWW_AUTHENTICATE_CHALLENGE);
  const body = JSON.parse(await res.text());
  assert.equal(body.error, "invalid_token");
  if (reason) assert.equal(body.reason, reason);
  assert.doesNotMatch(JSON.stringify(body), /alpha|bravo|pirin|totbox|zk0|secret-other/i);
  return body;
}

function parseTool(result) {
  const text = result.result.content.map((c) => c.text ?? "").join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function whoamiPass(token) {
  const res = await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, token);
  const text = await res.text();
  assert.equal(res.status, 200, text);
  return parseTool(JSON.parse(text));
}

describe("E2E role-play matrix (PGlite, never prod)", { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    await db.exec(fs.readFileSync(SCHEMA, "utf8"));
  });

  after(async () => {
    await db?.close();
  });

  it("docs say the matrix once and mark invite/mail pending", () => {
    const e2e = fs.readFileSync(E2E_DOC, "utf8");
    const hosted = fs.readFileSync(HOSTED_DOC, "utf8");
    assert.match(e2e, /E2E role-play matrix/);
    assert.match(e2e, /R1/);
    assert.match(e2e, /not_invited/);
    assert.match(e2e, /First-user|first-user/);
    assert.match(e2e, /zk0/);
    assert.match(e2e, /\*\*Pending\*\*.*invite/s);
    assert.match(e2e, /accept_invite/);
    assert.match(e2e, /Mail round-trip/);
    assert.match(e2e, /Do not invent/);
    assert.match(e2e, /Draft prod synthetic SRE/);
    assert.match(e2e, /GET \/health/);
    assert.match(e2e, /WWW-Authenticate/);
    assert.match(e2e, /Redeploy|previous production/);
    assert.match(e2e, /preview-live\.mjs/);
    assert.match(e2e, /not.*npm run ci/i);
    assert.match(e2e, /supabase-pirin-ai/);
    assert.match(e2e, /Never.*PR cloud agents|do \*\*not\*\* migrate/i);
    assert.match(e2e, /HOSTED_IDENTITY\.md#first-user-rebuild-from-github/);
    assert.doesNotMatch(e2e, /INSERT INTO public\.bootstrap_mcp_mentees/);
    assert.match(hosted, /E2E_ROLEPLAY\.md/);
    assert.match(hosted, /First user \(rebuild from GitHub\)/);
  });

  it("does not invent invite / accept_invite tools (P1–P3 pending)", () => {
    for (const name of [...HOSTED_READ_TOOL_NAMES, ...HOSTED_GATED_TOOL_NAMES]) {
      assert.doesNotMatch(name, /invite|accept_invite|mailer/i);
    }
    const server = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "server.ts"), "utf8");
    assert.doesNotMatch(server, /bootstrap_invite|bootstrap_accept_invite|accept_invite/);
    const pkg = fs.readFileSync(path.join(REPO_ROOT, "mcp", "package.json"), "utf8");
    assert.match(pkg, /e2e-roleplay-matrix\.test\.mjs/);
    assert.doesNotMatch(pkg, /preview-live\.mjs/);
  });

  it("R1 PM empty Bearer: handshake + whoami 401 missing_or_short_token", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    const handshake = await rawRpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "e2e-empty", version: "0.0.0" },
    });
    await assertGated401(handshake, "missing_or_short_token");
    await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }),
      "missing_or_short_token",
    );
  });

  it("R2 PM uninvited JWT: gated whoami 401 not_invited", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    const token = syntheticAccessToken({
      email: "stranger@example.test",
      sub: STRANGER_UID,
    });
    const gated = await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, token),
      "not_invited",
    );
    assert.match(gated.error_description ?? "", /not on the hosted MCP allowlist/i);
    await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_list_company_labels", arguments: {} }, token),
      "not_invited",
    );
  });

  it("R3 CTO first-user SQL insert → invited whoami PASS (zk0)", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    await db.exec("RESET ROLE");
    await db.query(
      "INSERT INTO bootstrap_mcp_mentees (id, email, auth_user_id) VALUES ($1, lower($2), NULL)",
      ["mentee-cto-insert", "CTO-First@example.test"],
    );
    await db.query(
      "INSERT INTO bootstrap_company_labels (id, mentee_id, label) VALUES ($1, $2, $3)",
      ["lcto", "mentee-cto-insert", "zk0"],
    );
    const token = syntheticAccessToken({
      email: "CTO-First@example.test",
      sub: CTO_UID,
    });
    const who = await whoamiPass(token);
    assert.equal(who.authenticated, true);
    assert.equal(who.email, "cto-first@example.test");
    assert.deepEqual(who.labels, ["zk0"]);
    assert.match(String(who.note), /Labels only/);
    const bound = (
      await db.query("SELECT auth_user_id, email FROM bootstrap_mcp_mentees WHERE id = 'mentee-cto-insert'")
    ).rows[0];
    assert.equal(bound.email, "cto-first@example.test");
    assert.equal(bound.auth_user_id, CTO_UID);
  });

  it("R4 wrong token: non-JWT Bearer stays 401 and leaks no labels", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, "bos_not_a_real_token_xx"),
      "not_a_pirin_access_token",
    );
  });

  it("R5 expired JWT: invited email still 401 invalid_or_revoked_token", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    const token = syntheticAccessToken({
      email: IVELIN_SEED_EMAIL,
      sub: IVELIN_UID,
      extra: { exp: 1 },
    });
    await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, token),
      "invalid_or_revoked_token",
    );
  });

  it("R6 cross-company labels + R7 invited Ivelin zk0 dogfood", async () => {
    process.env.VERCEL_ENV = "production";
    setIdentityStoreForTests(pgliteIdentityStore(db));
    const a = await whoamiPass(syntheticAccessToken({ email: "mentee-a@example.test", sub: A_UID }));
    const b = await whoamiPass(syntheticAccessToken({ email: "mentee-b@example.test", sub: B_UID }));
    const ivelin = await whoamiPass(syntheticAccessToken({ email: IVELIN_SEED_EMAIL, sub: IVELIN_UID }));
    assert.deepEqual(a.labels, ["alpha"]);
    assert.deepEqual(b.labels, ["bravo"]);
    assert.deepEqual(ivelin.labels, [...IVELIN_SEED_LABELS]);
    assert.ok(ivelin.labels.includes("zk0"));
    assert.ok(!a.labels.includes("bravo") && !a.labels.includes("zk0"));
    assert.ok(!b.labels.includes("alpha") && !b.labels.includes("pirin"));
    assert.ok(!ivelin.labels.includes("alpha") && !ivelin.labels.includes("bravo"));
  });
});
