/**
 * Isolated Postgres (PGlite). Never supabase-pirin-ai. Never prod.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(__dirname, "pglite", "identity-schema.sql");

let db;

async function asReader(authUserId, sql) {
  await db.exec("RESET ROLE");
  await db.exec(`SELECT set_config('app.auth_uid', '${authUserId}', false)`);
  await db.exec("SET ROLE mentee_reader");
  const rows = await db.query(sql);
  await db.exec("RESET ROLE");
  return rows.rows;
}

async function labelsFor(authUserId) {
  const rows = await asReader(
    authUserId,
    "SELECT label FROM bootstrap_company_labels ORDER BY label",
  );
  return rows.map((r) => r.label);
}

async function menteeEmailsFor(authUserId) {
  const rows = await asReader(
    authUserId,
    "SELECT email FROM bootstrap_mcp_mentees ORDER BY email",
  );
  return rows.map((r) => r.email);
}

describe("PGlite identity RLS (isolated, never prod)", () => {
  before(async () => {
    db = new PGlite();
    await db.exec(fs.readFileSync(SCHEMA, "utf8"));
  });

  after(async () => {
    await db?.close();
  });

  it("fixture never names a hosted Supabase URL", () => {
    const schema = fs.readFileSync(SCHEMA, "utf8");
    assert.match(schema, /NEVER apply this to supabase-pirin-ai/);
    assert.doesNotMatch(schema, /supabase\.co/);
    assert.doesNotMatch(schema, /BOOTSTRAP_SUPABASE_/);
  });

  it("FORCE RLS: A sees alpha only; B sees bravo only; empty uid sees none", async () => {
    assert.deepEqual(await menteeEmailsFor("11111111-1111-1111-1111-111111111111"), [
      "mentee-a@example.test",
    ]);
    assert.deepEqual(await labelsFor("11111111-1111-1111-1111-111111111111"), ["alpha"]);
    assert.deepEqual(await labelsFor("22222222-2222-2222-2222-222222222222"), ["bravo"]);
    assert.deepEqual(await menteeEmailsFor(""), []);
    assert.deepEqual(await labelsFor(""), []);
    const ivelin = await labelsFor("33333333-3333-3333-3333-333333333333");
    assert.deepEqual(ivelin, ["pirin", "totbox", "zk0"]);
    assert.ok(!ivelin.includes("alpha"));
    assert.ok(!ivelin.includes("bravo"));
  });

  it("fail-closed labels RPC: invited JWT shape authenticates; uninvited does not", async () => {
    await db.exec("RESET ROLE");
    await db.exec("SELECT set_config('app.auth_uid', '33333333-3333-3333-3333-333333333333', false)");
    await db.exec("SELECT set_config('app.auth_email', 'ivelin@pirin.ai', false)");
    const invited = (await db.query("SELECT bootstrap_mcp_my_labels() AS body")).rows[0].body;
    assert.equal(invited.authenticated, true);
    assert.equal(invited.email, "ivelin@pirin.ai");
    assert.deepEqual(invited.labels, ["pirin", "totbox", "zk0"]);

    await db.exec("SELECT set_config('app.auth_uid', '99999999-9999-9999-9999-999999999999', false)");
    await db.exec("SELECT set_config('app.auth_email', 'stranger@example.test', false)");
    const uninvited = (await db.query("SELECT bootstrap_mcp_my_labels() AS body")).rows[0].body;
    assert.equal(uninvited.authenticated, false);
    assert.equal(uninvited.reason, "not_invited");
    assert.deepEqual(uninvited.labels, []);
    assert.ok(!JSON.stringify(uninvited).includes("pirin"));
  });

  it("email-only first-user SQL insert then OAuth binds auth_user_id", async () => {
    await db.exec("RESET ROLE");
    await db.exec("SELECT set_config('app.auth_uid', '44444444-4444-4444-4444-444444444444', false)");
    await db.exec("SELECT set_config('app.auth_email', 'first@example.test', false)");
    const first = (await db.query("SELECT bootstrap_mcp_my_labels() AS body")).rows[0].body;
    assert.equal(first.authenticated, true);
    assert.equal(first.email, "first@example.test");
    assert.deepEqual(first.labels, ["beachhead"]);
    const bound = (
      await db.query("SELECT auth_user_id FROM bootstrap_mcp_mentees WHERE email = 'first@example.test'")
    ).rows[0];
    assert.equal(bound.auth_user_id, "44444444-4444-4444-4444-444444444444");
  });

  it("FORCE RLS: mentee_reader cannot see invite rows or outbox", async () => {
    await db.exec("RESET ROLE");
    await db.query(
      `INSERT INTO bootstrap_mcp_invites
        (id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at)
       VALUES ('inv-hidden', 'bill@example.test', 'zk0', 'mentee-ivelin', 'ivelin@pirin.ai', 'hash-hidden', now() + interval '1 day')`,
    );
    const hiddenInvites = await asReader(
      "33333333-3333-3333-3333-333333333333",
      "SELECT id FROM bootstrap_mcp_invites",
    );
    assert.deepEqual(hiddenInvites, []);
    const outbox = await asReader(
      "33333333-3333-3333-3333-333333333333",
      "SELECT id FROM bootstrap_mcp_invite_outbox",
    );
    assert.deepEqual(outbox, []);
  });
});
