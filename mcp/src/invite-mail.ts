/**
 * Outsider invite mail contract (MCP side).
 * From: bootstrap@pirin.ai only. Never ivelin@ / cos@.
 * This repo enqueues + builds the body. pirin-ai Resend sends after Cos yes.
 * Default off. dry-run for tests. Never blast prod mail from MCP / CI.
 */
import { PIRIN_AUTHORIZATION_SERVER } from "./oauth.js";

export const INVITE_MAIL_FROM = "bootstrap@pirin.ai";
export const INVITE_SIGNUP_QUERY = "invite";

export const INVITE_MAIL_NOTE =
  "Universal path for any agentic client. Web Builder owns /bootstrap-os/login. Sign in as this email if you already have a pirin.ai account; otherwise create the account for this invitee email only. Then accept_invite with the same token. pirin-ai sends From bootstrap@pirin.ai only — Cos yes before prod Resend.";

export type InviteMailMode = "off" | "dry-run";

export type InviteMail = {
  from: typeof INVITE_MAIL_FROM;
  to: string;
  subject: string;
  text: string;
  signupUrl: string;
  qrPayload: string;
  inviteToken: string;
  inviterEmail: string;
  inviteeEmail: string;
  companyWorkspace: string;
};

export type InviteMailInput = {
  inviterEmail: string;
  inviteeEmail: string;
  companyWorkspace: string;
  inviteToken: string;
  expiresAt: string;
};

let mailSink: ((mail: InviteMail) => void) | undefined;

export function setInviteMailSinkForTests(sink?: (mail: InviteMail) => void): void {
  mailSink = sink;
}

export function inviteSignupUrl(token: string): string {
  const url = new URL(PIRIN_AUTHORIZATION_SERVER);
  url.searchParams.set(INVITE_SIGNUP_QUERY, token);
  return url.toString();
}

export function assertInviteMailFrom(from: string): asserts from is typeof INVITE_MAIL_FROM {
  if (from !== INVITE_MAIL_FROM) {
    throw new Error("Invite mail From must be bootstrap@pirin.ai");
  }
  if (/ivelin@|cos@/i.test(from) && from !== INVITE_MAIL_FROM) {
    throw new Error("Invite mail From must be bootstrap@pirin.ai");
  }
}

export function resolveInviteMailMode(
  env: NodeJS.ProcessEnv = process.env,
): InviteMailMode {
  const raw = (env.BOOTSTRAP_INVITE_MAIL ?? "off").trim().toLowerCase();
  if (raw === "dry-run") return "dry-run";
  // "send" is not implemented in this repo. Prod Resend lives on pirin-ai.
  // Force off in production so CI / Vercel never blast mail.
  if (raw === "send" && env.VERCEL_ENV !== "production") return "dry-run";
  return "off";
}

export function buildInviteMail(input: InviteMailInput): InviteMail {
  assertInviteMailFrom(INVITE_MAIL_FROM);
  const signupUrl = inviteSignupUrl(input.inviteToken);
  const text = [
    "You've been invited to a Bootstrap OS company workspace.",
    "",
    `Who invited: ${input.inviterEmail}`,
    `Invitee email: ${input.inviteeEmail}`,
    `Company workspace: ${input.companyWorkspace}`,
    `Invite token: ${input.inviteToken}`,
    `Signup URL: ${signupUrl}`,
    `QR payload (same as signup URL): ${signupUrl}`,
    `Expires: ${input.expiresAt}`,
    "",
    "Sign in or create the account for this invitee email only (Web Builder).",
    "If you already have a pirin.ai account, sign in as this email — do not register a second one.",
    "After you have a pirin.ai JWT as that email, call accept_invite with the same token.",
    "Any MCP client that already has that Bearer can call accept_invite directly.",
    "",
    INVITE_MAIL_NOTE,
  ].join("\n");
  return {
    from: INVITE_MAIL_FROM,
    to: input.inviteeEmail,
    subject: `${input.inviterEmail} invited you to ${input.companyWorkspace} on Bootstrap OS`,
    text,
    signupUrl,
    qrPayload: signupUrl,
    inviteToken: input.inviteToken,
    inviterEmail: input.inviterEmail,
    inviteeEmail: input.inviteeEmail,
    companyWorkspace: input.companyWorkspace,
  };
}

/** dry-run / test sink only. Never HTTP to Resend from this process. */
export function deliverInviteMailDryRun(mail: InviteMail): void {
  assertInviteMailFrom(mail.from);
  mailSink?.(mail);
}
