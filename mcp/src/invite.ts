/**
 * Hosted MCP invite + accept (Grok-first, in-chat Accept).
 * Fail-closed allowlist: invite creates/unlocks mentee rows. OAuth alone is not enough.
 * First user stays a SQL insert — HOSTED_IDENTITY.md. Mail / QR / SMS are later.
 * Mail sender is not this repo. Optional in_chat outbox enqueue only. Never supabase-pirin-ai from PR CI.
 */
import { randomBytes } from "node:crypto";
import { hashMcpToken } from "./identity.js";

export const INVITE_TOKEN_PREFIX = "inv_";
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPANY_LABEL_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITE_ACCEPT_NOTE =
  "In-chat Accept. Shows who invited / to whom / company workspace. Not /bootstrap-os/login as the product path. Mail/QR/SMS later.";

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

export type InviteOk = {
  ok: true;
  card: AcceptInviteCard;
  queued: { channel: "in_chat"; id: string };
};

export type InviteFailReason =
  | "inviter_not_on_allowlist"
  | "invalid_email"
  | "invalid_label"
  | "label_not_held"
  | "invite_store_unset";

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
  | "invite_store_unset";

export type InviteResult = InviteOk | { ok: false; reason: InviteFailReason };
export type AcceptResult = AcceptOk | { ok: false; reason: AcceptFailReason };

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

export type InviteOutboxRow = {
  id: string;
  inviteId: string;
  channel: "in_chat";
  payload: Record<string, unknown>;
};

export interface InviteStore {
  readonly kind: "memory" | "pglite" | "supabase";
  inviteMember(actor: InviteActor, input: InviteCreateInput): Promise<InviteResult>;
  acceptInvite(actor: InviteActor, token: string): Promise<AcceptResult>;
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
    note: "In-chat Accept. Raw invite token is not stored on the outbox. Mail/QR/SMS later.",
  };
}

