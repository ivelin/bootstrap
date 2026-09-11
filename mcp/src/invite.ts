/**
 * Hosted MCP invite + accept (Grok-first, in-chat Accept).
 * Fail-closed allowlist: invite creates/unlocks mentee rows. OAuth alone is not enough.
 * First user stays a SQL insert — HOSTED_IDENTITY.md.
 * Outsider mail: enqueue email outbox. pirin-ai Resend From bootstrap@pirin.ai after Cos yes.
 * Never supabase-pirin-ai from PR CI.
 */
import { randomBytes } from "node:crypto";
import { hashMcpToken } from "./identity.js";
import {
  INVITE_MAIL_FROM,
  INVITE_MAIL_NOTE,
  inviteSignupUrl,
} from "./invite-mail.js";

export const INVITE_TOKEN_PREFIX = "inv_";
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPANY_LABEL_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITE_ACCEPT_NOTE =
  "In-chat Accept. Shows who invited / to whom / company workspace. Not /bootstrap-os/login as the product path. Outsider mail (bootstrap@) is the support path when the invitee has no JWT yet.";

export const INVITE_IN_CHAT_OUTBOX_NOTE =
  "In-chat Accept. Raw invite token is not stored on this channel.";

export type InviteActor = {
  email?: string;
  sub?: string;
  labels?: string[];
};

export type InviteCreateInput = {
  email: string;
  companyLabel: string;
};

export type AcceptInviteCard = {
  card: "accept_invite";
  shape: "DraftExternalMessage";
  from: { email: string };
  to: { email: string };
  companyWorkspace: string;
  action: "Accept";
  inviteToken: string;
  expiresAt: string;
  tool: "accept_invite";
  note: string;
};

export type InviteSignupCard = {
  card: "invite_signup";
  shape: "DraftExternalMessage";
  from: { email: typeof INVITE_MAIL_FROM };
  to: { email: string };
  companyWorkspace: string;
  inviterEmail: string;
  action: "Create account";
  signupUrl: string;
  qrPayload: string;
  inviteToken: string;
  expiresAt: string;
  note: string;
};

export type InviteOk = {
  ok: true;
  card: AcceptInviteCard;
  authCard: InviteSignupCard;
  queued: { channel: "in_chat"; id: string };
  queuedMail: { channel: "email"; id: string; from: typeof INVITE_MAIL_FROM };
};

export type InviteFailReason =
  | "inviter_not_on_allowlist"
  | "invalid_email"
  | "invalid_label"
  | "label_not_held"
  | "invite_store_unset"
  | "invite_rpc_failed";

export type AcceptOk = {
  ok: true;
  email: string;
  labels: string[];
  companyWorkspace: string;
  note: string;
};

export type AcceptFailReason =
  | "invite_not_found"
  | "invite_expired"
  | "invite_already_used"
  | "invite_email_mismatch"
  | "email_required"
  | "invite_store_unset"
  | "invite_rpc_failed";

/** PostgREST / HTTP failure. Not “store unset” — that is missing env/client only. */
export type InviteRpcFail = {
  ok: false;
  reason: "invite_rpc_failed";
  status: number;
  body: string;
};

export type InviteFail = { ok: false; reason: InviteFailReason } | InviteRpcFail;
export type AcceptFail = { ok: false; reason: AcceptFailReason } | InviteRpcFail;

export type InviteResult = InviteOk | InviteFail;
export type AcceptResult = AcceptOk | AcceptFail;

export const INVITE_RPC_BODY_CLIP = 800;

export function clipInviteRpcBody(text: string): string {
  const clipped = text.replace(/\s+/g, " ").trim();
  if (!clipped) return "";
  return clipped.length > INVITE_RPC_BODY_CLIP ? `${clipped.slice(0, INVITE_RPC_BODY_CLIP)}…` : clipped;
}

export function inviteRpcFailed(status: number, body: string): InviteRpcFail {
  return { ok: false, reason: "invite_rpc_failed", status, body: clipInviteRpcBody(body) };
}

export function parseInviteRpcJson(text: string): unknown {
  if (!text) return null;
  try {
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        /* keep the string — PostgREST sometimes wraps jsonb */
      }
    }
    return parsed;
  } catch {
    return text;
  }
}

function isInviteRpcFail(raw: unknown): raw is InviteRpcFail {
  return Boolean(raw && typeof raw === "object" && (raw as InviteRpcFail).reason === "invite_rpc_failed");
}

