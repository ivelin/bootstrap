/**
 * RLS lock: one mentee cannot read another.
 * In-memory replica of the SQL USING clauses + migration file locks.
 * Live probe (optional): BOOTSTRAP_SUPABASE_URL + BOOTSTRAP_SUPABASE_ANON_KEY.
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
    assert.doesNotMatch(sql, /company-state|journeyPhase|BOOTSTRAP_DATA_ROOT/);
    assert.match(sql, /ivelin@pirin\.ai/);
    assert.match(sql, /'pirin'/);
    assert.match(sql, /'zk0'/);
    assert.match(sql, /'totbox'/);
    assert.match(sql, /SET search_path = public, extensions/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_whoami/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_mint_token\(\) TO authenticated/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_mint_token\(\) TO anon/);
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

  it("mint RPC is authenticated-only; whoami RPC is token-scoped in SQL", () => {
    const sql = fs.readFileSync(SQL, "utf8");
    assert.match(sql, /IF uid IS NULL THEN\s+RAISE EXCEPTION 'not_authenticated'/);
    assert.match(sql, /token_hash = public\.bootstrap_mcp_hash_token\(p_token\)/);
    assert.match(sql, /revoked_at IS NULL/);
  });
});
