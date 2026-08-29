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
});