function coerceRpcResult<T extends { ok: boolean }>(raw: unknown, status: number): T | InviteRpcFail {
  if (isInviteRpcFail(raw)) return raw;
  if (raw && typeof raw === "object" && "ok" in raw) return raw as T;
  const body = typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);
  return inviteRpcFailed(status, body);
}

export type InviteRow = {
  id: string;
  inviteeEmail: string;
  companyLabel: string;
  invitedByMenteeId: string;
  invitedByEmail: string;
  tokenHash: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type InviteOutboxChannel = "in_chat" | "email";

export type InviteOutboxRow = {
  id: string;
  inviteId: string;
  channel: InviteOutboxChannel;
  payload: Record<string, unknown>;
  deliveredAt?: string | null;
};

export type VerifyInviteOk = {
  ok: true;
  invitee_email: string;
  company_label: string;
  inviter_email: string;
};

/** Opaque. No reason / email / label. Callers must not enumerate. */
export type VerifyInviteFail = { ok: false };

export type VerifyInviteResult = VerifyInviteOk | VerifyInviteFail;

export interface InviteStore {
  readonly kind: "memory" | "pglite" | "supabase";
  inviteMember(actor: InviteActor, input: InviteCreateInput): Promise<InviteResult>;
  acceptInvite(actor: InviteActor, token: string): Promise<AcceptResult>;
  verifyInvite(token: string): Promise<VerifyInviteResult>;
}

export type InviteEnqueueHook = (row: InviteOutboxRow) => void;

let enqueueHook: InviteEnqueueHook | undefined;
let nowFn = () => Date.now();
let testStore: InviteStore | null | undefined;

/** Test hook. Pass null to force unset. Omit to restore production lookup. */
export function setInviteStoreForTests(store: InviteStore | null | undefined): void {
  testStore = store;
}

export function setInviteEnqueueHook(hook?: InviteEnqueueHook): void {
  enqueueHook = hook;
}

export function setInviteClockForTests(fn?: () => number): void {
  nowFn = fn ?? (() => Date.now());
}

export function inviteNow(): number {
  return nowFn();
}

export function mintInviteToken(): string {
  return `${INVITE_TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function normalizeInviteEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizeCompanyLabel(raw: string): string | null {
  const label = raw.trim().toLowerCase();
  if (!COMPANY_LABEL_RE.test(label)) return null;
  return label;
}

export function decideInviteCreate(
  inviterLabels: string[] | undefined,
  companyLabel: string,
): { ok: true } | { ok: false; reason: Extract<InviteFailReason, "label_not_held"> } {
  if (!inviterLabels?.includes(companyLabel)) {
    return { ok: false, reason: "label_not_held" };
  }
  return { ok: true };
}

export function decideInviteAccept(input: {
  now: number;
  actorEmail?: string;
  invite: InviteRow | undefined;
}): { ok: true } | { ok: false; reason: AcceptFailReason } {
  if (!input.actorEmail) {
    return { ok: false, reason: "email_required" };
  }
  if (!input.invite) {
    return { ok: false, reason: "invite_not_found" };
  }
  if (input.invite.acceptedAt) {
    return { ok: false, reason: "invite_already_used" };
  }
  if (Date.parse(input.invite.expiresAt) <= input.now) {
    return { ok: false, reason: "invite_expired" };
  }
  if (input.invite.inviteeEmail !== input.actorEmail) {
    return { ok: false, reason: "invite_email_mismatch" };
  }
  return { ok: true };
}

export function decideInviteVerify(input: {
  now: number;
  invite: InviteRow | undefined;
}): VerifyInviteResult {
  if (!input.invite) return { ok: false };
  if (input.invite.acceptedAt) return { ok: false };
  if (Date.parse(input.invite.expiresAt) <= input.now) return { ok: false };
  return {
    ok: true,
    invitee_email: input.invite.inviteeEmail,
    company_label: input.invite.companyLabel,
    inviter_email: input.invite.invitedByEmail,
  };
}

export function buildAcceptCard(input: {
  fromEmail: string;
  toEmail: string;
  companyWorkspace: string;
  inviteToken: string;
  expiresAt: string;
}): AcceptInviteCard {
  return {
    card: "accept_invite",
    shape: "DraftExternalMessage",
    from: { email: input.fromEmail },
    to: { email: input.toEmail },
    companyWorkspace: input.companyWorkspace,
    action: "Accept",
    inviteToken: input.inviteToken,
    expiresAt: input.expiresAt,
    tool: "accept_invite",
    note: INVITE_ACCEPT_NOTE,
  };
}

export function buildSignupAuthCard(input: {
  inviterEmail: string;
  toEmail: string;
  companyWorkspace: string;
  inviteToken: string;
  expiresAt: string;
}): InviteSignupCard {
  const signupUrl = inviteSignupUrl(input.inviteToken);
  return {
    card: "invite_signup",
    shape: "DraftExternalMessage",
    from: { email: INVITE_MAIL_FROM },
    to: { email: input.toEmail },
    companyWorkspace: input.companyWorkspace,
    inviterEmail: input.inviterEmail,
    action: "Create account",
    signupUrl,
    qrPayload: signupUrl,
    inviteToken: input.inviteToken,
    expiresAt: input.expiresAt,
    note: INVITE_MAIL_NOTE,
  };
}

export function inviteOutboxPayload(card: AcceptInviteCard): Record<string, unknown> {
  return {
    card: card.card,
    shape: card.shape,
    from: card.from,
    to: card.to,
    companyWorkspace: card.companyWorkspace,
    action: card.action,
    tool: card.tool,
    expiresAt: card.expiresAt,
    inviteToken: null,
    note: INVITE_IN_CHAT_OUTBOX_NOTE,
  };
}

export function inviteEmailOutboxPayload(card: AcceptInviteCard): Record<string, unknown> {
  const signupUrl = inviteSignupUrl(card.inviteToken);
  return {
    channel: "email",
    mailFrom: INVITE_MAIL_FROM,
    from: card.from,
    to: card.to,
    companyWorkspace: card.companyWorkspace,
    signupUrl,
    qrPayload: signupUrl,
    inviteToken: card.inviteToken,
    expiresAt: card.expiresAt,
    note: "Mailer handoff. pirin-ai Resend From bootstrap@pirin.ai only. Token is on this channel so the poller can send ?invite=. in_chat never stores the token. Cos yes before prod send.",
  };
}

export function enqueueInviteInChat(inviteId: string, card: AcceptInviteCard): InviteOutboxRow {
  const row: InviteOutboxRow = {
    id: `out-${randomBytes(8).toString("hex")}`,
    inviteId,
    channel: "in_chat",
    payload: inviteOutboxPayload(card),
    deliveredAt: null,
  };
  enqueueHook?.(row);
  return row;
}

export function enqueueInviteEmail(inviteId: string, card: AcceptInviteCard): InviteOutboxRow {
  const row: InviteOutboxRow = {
    id: `mail-${randomBytes(8).toString("hex")}`,
    inviteId,
    channel: "email",
    payload: inviteEmailOutboxPayload(card),
    deliveredAt: null,
  };
  enqueueHook?.(row);
  return row;
}

type SqlClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  exec: (sql: string) => Promise<unknown>;
};

function newId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

export class MemoryInviteStore implements InviteStore {
  readonly kind = "memory" as const;
  readonly invites: InviteRow[] = [];
  readonly outbox: InviteOutboxRow[] = [];
  private readonly mentees: Array<{
    id: string;
    email: string;
    authUserId: string | null;
    labels: string[];
  }>;

  constructor(
    mentees: Array<{
      id: string;
      email: string;
      authUserId: string | null;
      labels: string[];
    }>,
  ) {
    this.mentees = mentees.map((row) => ({ ...row, labels: [...row.labels] }));
  }

  menteeByEmail(email: string) {
    return this.mentees.find((row) => row.email === email);
  }

  async inviteMember(actor: InviteActor, input: InviteCreateInput): Promise<InviteResult> {
    const inviterEmail = normalizeInviteEmail(actor.email ?? "");
    const inviteeEmail = normalizeInviteEmail(input.email);
    const companyLabel = normalizeCompanyLabel(input.companyLabel);
    if (!inviterEmail) return { ok: false, reason: "inviter_not_on_allowlist" };
    if (!inviteeEmail) return { ok: false, reason: "invalid_email" };
    if (!companyLabel) return { ok: false, reason: "invalid_label" };
    const inviter = this.mentees.find((row) => row.email === inviterEmail);
    if (!inviter) return { ok: false, reason: "inviter_not_on_allowlist" };
    const held = decideInviteCreate(inviter.labels, companyLabel);
    if (!held.ok) return held;
    const token = mintInviteToken();
    const now = inviteNow();
    const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
    const id = newId("inv");
    const card = buildAcceptCard({
      fromEmail: inviter.email,
      toEmail: inviteeEmail,
      companyWorkspace: companyLabel,
      inviteToken: token,
      expiresAt,
    });
    this.invites.push({
      id,
      inviteeEmail,
      companyLabel,
      invitedByMenteeId: inviter.id,
      invitedByEmail: inviter.email,
      tokenHash: hashMcpToken(token),
      expiresAt,
      acceptedAt: null,
      createdAt: new Date(now).toISOString(),
    });
    const queued = enqueueInviteInChat(id, card);
    const queuedMail = enqueueInviteEmail(id, card);
    this.outbox.push(queued, queuedMail);
    return {
      ok: true,
      card,
      authCard: buildSignupAuthCard({
        inviterEmail: inviter.email,
        toEmail: inviteeEmail,
        companyWorkspace: companyLabel,
        inviteToken: token,
        expiresAt,
      }),
      queued: { channel: "in_chat", id: queued.id },
      queuedMail: { channel: "email", id: queuedMail.id, from: INVITE_MAIL_FROM },
    };
  }

  async acceptInvite(actor: InviteActor, token: string): Promise<AcceptResult> {
    const actorEmail = normalizeInviteEmail(actor.email ?? "");
    const digest = token?.length >= 16 ? hashMcpToken(token) : "";
    const invite = this.invites.find((row) => row.tokenHash === digest);
    const decided = decideInviteAccept({ now: inviteNow(), actorEmail: actorEmail ?? undefined, invite });
    if (!decided.ok) return decided;
    const row = invite as InviteRow;
    row.acceptedAt = new Date(inviteNow()).toISOString();
    let mentee = this.mentees.find((m) => m.email === row.inviteeEmail);
    if (!mentee) {
      mentee = {
        id: newId("mentee"),
        email: row.inviteeEmail,
        authUserId: actor.sub ?? null,
        labels: [],
      };
      this.mentees.push(mentee);
    } else if (!mentee.authUserId && actor.sub) {
      mentee.authUserId = actor.sub;
    }
    if (!mentee.labels.includes(row.companyLabel)) mentee.labels.push(row.companyLabel);
    mentee.labels.sort();
    return {
      ok: true,
      email: mentee.email,
      labels: [...mentee.labels],
      companyWorkspace: row.companyLabel,
      note: "Allowlist + label bound. Labels only. Not boards. Not company-state.",
    };
  }

  async verifyInvite(token: string): Promise<VerifyInviteResult> {
    const digest = token?.length >= 16 ? hashMcpToken(token) : "";
    const invite = this.invites.find((row) => row.tokenHash === digest);
    return decideInviteVerify({ now: inviteNow(), invite });
  }
}

/**
 * Isolated PGlite adapter. Calls the same RPC names as prod (`bootstrap_mcp_invite_member` /
 * `bootstrap_mcp_accept_invite`) on mcp/test/pglite/identity-schema.sql. Never supabase-pirin-ai.
 */
export class PgliteInviteStore implements InviteStore {
  readonly kind = "pglite" as const;
  constructor(private readonly db: SqlClient) {}

  private async setActor(actor: InviteActor): Promise<void> {
    await this.db.exec("RESET ROLE");
    await this.db.query("SELECT set_config('app.auth_uid', $1, false)", [actor.sub ?? ""]);
    await this.db.query("SELECT set_config('app.auth_email', $1, false)", [actor.email ?? ""]);
  }

  async inviteMember(actor: InviteActor, input: InviteCreateInput): Promise<InviteResult> {
    await this.setActor(actor);
    const body = (
      await this.db.query("SELECT bootstrap_mcp_invite_member($1, $2) AS body", [
        input.email,
        input.companyLabel,
      ])
    ).rows[0]?.body;
    if (!body || typeof body !== "object" || !("ok" in body)) {
      return { ok: false, reason: "invite_store_unset" };
    }
    return body as InviteResult;
  }

  async acceptInvite(actor: InviteActor, token: string): Promise<AcceptResult> {
    await this.setActor(actor);
    const body = (await this.db.query("SELECT bootstrap_mcp_accept_invite($1) AS body", [token]))
      .rows[0]?.body;
    if (!body || typeof body !== "object" || !("ok" in body)) {
      return { ok: false, reason: "invite_not_found" };
    }
    return body as AcceptResult;
  }

  async verifyInvite(token: string): Promise<VerifyInviteResult> {
    const body = (await this.db.query("SELECT bootstrap_mcp_verify_invite($1) AS body", [token]))
      .rows[0]?.body;
    if (!body || typeof body !== "object" || !("ok" in body)) {
      return { ok: false };
    }
    if ((body as VerifyInviteResult).ok !== true) return { ok: false };
    return body as VerifyInviteOk;
  }
}

function supabaseUrl(): string | undefined {
  return process.env.BOOTSTRAP_SUPABASE_URL || process.env.SUPABASE_URL || undefined;
}

function supabaseAnonKey(): string | undefined {
  return (
    process.env.BOOTSTRAP_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

/**
 * Prod adapter. Calls SECURITY DEFINER RPCs. PR agents must not live-probe supabase-pirin-ai.
 * HTTP / schema-cache / SQL failures stay invite_rpc_failed (status + body).
 * invite_store_unset is only createInviteStore() === null (url / anon key / access token missing).
 */
export class SupabaseInviteStore implements InviteStore {
  readonly kind = "supabase" as const;
  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly accessToken: string,
  ) {}

  private async rpc(
    name: string,
    body: Record<string, unknown>,
  ): Promise<{ status: number; raw: unknown } | InviteRpcFail> {
    const base = this.url.replace(/\/+$/, "");
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (!res.ok) return inviteRpcFailed(res.status, text);
    return { status: res.status, raw: parseInviteRpcJson(text) };
  }

  async inviteMember(_actor: InviteActor, input: InviteCreateInput): Promise<InviteResult> {
    const hit = await this.rpc("bootstrap_mcp_invite_member", {
      p_email: input.email,
      p_company_label: input.companyLabel,
    });
    if (isInviteRpcFail(hit)) return hit;
    return coerceRpcResult<InviteResult>(hit.raw, hit.status);
  }

  async acceptInvite(_actor: InviteActor, token: string): Promise<AcceptResult> {
    const hit = await this.rpc("bootstrap_mcp_accept_invite", { p_token: token });
    if (isInviteRpcFail(hit)) return hit;
    return coerceRpcResult<AcceptResult>(hit.raw, hit.status);
  }

  async verifyInvite(token: string): Promise<VerifyInviteResult> {
    const hit = await this.rpc("bootstrap_mcp_verify_invite", { p_token: token });
    if (isInviteRpcFail(hit)) return { ok: false };
    const raw = hit.raw;
    if (raw && typeof raw === "object" && (raw as VerifyInviteResult).ok === true) {
      return raw as VerifyInviteOk;
    }
    return { ok: false };
  }
}

export function createInviteStore(accessToken?: string): InviteStore | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key || !accessToken) return null;
  return new SupabaseInviteStore(url, key, accessToken);
}

export function resolveInviteStore(accessToken?: string): InviteStore | null {
  if (testStore !== undefined) return testStore;
  return createInviteStore(accessToken);
}

export type InviteFailMessageInput =
  | InviteFailReason
  | AcceptFailReason
  | { reason: InviteFailReason | AcceptFailReason; status?: number; body?: string };

export function inviteFailMessage(input: InviteFailMessageInput): string {
  const fail = typeof input === "string" ? { reason: input } : input;
  switch (fail.reason) {
    case "inviter_not_on_allowlist":
      return "Only an allowlisted founder or authorized mentee may invite.";
    case "invalid_email":
      return "Invite email is invalid.";
    case "invalid_label":
      return "Company workspace label must be a slug (a-z, 0-9, _-).";
    case "label_not_held":
      return "Inviter does not hold that company workspace label.";
    case "invite_store_unset":
      return "Invite store unset. Cos applies the invite migration on rebuild — never from a PR agent.";
    case "invite_rpc_failed": {
      const status = "status" in fail && fail.status != null ? fail.status : "?";
      const body = "body" in fail && fail.body ? fail.body : "empty body";
      return `Invite RPC failed (HTTP ${status}): ${body}`;
    }
    case "invite_not_found":
      return "Invite rejected.";
    case "invite_expired":
      return "Invite rejected.";
    case "invite_already_used":
      return "Invite rejected.";
    case "invite_email_mismatch":
      return "Invite rejected.";
    case "email_required":
      return "Accept needs a pirin.ai access token whose email matches the invite.";
    default:
      return "Invite rejected.";
  }
}
