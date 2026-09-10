/**
 * RLS lock: one mentee cannot read another.
 * In-memory replica of the SQL USING clauses + migration file locks.
 * No network. PGlite runtime lock lives in identity-pglite.test.mjs.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashMcpToken,
  rlsVisibleLabels,
  rlsVisibleMentees,
} from "../dist/identity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260829_bootstrap_mcp_identity.sql",
);

const mentees = [
  {
    id: "a",
    email: "mentee-a@example.test",
    authUserId: "11111111-1111-1111-1111-111111111111",
    labels: ["alpha"],
    tokenHashes: [hashMcpToken("bos_a_token_fixture_xxxx")],
  },
  {
    id: "b",
    email: "mentee-b@example.test",
    authUserId: "22222222-2222-2222-2222-222222222222",
    labels: ["bravo"],
    tokenHashes: [hashMcpToken("bos_b_token_fixture_xxxx")],
  },
];

describe("RLS: one mentee cannot read another", () => {
  it("migration enables FORCE RLS and own-row policies", () => {
    const sql = fs.readFileSync(SQL, "utf8");
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
    assert.match(sql, /mentees_select_own/);
    assert.match(sql, /labels_select_own/);
    assert.match(sql, /auth\.uid\(\) = auth_user_id/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.bootstrap_company_labels/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.bootstrap_mcp_tokens/);
    assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,200}USING\s*\(\s*true\s*\)/i);
    assert.doesNotMatch(sql, /journeyPhase|BOOTSTRAP_DATA_ROOT|company_state\.json/);
    assert.doesNotMatch(sql, /CREATE TABLE[\s\S]{0,80}company_state/i);
    assert.match(sql, /ivelin@pirin\.ai/);
    assert.match(sql, /'pirin'/);
    assert.match(sql, /'zk0'/);
    assert.match(sql, /'totbox'/);
    assert.match(sql, /SET search_path = public, extensions/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_my_labels\(\) TO authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_mint_token\(\) TO authenticated/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_mint_token\(\) TO anon/);
    assert.match(sql, /'reason', 'not_invited'/);
    assert.doesNotMatch(sql, /found_id IS NULL THEN[\s\S]{0,200}'authenticated',\s*true/);
    assert.doesNotMatch(sql, /mentee_id IS NULL THEN[\s\S]{0,200}'authenticated',\s*true/);
    assert.match(sql, /RAISE EXCEPTION 'not_invited'/);
    assert.doesNotMatch(
      sql,
      /INSERT INTO public\.bootstrap_mcp_mentees \(email, auth_user_id\)[\s\S]{0,80}ON CONFLICT \(email\)/,
    );
    const followOn = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20260909_bootstrap_mcp_fail_closed_invite.sql",
    );
    const followSql = fs.readFileSync(followOn, "utf8");
    assert.match(followSql, /'reason', 'not_invited'/);
    assert.match(followSql, /RAISE EXCEPTION 'not_invited'/);
    assert.doesNotMatch(followSql, /found_id IS NULL THEN[\s\S]{0,200}'authenticated',\s*true/);
    assert.doesNotMatch(followSql, /mentee_id IS NULL THEN[\s\S]{0,200}'authenticated',\s*true/);
    assert.doesNotMatch(followSql, /supabase\.co/);
    const inviteSql = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "migrations", "20260910_bootstrap_mcp_invite_accept.sql"),
      "utf8",
    );
    assert.match(inviteSql, /DO NOT apply from a PR cloud agent/);
    assert.match(inviteSql, /FORCE ROW LEVEL SECURITY/);
    assert.match(inviteSql, /REVOKE ALL ON TABLE public\.bootstrap_mcp_invites/);
    assert.match(inviteSql, /REVOKE ALL ON TABLE public\.bootstrap_mcp_invite_outbox/);
    assert.match(inviteSql, /channel = 'in_chat'/);
    assert.match(inviteSql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member\(text, text\) TO authenticated/);
    assert.match(inviteSql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_accept_invite\(text\) TO authenticated/);
    assert.doesNotMatch(inviteSql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member[\s\S]{0,60}anon/);
    assert.doesNotMatch(inviteSql, /CREATE POLICY[\s\S]{0,200}USING\s*\(\s*true\s*\)/i);
    assert.doesNotMatch(inviteSql, /smtp|nodemailer|sendgrid/i);
    assert.doesNotMatch(inviteSql, /supabase\.co/);
    const qualifySql = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "migrations", "20260910_bootstrap_mcp_invite_qualify_label.sql"),
      "utf8",
    );
    assert.match(qualifySql, /CREATE OR REPLACE FUNCTION public\.bootstrap_mcp_invite_member/);
    assert.match(qualifySql, /cl\.label = company_label/);
    assert.doesNotMatch(qualifySql.replace(/--[^\n]*/g, ""), /AND label = label/);
    assert.match(qualifySql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member\(text, text\) TO authenticated/);
    assert.doesNotMatch(qualifySql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member[\s\S]{0,60}anon/);
    assert.doesNotMatch(qualifySql, /supabase\.co/);
  });

  it("authenticated A cannot see B labels or mentee row", () => {
    const asA = rlsVisibleMentees(mentees, mentees[0].authUserId);
    const asB = rlsVisibleMentees(mentees, mentees[1].authUserId);
    const asAnon = rlsVisibleMentees(mentees, null);
    assert.deepEqual(
      asA.map((m) => m.email),
      ["mentee-a@example.test"],
    );
    assert.deepEqual(
      asB.map((m) => m.email),
      ["mentee-b@example.test"],
    );
    assert.deepEqual(asAnon, []);
    assert.deepEqual(rlsVisibleLabels(mentees, mentees[0].authUserId), ["alpha"]);
    assert.deepEqual(rlsVisibleLabels(mentees, mentees[1].authUserId), ["bravo"]);
    assert.deepEqual(rlsVisibleLabels(mentees, null), []);
    assert.ok(!rlsVisibleLabels(mentees, mentees[0].authUserId).includes("bravo"));
  });

  it("session labels RPC is authenticated-only; hashed mint stays demoted leftover", () => {
    const sql = fs.readFileSync(SQL, "utf8");
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.bootstrap_mcp_my_labels/);
    assert.match(sql, /IF uid IS NULL THEN\s+RAISE EXCEPTION 'not_authenticated'/);
    assert.match(sql, /token_hash = public\.bootstrap_mcp_hash_token\(p_token\)/);
    assert.match(sql, /revoked_at IS NULL/);
    assert.match(sql, /Must not auto-insert/);
  });
});
