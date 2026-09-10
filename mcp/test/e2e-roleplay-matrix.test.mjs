/**
 * CTO/PM E2E role-play matrix (PGlite + hosted handler).
 * Never supabase-pirin-ai. Never prod. Mail/QR/SMS not invented here.
 *
 * Matrix + draft prod synthetic SRE (say once): mcp/docs/E2E_ROLEPLAY.md
 * Invite contract (say once): mcp/docs/INVITE.md
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
  hashMcpToken,
  setIdentityStoreForTests,
  whoamiFromLabelsRpc,
} from "../dist/identity.js";
import { actorClaimsFromAccessToken, syntheticAccessToken } from "../dist/journey-auth.js";
import { HOSTED_MCP_RESOURCE, WWW_AUTHENTICATE_CHALLENGE, isJwtAccessToken } from "../dist/oauth.js";
import {
  PgliteInviteStore,
  setInviteClockForTests,
  setInviteStoreForTests,
} from "../dist/invite.js";
import { REPO_ROOT } from "./helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(__dirname, "pglite", "identity-schema.sql");
const E2E_DOC = path.join(REPO_ROOT, "mcp", "docs", "E2E_ROLEPLAY.md");
const HOSTED_DOC = path.join(REPO_ROOT, "mcp", "docs", "HOSTED_IDENTITY.md");
const INVITE_DOC = path.join(REPO_ROOT, "mcp", "docs", "INVITE.md");

const IVELIN_UID = "33333333-3333-3333-3333-333333333333";
const A_UID = "11111111-1111-1111-1111-111111111111";
const B_UID = "22222222-2222-2222-2222-222222222222";
const STRANGER_UID = "99999999-9999-9999-9999-999999999999";
const CTO_UID = "55555555-5555-5555-5555-555555555555";
const BILL_UID = "66666666-6666-6666-6666-666666666666";
const BILL_EMAIL = "bill@example.test";

let db;
let rpcId = 80;

afterEach(() => {
  setIdentityStoreForTests(undefined);
  setInviteStoreForTests(undefined);
  setInviteClockForTests();
  delete process.env.VERCEL_ENV;
});

function usePgliteStores() {
  setIdentityStoreForTests(pgliteIdentityStore(db));
  setInviteStoreForTests(new PgliteInviteStore(db));
}

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
  const blob = JSON.stringify(body);
  assert.doesNotMatch(blob, /"(alpha|bravo|totbox|zk0|secret-other)"/);
  assert.equal(body.labels, undefined);
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

async function callTool(name, args, token) {
  const res = await rawRpc("tools/call", { name, arguments: args }, token);
  const text = await res.text();
  return { res, body: JSON.parse(text), text };
}

function assertNoLabelLeak(blob) {
  assert.doesNotMatch(blob, /"(alpha|bravo|totbox|secret-other)"/);
}

describe("E2E role-play matrix (PGlite, never prod)", { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    await db.exec(fs.readFileSync(SCHEMA, "utf8"));
  });

  after(async () => {
    await db?.close();
  });

  it("docs say the matrix once; P1–P2 shipped; mail pending", () => {
    const e2e = fs.readFileSync(E2E_DOC, "utf8");
    const hosted = fs.readFileSync(HOSTED_DOC, "utf8");
    const invite = fs.readFileSync(INVITE_DOC, "utf8");
    assert.match(e2e, /E2E role-play matrix/);
    assert.match(e2e, /R1/);
    assert.match(e2e, /not_invited/);
    assert.match(e2e, /First-user|first-user/);
    assert.match(e2e, /zk0/);
    assert.match(e2e, /invite_member/);
    assert.match(e2e, /accept_invite/);
    assert.match(e2e, /P1/);
    assert.match(e2e, /P2/);
    assert.match(e2e, /Mail round-trip/);
    assert.match(e2e, /\*\*Pending\*\*.*Follow-on/s);
    assert.match(e2e, /INVITE\.md/);
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
    assert.match(hosted, /INVITE\.md/);
    assert.match(hosted, /First user \(rebuild from GitHub\)/);
    assert.match(invite, /DraftExternalMessage/);
    assert.match(invite, /Bill/);
  });

  it("wires invite_member / accept_invite into CI; mailer stays out", () => {
    assert.ok(HOSTED_GATED_TOOL_NAMES.includes("invite_member"));
    assert.ok(HOSTED_GATED_TOOL_NAMES.includes("accept_invite"));
    for (const name of HOSTED_READ_TOOL_NAMES) {
      assert.doesNotMatch(name, /invite|mailer/i);
    }
    const server = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "server.ts"), "utf8");
    assert.match(server, /invite_member/);
    assert.match(server, /accept_invite/);
    const inviteSrc = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "invite.ts"), "utf8");
    assert.doesNotMatch(inviteSrc, /from ["']resend["']|smtp|nodemailer|sendgrid/i);
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "mcp", "package.json"), "utf8"));
    assert.match(pkg.scripts["test:unit"], /e2e-roleplay-matrix\.test\.mjs/);
    assert.match(pkg.scripts["test:unit"], /invite\.test\.mjs/);
    assert.doesNotMatch(pkg.scripts["test:unit"], /preview-live/);
    assert.doesNotMatch(pkg.scripts.ci, /preview-live/);
  });

  it("R1 PM empty Bearer: handshake + whoami 401 missing_or_short_token", async () => {
    process.env.VERCEL_ENV = "production";
    usePgliteStores();
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
    usePgliteStores();
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
    usePgliteStores();
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
    usePgliteStores();
    await assertGated401(
      await rawRpc("tools/call", { name: "bootstrap_whoami", arguments: {} }, "bos_not_a_real_token_xx"),
      "not_a_pirin_access_token",
    );
  });

  it("R5 expired JWT: invited email still 401 invalid_or_revoked_token", async () => {
    process.env.VERCEL_ENV = "production";
    usePgliteStores();
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
    usePgliteStores();
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

  it("P1 invite_member: Ivelin invites Bill to zk0; uninvited and cross-company fail", async () => {
    process.env.VERCEL_ENV = "production";
    usePgliteStores();
    const ivelin = syntheticAccessToken({ email: IVELIN_SEED_EMAIL, sub: IVELIN_UID });
    const stranger = syntheticAccessToken({ email: "stranger@example.test", sub: STRANGER_UID });
    const aTok = syntheticAccessToken({ email: "mentee-a@example.test", sub: A_UID });

    await assertGated401(
      await rawRpc("tools/call", { name: "invite_member", arguments: { email: BILL_EMAIL, companyLabel: "zk0" } }),
      "missing_or_short_token",
    );
    await assertGated401(
      await rawRpc(
        "tools/call",
        { name: "invite_member", arguments: { email: BILL_EMAIL, companyLabel: "zk0" } },
        stranger,
      ),
      "not_invited",
    );

    const cross = await callTool("invite_member", { email: "other@example.test", companyLabel: "bravo" }, aTok);
    assert.equal(cross.res.status, 200, cross.text);
    assert.equal(cross.body.result.isError, true);
    assert.match(cross.body.result.content.map((c) => c.text).join("\n"), /does not hold/i);
    assertNoLabelLeak(cross.text);

    const invited = await callTool("invite_member", { email: "Bill@Example.TEST", companyLabel: "zk0" }, ivelin);
    assert.equal(invited.res.status, 200, invited.text);
    const payload = parseTool(invited.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.card.card, "accept_invite");
    assert.equal(payload.card.shape, "DraftExternalMessage");
    assert.equal(payload.card.from.email, IVELIN_SEED_EMAIL);
    assert.equal(payload.card.to.email, BILL_EMAIL);
    assert.equal(payload.card.companyWorkspace, "zk0");
    assert.equal(payload.card.action, "Accept");
    assert.equal(payload.queued.channel, "in_chat");
    assert.match(payload.card.inviteToken, /^inv_/);
    const outbox = (await db.query("SELECT channel, payload FROM bootstrap_mcp_invite_outbox")).rows;
    assert.ok(outbox.length >= 1);
    assert.equal(outbox[outbox.length - 1].channel, "in_chat");
    assert.equal(outbox[outbox.length - 1].payload.inviteToken, null);
  });

  it("P2 accept_invite: Bill lands on zk0; wrong email / expired / replay / bad token fail", async () => {
    process.env.VERCEL_ENV = "production";
    usePgliteStores();
    const ivelin = syntheticAccessToken({ email: IVELIN_SEED_EMAIL, sub: IVELIN_UID });
    const bill = syntheticAccessToken({ email: BILL_EMAIL, sub: BILL_UID });
    const stranger = syntheticAccessToken({ email: "stranger@example.test", sub: STRANGER_UID });

    const created = parseTool(
      (await callTool("invite_member", { email: BILL_EMAIL, companyLabel: "zk0" }, ivelin)).body,
    );
    const token = created.card.inviteToken;

    await assertGated401(
      await rawRpc("tools/call", { name: "accept_invite", arguments: { token } }),
      "missing_or_short_token",
    );

    const mismatch = await callTool("accept_invite", { token }, stranger);
    assert.equal(mismatch.body.result.isError, true);
    assert.match(mismatch.body.result.content.map((c) => c.text).join("\n"), /Invite rejected/);
    assertNoLabelLeak(mismatch.text);

    const bad = await callTool("accept_invite", { token: "inv_not_a_real_invite_token_xx" }, bill);
    assert.equal(bad.body.result.isError, true);
    assert.match(bad.body.result.content.map((c) => c.text).join("\n"), /Invite rejected/);

    const expiredToken = "inv_expired_fixture_token_xxxxxx";
    await db.exec("RESET ROLE");
    await db.query(
      `INSERT INTO bootstrap_mcp_invites
        (id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at, accepted_at)
       VALUES ($1, $2, 'zk0', 'mentee-ivelin', $3, $4, $5, NULL)`,
      ["inv-expired", BILL_EMAIL, IVELIN_SEED_EMAIL, hashMcpToken(expiredToken), "2000-01-01T00:00:00.000Z"],
    );
    const expired = await callTool("accept_invite", { token: expiredToken }, bill);
    assert.equal(expired.body.result.isError, true);
    assert.match(expired.body.result.content.map((c) => c.text).join("\n"), /Invite rejected/);

    const accepted = await callTool("accept_invite", { token }, bill);
    assert.equal(accepted.res.status, 200, accepted.text);
    const ok = parseTool(accepted.body);
    assert.equal(ok.ok, true);
    assert.equal(ok.email, BILL_EMAIL);
    assert.deepEqual(ok.labels, ["zk0"]);

    const who = await whoamiPass(bill);
    assert.equal(who.authenticated, true);
    assert.equal(who.email, BILL_EMAIL);
    assert.deepEqual(who.labels, ["zk0"]);
    assert.ok(!who.labels.includes("alpha") && !who.labels.includes("pirin"));

    const replay = await callTool("accept_invite", { token }, bill);
    assert.equal(replay.body.result.isError, true);
    assert.match(replay.body.result.content.map((c) => c.text).join("\n"), /Invite rejected/);
  });
});