export function enqueueInviteInChat(inviteId: string, card: AcceptInviteCard): InviteOutboxRow {
  const row: InviteOutboxRow = {
    id: `out-${randomBytes(8).toString("hex")}`,
    inviteId,
    channel: "in_chat",
    payload: inviteOutboxPayload(card),
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
    this.outbox.push(queued);
    return { ok: true, card, queued: { channel: "in_chat", id: queued.id } };
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
}

export class PgliteInviteStore implements InviteStore {
  readonly kind = "pglite" as const;
  constructor(private readonly db: SqlClient) {}

  async inviteMember(actor: InviteActor, input: InviteCreateInput): Promise<InviteResult> {
    const inviterEmail = normalizeInviteEmail(actor.email ?? "");
    const inviteeEmail = normalizeInviteEmail(input.email);
    const companyLabel = normalizeCompanyLabel(input.companyLabel);
    if (!inviterEmail) return { ok: false, reason: "inviter_not_on_allowlist" };
    if (!inviteeEmail) return { ok: false, reason: "invalid_email" };
    if (!companyLabel) return { ok: false, reason: "invalid_label" };
    await this.db.exec("RESET ROLE");
    const inviter = (
      await this.db.query(
        "SELECT id, email FROM bootstrap_mcp_mentees WHERE email = $1 OR auth_user_id = $2",
        [inviterEmail, actor.sub ?? ""],
      )
    ).rows[0];
    if (!inviter) return { ok: false, reason: "inviter_not_on_allowlist" };
    const labels = (
      await this.db.query(
        "SELECT label FROM bootstrap_company_labels WHERE mentee_id = $1 ORDER BY label",
        [inviter.id],
      )
    ).rows.map((row) => String(row.label));
    const held = decideInviteCreate(labels, companyLabel);
    if (!held.ok) return held;
    const token = mintInviteToken();
    const now = inviteNow();
    const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
    const id = newId("inv");
    const card = buildAcceptCard({
      fromEmail: String(inviter.email),
      toEmail: inviteeEmail,
      companyWorkspace: companyLabel,
      inviteToken: token,
      expiresAt,
    });
    await this.db.query(
      `INSERT INTO bootstrap_mcp_invites
        (id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at, accepted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)`,
      [
        id,
        inviteeEmail,
        companyLabel,
        inviter.id,
        inviter.email,
        hashMcpToken(token),
        expiresAt,
        new Date(now).toISOString(),
      ],
    );
    const queued = enqueueInviteInChat(id, card);
    await this.db.query(
      `INSERT INTO bootstrap_mcp_invite_outbox (id, invite_id, channel, payload)
       VALUES ($1, $2, 'in_chat', $3::jsonb)`,
      [queued.id, id, JSON.stringify(queued.payload)],
    );
    return { ok: true, card, queued: { channel: "in_chat", id: queued.id } };
  }

  async acceptInvite(actor: InviteActor, token: string): Promise<AcceptResult> {
    const actorEmail = normalizeInviteEmail(actor.email ?? "");
    if (!actorEmail) return { ok: false, reason: "email_required" };
    if (!token || token.length < 16) return { ok: false, reason: "invite_not_found" };
    await this.db.exec("RESET ROLE");
    const found = (
      await this.db.query("SELECT * FROM bootstrap_mcp_invites WHERE token_hash = $1", [
        hashMcpToken(token),
      ])
    ).rows[0];
    const invite = found
      ? {
          id: String(found.id),
          inviteeEmail: String(found.invitee_email),
          companyLabel: String(found.company_label),
          invitedByMenteeId: String(found.invited_by_mentee_id),
          invitedByEmail: String(found.invited_by_email),
          tokenHash: String(found.token_hash),
          expiresAt:
            found.expires_at instanceof Date
              ? found.expires_at.toISOString()
              : String(found.expires_at),
          acceptedAt: found.accepted_at
            ? found.accepted_at instanceof Date
              ? found.accepted_at.toISOString()
              : String(found.accepted_at)
            : null,
          createdAt:
            found.created_at instanceof Date
              ? found.created_at.toISOString()
              : String(found.created_at),
        }
      : undefined;
    const decided = decideInviteAccept({ now: inviteNow(), actorEmail, invite });
    if (!decided.ok) return decided;
    const row = invite as InviteRow;
    await this.db.query(
      "UPDATE bootstrap_mcp_invites SET accepted_at = $1 WHERE id = $2 AND accepted_at IS NULL",
      [new Date(inviteNow()).toISOString(), row.id],
    );
    let mentee = (
      await this.db.query("SELECT id, email, auth_user_id FROM bootstrap_mcp_mentees WHERE email = $1", [
        row.inviteeEmail,
      ])
    ).rows[0];
    if (!mentee) {
      const menteeId = newId("mentee");
      await this.db.query(
        "INSERT INTO bootstrap_mcp_mentees (id, email, auth_user_id) VALUES ($1, $2, $3)",
        [menteeId, row.inviteeEmail, actor.sub ?? null],
      );
      mentee = { id: menteeId, email: row.inviteeEmail, auth_user_id: actor.sub ?? null };
    } else if (!mentee.auth_user_id && actor.sub) {
      await this.db.query(
        "UPDATE bootstrap_mcp_mentees SET auth_user_id = $1 WHERE id = $2 AND auth_user_id IS NULL",
        [actor.sub, mentee.id],
      );
    }
    await this.db.query(
      `INSERT INTO bootstrap_company_labels (id, mentee_id, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (mentee_id, label) DO NOTHING`,
      [newId("lbl"), mentee.id, row.companyLabel],
    );
    const labels = (
      await this.db.query(
        "SELECT label FROM bootstrap_company_labels WHERE mentee_id = $1 ORDER BY label",
        [mentee.id],
      )
    ).rows.map((r) => String(r.label));
    return {
      ok: true,
      email: String(mentee.email),
      labels,
      companyWorkspace: row.companyLabel,
      note: "Allowlist + label bound. Labels only. Not boards. Not company-state.",
    };
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
 */
export class SupabaseInviteStore implements InviteStore {
  readonly kind = "supabase" as const;
  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly accessToken: string,
  ) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    const base = this.url.replace(/\/+$/, "");
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, reason: name === "bootstrap_mcp_invite_member" ? "invite_store_unset" : "invite_not_found" };
    }
    return res.json();
  }

  async inviteMember(_actor: InviteActor, input: InviteCreateInput): Promise<InviteResult> {
    const raw = (await this.rpc("bootstrap_mcp_invite_member", {
      p_email: input.email,
      p_company_label: input.companyLabel,
    })) as InviteResult;
    if (!raw || typeof raw !== "object" || !("ok" in raw)) {
      return { ok: false, reason: "invite_store_unset" };
    }
    return raw;
  }

  async acceptInvite(_actor: InviteActor, token: string): Promise<AcceptResult> {
    const raw = (await this.rpc("bootstrap_mcp_accept_invite", { p_token: token })) as AcceptResult;
    if (!raw || typeof raw !== "object" || !("ok" in raw)) {
      return { ok: false, reason: "invite_not_found" };
    }
    return raw;
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

export function inviteFailMessage(reason: InviteFailReason | AcceptFailReason): string {
  switch (reason) {
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
