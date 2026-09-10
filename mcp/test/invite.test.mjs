/**
 * Invite + accept unit locks (memory). PGlite HTTP matrix lives in e2e-roleplay-matrix.
 * Never supabase-pirin-ai. Never prod. No Resend.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MemoryInviteStore,
  SupabaseInviteStore,
  buildAcceptCard,
  createInviteStore,
  decideInviteAccept,
  decideInviteCreate,
  enqueueInviteInChat,
  inviteFailMessage,
  inviteOutboxPayload,
  inviteRpcFailed,
  normalizeCompanyLabel,
  normalizeInviteEmail,
  parseInviteRpcJson,
  setInviteClockForTests,
  setInviteEnqueueHook,
  setInviteStoreForTests,
} from "../dist/invite.js";
import { IVELIN_SEED_EMAIL, IVELIN_SEED_LABELS } from "../dist/identity.js";
import { REPO_ROOT } from "./helpers.mjs";

const INVITE_DOC = path.join(REPO_ROOT, "mcp", "docs", "INVITE.md");
const HOSTED_DOC = path.join(REPO_ROOT, "mcp", "docs", "HOSTED_IDENTITY.md");
const SQL = path.join(
  REPO_ROOT,
  "mcp",
  "supabase",
  "migrations",
  "20260910_bootstrap_mcp_invite_accept.sql",
);
const QUALIFY_SQL = path.join(
  REPO_ROOT,
  "mcp",
  "supabase",
  "migrations",
  "20260910_bootstrap_mcp_invite_qualify_label.sql",
);
const PGLITE_SCHEMA = path.join(REPO_ROOT, "mcp", "test", "pglite", "identity-schema.sql");

afterEach(() => {
  setInviteStoreForTests(undefined);
  setInviteClockForTests();
  setInviteEnqueueHook(undefined);
});

function ivelinStore() {
  return new MemoryInviteStore([
    {
      id: "mentee-ivelin",
      email: IVELIN_SEED_EMAIL,
      authUserId: "33333333-3333-3333-3333-333333333333",
      labels: [...IVELIN_SEED_LABELS],
    },
    {
      id: "mentee-a",
      email: "mentee-a@example.test",
      authUserId: "11111111-1111-1111-1111-111111111111",
      labels: ["alpha"],
    },
  ]);
}

describe("invite + accept (memory, never prod)", { concurrency: false }, () => {
  it("docs say invite once and keep first-user SQL on HOSTED_IDENTITY", () => {
    const invite = fs.readFileSync(INVITE_DOC, "utf8");
    const hosted = fs.readFileSync(HOSTED_DOC, "utf8");
    assert.match(invite, /invite_member/);
    assert.match(invite, /accept_invite/);
    assert.match(invite, /DraftExternalMessage/);
    assert.match(invite, /who invited/);
    assert.match(invite, /Bill/);
    assert.match(invite, /zk0/);
    assert.match(invite, /Mail/);
    assert.match(invite, /QR/);
    assert.match(invite, /SMS/);
    assert.match(invite, /Not `\/bootstrap-os\/login`/);
    assert.match(invite, /HOSTED_IDENTITY\.md#first-user-rebuild-from-github/);
    assert.match(invite, /20260910_bootstrap_mcp_invite_accept\.sql/);
    assert.match(invite, /20260910_bootstrap_mcp_invite_qualify_label\.sql/);
    assert.match(invite, /PGlite/);
    assert.match(invite, /supabase-pirin-ai/);
    assert.match(invite, /invite_store_unset/);
    assert.match(invite, /invite_rpc_failed/);
    assert.doesNotMatch(invite, /INSERT INTO public\.bootstrap_mcp_mentees/);
    assert.match(hosted, /INVITE\.md/);
    assert.match(hosted, /First user \(rebuild from GitHub\)/);
    assert.match(hosted, /20260910_bootstrap_mcp_invite_qualify_label\.sql/);
    const sql = fs.readFileSync(SQL, "utf8");
    assert.match(sql, /DO NOT apply from a PR cloud agent/);
    assert.match(sql, /bootstrap_mcp_invite_member/);
    assert.match(sql, /bootstrap_mcp_accept_invite/);
    assert.match(sql, /channel = 'in_chat'/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member[\s\S]{0,40}anon/);
    assert.doesNotMatch(sql, /smtp|nodemailer|sendgrid/i);
    assert.doesNotMatch(sql, /supabase\.co/);
    const qualify = fs.readFileSync(QUALIFY_SQL, "utf8");
    const pglite = fs.readFileSync(PGLITE_SCHEMA, "utf8");
    const withoutComments = (sql) => sql.replace(/--[^\n]*/g, "");
    assert.match(qualify, /CREATE OR REPLACE FUNCTION public\.bootstrap_mcp_invite_member/);
    assert.match(qualify, /cl\.label = company_label/);
    assert.doesNotMatch(withoutComments(qualify), /AND label = label/);
    assert.match(qualify, /DO NOT apply from a PR cloud agent/);
    assert.doesNotMatch(qualify, /supabase\.co/);
    assert.match(pglite, /SELECT bootstrap_mcp_invite_member|bootstrap_mcp_invite_member\(p_email/);
    assert.match(pglite, /cl\.label = company_label/);
    assert.doesNotMatch(withoutComments(pglite), /AND label = label/);
    const storeSrc = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "invite.ts"), "utf8");
    assert.match(storeSrc, /SELECT bootstrap_mcp_invite_member\(\$1, \$2\)/);
    assert.match(storeSrc, /SELECT bootstrap_mcp_accept_invite\(\$1\)/);
  });

  it("normalizes email/label and refuses a label the inviter does not hold", () => {
    assert.equal(normalizeInviteEmail("Bill@Example.TEST"), "bill@example.test");
    assert.equal(normalizeInviteEmail("not-an-email"), null);
    assert.equal(normalizeCompanyLabel("Zk0"), "zk0");
    assert.equal(normalizeCompanyLabel("../etc"), null);
    assert.deepEqual(decideInviteCreate(["pirin", "zk0"], "zk0"), { ok: true });
    assert.deepEqual(decideInviteCreate(["alpha"], "bravo"), { ok: false, reason: "label_not_held" });
  });

  it("accept fail-closed: missing, expired, replay, wrong email", () => {
    const base = {
      id: "inv-1",
      inviteeEmail: "bill@example.test",
      companyLabel: "zk0",
      invitedByMenteeId: "mentee-ivelin",
      invitedByEmail: IVELIN_SEED_EMAIL,
      tokenHash: "abc",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    };
    assert.equal(decideInviteAccept({ now: Date.now(), actorEmail: "bill@example.test" }).reason, "invite_not_found");
    assert.equal(
      decideInviteAccept({
        now: Date.now() + 120_000,
        actorEmail: "bill@example.test",
        invite: base,
      }).reason,
      "invite_expired",
    );
    assert.equal(
      decideInviteAccept({
        now: Date.now(),
        actorEmail: "bill@example.test",
        invite: { ...base, acceptedAt: new Date().toISOString() },
      }).reason,
      "invite_already_used",
    );
    assert.equal(
      decideInviteAccept({
        now: Date.now(),
        actorEmail: "stranger@example.test",
        invite: base,
      }).reason,
      "invite_email_mismatch",
    );
    assert.deepEqual(
      decideInviteAccept({ now: Date.now(), actorEmail: "bill@example.test", invite: base }),
      { ok: true },
    );
  });

  it("Accept card is DraftExternalMessage-shaped; outbox strips the raw token", () => {
    const card = buildAcceptCard({
      fromEmail: IVELIN_SEED_EMAIL,
      toEmail: "bill@example.test",
      companyWorkspace: "zk0",
      inviteToken: "inv_once_only_fixture_token_xx",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    assert.equal(card.card, "accept_invite");
    assert.equal(card.shape, "DraftExternalMessage");
    assert.equal(card.from.email, IVELIN_SEED_EMAIL);
    assert.equal(card.to.email, "bill@example.test");
    assert.equal(card.companyWorkspace, "zk0");
    assert.equal(card.action, "Accept");
    assert.equal(card.tool, "accept_invite");
    assert.match(card.note, /Not \/bootstrap-os\/login/);
    const queued = enqueueInviteInChat("inv-1", card);
    assert.equal(queued.channel, "in_chat");
    assert.equal(queued.payload.inviteToken, null);
    assert.doesNotMatch(JSON.stringify(inviteOutboxPayload(card)), /inv_once_only/);
  });

  it("memory store: Ivelin invites Bill to zk0; Bill accepts; A cannot invite to bravo", async () => {
    const store = ivelinStore();
    const invited = await store.inviteMember(
      { email: IVELIN_SEED_EMAIL, labels: [...IVELIN_SEED_LABELS] },
      { email: "Bill@Example.TEST", companyLabel: "zk0" },
    );
    assert.equal(invited.ok, true);
    if (!invited.ok) return;
    assert.equal(invited.card.shape, "DraftExternalMessage");
    assert.equal(invited.queued.channel, "in_chat");
    assert.match(invited.card.inviteToken, /^inv_/);

    const cross = await store.inviteMember(
      { email: "mentee-a@example.test", labels: ["alpha"] },
      { email: "other@example.test", companyLabel: "bravo" },
    );
    assert.deepEqual(cross, { ok: false, reason: "label_not_held" });

    const stranger = await store.acceptInvite(
      { email: "stranger@example.test", sub: "s-stranger" },
      invited.card.inviteToken,
    );
    assert.equal(stranger.ok, false);
    if (stranger.ok) return;
    assert.equal(stranger.reason, "invite_email_mismatch");

    const accepted = await store.acceptInvite(
      { email: "bill@example.test", sub: "s-bill" },
      invited.card.inviteToken,
    );
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.email, "bill@example.test");
    assert.deepEqual(accepted.labels, ["zk0"]);
    assert.equal(store.menteeByEmail("bill@example.test")?.authUserId, "s-bill");

    const replay = await store.acceptInvite(
      { email: "bill@example.test", sub: "s-bill" },
      invited.card.inviteToken,
    );
    assert.deepEqual(replay, { ok: false, reason: "invite_already_used" });
  });

  it("invite_store_unset is missing env/client only; failed RPC keeps status+body", async () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "invite.ts"), "utf8");
    const serverSrc = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "server.ts"), "utf8");
    const rpcFn = src.match(/private async rpc\([\s\S]*?^  \}/m);
    assert.ok(rpcFn, "rpc() must exist");
    assert.doesNotMatch(rpcFn[0], /invite_store_unset/);
    assert.match(rpcFn[0], /inviteRpcFailed/);
    assert.match(src, /if \(!url \|\| !key \|\| !accessToken\) return null/);
    assert.match(serverSrc, /inviteFailMessage\(result\)/);
    assert.doesNotMatch(serverSrc, /inviteFailMessage\(result\.reason\)/);

    const prev = {
      BOOTSTRAP_SUPABASE_URL: process.env.BOOTSTRAP_SUPABASE_URL,
      BOOTSTRAP_SUPABASE_ANON_KEY: process.env.BOOTSTRAP_SUPABASE_ANON_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
    delete process.env.BOOTSTRAP_SUPABASE_URL;
    delete process.env.BOOTSTRAP_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      assert.equal(createInviteStore("tok"), null);
      process.env.BOOTSTRAP_SUPABASE_URL = "https://example.supabase.co";
      assert.equal(createInviteStore("tok"), null);
      process.env.BOOTSTRAP_SUPABASE_ANON_KEY = "anon-key-fixture-xx";
      assert.equal(createInviteStore(undefined), null);
      const configured = createInviteStore("tok");
      assert.ok(configured);
      assert.equal(configured.kind, "supabase");
    } finally {
      for (const [key, value] of Object.entries(prev)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }

    assert.match(inviteFailMessage("invite_store_unset"), /Invite store unset/);
    const rpcMsg = inviteFailMessage(
      inviteRpcFailed(404, '{"code":"PGRST202","message":"schema cache"}'),
    );
    assert.match(rpcMsg, /Invite RPC failed \(HTTP 404\)/);
    assert.match(rpcMsg, /PGRST202/);
    assert.doesNotMatch(rpcMsg, /Invite store unset/);
    assert.deepEqual(parseInviteRpcJson(JSON.stringify({ ok: false, reason: "invalid_email" })), {
      ok: false,
      reason: "invalid_email",
    });
    assert.deepEqual(
      parseInviteRpcJson(JSON.stringify(JSON.stringify({ ok: false, reason: "invalid_email" }))),
      { ok: false, reason: "invalid_email" },
    );

    const origFetch = globalThis.fetch;
    const store = new SupabaseInviteStore(
      "https://rpc-fail.example",
      "anon-key-fixture-xx",
      "access-token-fixture",
    );
    try {
      globalThis.fetch = async (url) => {
        const u = String(url);
        assert.match(u, /https:\/\/rpc-fail\.example\/rest\/v1\/rpc\//);
        if (u.endsWith("/bootstrap_mcp_invite_member")) {
          return new Response(
            JSON.stringify({
              code: "PGRST202",
              message:
                "Could not find the function public.bootstrap_mcp_invite_member(p_email, p_company_label) in the schema cache",
            }),
            { status: 404 },
          );
        }
        if (u.endsWith("/bootstrap_mcp_accept_invite")) {
          return new Response(
            JSON.stringify({
              code: "42501",
              message: "permission denied for function bootstrap_mcp_accept_invite",
            }),
            { status: 403 },
          );
        }
        throw new Error(`unexpected fetch ${u}`);
      };
      const invited = await store.inviteMember(
        { email: IVELIN_SEED_EMAIL },
        { email: "bill@example.test", companyLabel: "zk0" },
      );
      assert.equal(invited.ok, false);
      if (invited.ok) return;
      assert.equal(invited.reason, "invite_rpc_failed");
      assert.equal(invited.status, 404);
      assert.match(invited.body, /PGRST202/);
      assert.match(invited.body, /schema cache/);
      assert.doesNotMatch(inviteFailMessage(invited), /Invite store unset/);

      const accepted = await store.acceptInvite({ email: "bill@example.test" }, "inv_fixture_token_xxxx");
      assert.equal(accepted.ok, false);
      if (accepted.ok) return;
      assert.equal(accepted.reason, "invite_rpc_failed");
      assert.equal(accepted.status, 403);
      assert.match(accepted.body, /42501/);
      assert.notEqual(accepted.reason, "invite_not_found");

      globalThis.fetch = async () =>
        new Response(JSON.stringify({ ok: false, reason: "label_not_held" }), { status: 200 });
      assert.deepEqual(
        await store.inviteMember(
          { email: IVELIN_SEED_EMAIL },
          { email: "bill@example.test", companyLabel: "bravo" },
        ),
        { ok: false, reason: "label_not_held" },
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
