/**
 * Invite mail contract (From bootstrap@ only). Never Resend HTTP. Never prod.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  INVITE_MAIL_FROM,
  INVITE_MAIL_NOTE,
  INVITE_SIGNUP_QUERY,
  assertInviteMailFrom,
  buildInviteMail,
  deliverInviteMailDryRun,
  inviteSignupUrl,
  resolveInviteMailMode,
  setInviteMailSinkForTests,
} from "../dist/invite-mail.js";
import { REPO_ROOT } from "./helpers.mjs";

afterEach(() => {
  setInviteMailSinkForTests(undefined);
  delete process.env.BOOTSTRAP_INVITE_MAIL;
  delete process.env.VERCEL_ENV;
});

describe("invite mail contract (never prod Resend)", { concurrency: false }, () => {
  it("From is bootstrap@pirin.ai only; signup URL is login?invite=", () => {
    assert.equal(INVITE_MAIL_FROM, "bootstrap@pirin.ai");
    assert.equal(INVITE_SIGNUP_QUERY, "invite");
    const url = inviteSignupUrl("inv_fixture_token_xxxxxxxx");
    assert.equal(url, "https://pirin.ai/bootstrap-os/login?invite=inv_fixture_token_xxxxxxxx");
    assert.doesNotMatch(url, /ivelin@|cos@/);
    assert.throws(() => assertInviteMailFrom("ivelin@pirin.ai"), /bootstrap@pirin\.ai/);
    assert.throws(() => assertInviteMailFrom("cos@pirin.ai"), /bootstrap@pirin\.ai/);
    assert.doesNotThrow(() => assertInviteMailFrom(INVITE_MAIL_FROM));
  });

  it("body names inviter, invitee, workspace, token, URL, QR", () => {
    const mail = buildInviteMail({
      inviterEmail: "ivelin@pirin.ai",
      inviteeEmail: "ivelin@zk0.bot",
      companyWorkspace: "zk0",
      inviteToken: "inv_fixture_token_xxxxxxxx",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    assert.equal(mail.from, INVITE_MAIL_FROM);
    assert.equal(mail.to, "ivelin@zk0.bot");
    assert.match(mail.subject, /ivelin@pirin\.ai/);
    assert.match(mail.subject, /zk0/);
    assert.match(mail.text, /Who invited: ivelin@pirin\.ai/);
    assert.match(mail.text, /Invitee email: ivelin@zk0\.bot/);
    assert.match(mail.text, /Company workspace: zk0/);
    assert.match(mail.text, /Invite token: inv_fixture_token_xxxxxxxx/);
    assert.match(mail.text, /Signup URL: https:\/\/pirin\.ai\/bootstrap-os\/login\?invite=inv_fixture_token_xxxxxxxx/);
    assert.match(mail.text, /QR payload \(same as signup URL\)/);
    assert.equal(mail.signupUrl, mail.qrPayload);
    assert.match(mail.text, /accept_invite/);
    assert.match(mail.text, /Sign in or create/);
    assert.match(INVITE_MAIL_NOTE, /Cos yes before prod Resend/);
    assert.match(INVITE_MAIL_NOTE, /any agentic client/);
    assert.doesNotMatch(mail.from, /ivelin@|cos@/);
  });

  it("default off; dry-run sinks; send never fires in production", () => {
    assert.equal(resolveInviteMailMode({}), "off");
    assert.equal(resolveInviteMailMode({ BOOTSTRAP_INVITE_MAIL: "off" }), "off");
    assert.equal(resolveInviteMailMode({ BOOTSTRAP_INVITE_MAIL: "dry-run" }), "dry-run");
    assert.equal(
      resolveInviteMailMode({ BOOTSTRAP_INVITE_MAIL: "send", VERCEL_ENV: "production" }),
      "off",
    );
    assert.equal(resolveInviteMailMode({ BOOTSTRAP_INVITE_MAIL: "send" }), "dry-run");

    const seen = [];
    setInviteMailSinkForTests((m) => seen.push(m));
    deliverInviteMailDryRun(
      buildInviteMail({
        inviterEmail: "ivelin@pirin.ai",
        inviteeEmail: "bill@example.test",
        companyWorkspace: "zk0",
        inviteToken: "inv_fixture_token_xxxxxxxx",
        expiresAt: "2030-01-01T00:00:00.000Z",
      }),
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0].from, INVITE_MAIL_FROM);

    const src = fs.readFileSync(path.join(REPO_ROOT, "mcp", "src", "invite-mail.ts"), "utf8");
    assert.doesNotMatch(src, /from ["']resend["']|smtp|nodemailer|sendgrid/i);
    assert.match(src, /Never blast prod mail/);
  });
});
