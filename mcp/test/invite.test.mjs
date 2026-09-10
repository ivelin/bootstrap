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
  buildAcceptCard,
  decideInviteAccept,
  decideInviteCreate,
  enqueueInviteInChat,
  inviteOutboxPayload,
  normalizeCompanyLabel,
  normalizeInviteEmail,
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

describe("invite + accept (memory, never prod)", () => {
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
    assert.match(invite, /PGlite/);
    assert.match(invite, /supabase-pirin-ai/);
    assert.doesNotMatch(invite, /INSERT INTO public\.bootstrap_mcp_mentees/);
    assert.match(hosted, /INVITE\.md/);
    assert.match(hosted, /First user \(rebuild from GitHub\)/);
    const sql = fs.readFileSync(SQL, "utf8");
    assert.match(sql, /DO NOT apply from a PR cloud agent/);
    assert.match(sql, /bootstrap_mcp_invite_member/);
    assert.match(sql, /bootstrap_mcp_accept_invite/);
    assert.match(sql, /channel = 'in_chat'/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.bootstrap_mcp_invite_member[\s\S]{0,40}anon/);
    assert.doesNotMatch(sql, /smtp|nodemailer|sendgrid/i);
    assert.doesNotMatch(sql, /supabase\.co/);
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
});
