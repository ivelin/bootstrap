/**
 * Hosted-MCP identity: pirin.ai access token → whoami + company labels.
 * Public OS tools do not use this module. No company-state. No boards.
 * Product path is a JWT issued by pirin.ai login — not a copy-paste bos_ token.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { isJwtAccessToken } from "./oauth.js";

export type HostedWhoami = {
  authenticated: boolean;
  email?: string;
  labels: string[];
  reason?: string;
  note?: string;
  identityStore?: "supabase" | "memory" | "unset";
};

export type MenteeRecord = {
  id: string;
  email: string;
  authUserId: string | null;
  labels: string[];
  tokenHashes: string[];
};

export interface IdentityStore {
  readonly kind: "supabase" | "memory";
  whoami(token: string | undefined): Promise<HostedWhoami>;
}

export const IVELIN_SEED_EMAIL = "ivelin@pirin.ai";
export const IVELIN_SEED_LABELS = ["pirin", "totbox", "zk0"] as const;

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function parseBearerToken(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return undefined;
  const token = match[1].trim();
  return token.length >= 16 ? token : undefined;
}

export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Mirrors SQL: mentees_select_own / labels_select_own. */
export function rlsVisibleMentees(
  rows: MenteeRecord[],
  actorAuthUserId: string | null,
): MenteeRecord[] {
  if (!actorAuthUserId) return [];
  return rows.filter((row) => row.authUserId === actorAuthUserId);
}

export function rlsVisibleLabels(
  rows: MenteeRecord[],
  actorAuthUserId: string | null,
): string[] {
  return rlsVisibleMentees(rows, actorAuthUserId).flatMap((row) => [...row.labels].sort());
}

export function whoamiFromMentee(mentee: MenteeRecord | undefined, store: HostedWhoami["identityStore"]): HostedWhoami {
  if (!mentee) {
    return {
      authenticated: false,
      labels: [],
      reason: "invalid_or_revoked_token",
      identityStore: store,
    };
  }
  return {
    authenticated: true,
    email: mentee.email,
    labels: [...mentee.labels].sort(),
    note: "Labels only. Not boards. Not company-state. Not ~/.bootstrap-os.",
    identityStore: store,
  };
}

export class MemoryIdentityStore implements IdentityStore {
  readonly kind = "memory" as const;
  constructor(private readonly mentees: MenteeRecord[]) {}

  async whoami(token: string | undefined): Promise<HostedWhoami> {
    if (!token || token.length < 16) {
      return {
        authenticated: false,
        labels: [],
        reason: "missing_or_short_token",
        identityStore: "memory",
      };
    }
    const digest = hashMcpToken(token);
    const mentee = this.mentees.find((row) => row.tokenHashes.some((h) => hashesEqual(h, digest)));
    return whoamiFromMentee(mentee, "memory");
  }
}

export function ivelinMemoryFixture(token: string): MemoryIdentityStore {
  return new MemoryIdentityStore([
    {
      id: "mentee-ivelin",
      email: IVELIN_SEED_EMAIL,
      authUserId: "auth-ivelin",
      labels: [...IVELIN_SEED_LABELS],
      tokenHashes: [hashMcpToken(token)],
    },
    {
      id: "mentee-other",
      email: "other@example.test",
      authUserId: "auth-other",
      labels: ["secret-other"],
      tokenHashes: [hashMcpToken("bos_other_token_fixture_xx")],
    },
  ]);
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

export function identityEnvConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export class SupabaseIdentityStore implements IdentityStore {
  readonly kind = "supabase" as const;
  constructor(
    private readonly url: string,
    private readonly anonKey: string,
  ) {}

  async whoami(token: string | undefined): Promise<HostedWhoami> {
    if (!token || token.length < 16) {
      return {
        authenticated: false,
        labels: [],
        reason: "missing_or_short_token",
        identityStore: "supabase",
      };
    }
    if (!isJwtAccessToken(token)) {
      return {
        authenticated: false,
        labels: [],
        reason: "not_a_pirin_access_token",
        identityStore: "supabase",
      };
    }
    const base = this.url.replace(/\/+$/, "");
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userRes.ok) {
      return {
        authenticated: false,
        labels: [],
        reason: "invalid_or_revoked_token",
        identityStore: "supabase",
      };
    }
    const user = (await userRes.json()) as { email?: string };
    const labelsRes = await fetch(`${base}/rest/v1/rpc/bootstrap_mcp_my_labels`, {
      method: "POST",
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    let labels: string[] = [];
    if (labelsRes.ok) {
      const raw = (await labelsRes.json()) as { labels?: unknown };
      labels = Array.isArray(raw.labels) ? raw.labels.map(String).sort() : [];
    }
    return {
      authenticated: true,
      email: user.email,
      labels,
      note: "Labels only. Not boards. Not company-state. Not ~/.bootstrap-os.",
      identityStore: "supabase",
    };
  }
}

export function createIdentityStore(): IdentityStore | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  return new SupabaseIdentityStore(url, key);
}

let testStore: IdentityStore | null | undefined;

/** Test hook. Pass null to force unset. Omit to restore production lookup. */
export function setIdentityStoreForTests(store: IdentityStore | null | undefined): void {
  testStore = store;
}

export function resolveIdentityStore(): IdentityStore | null {
  if (testStore !== undefined) return testStore;
  return createIdentityStore();
}

export async function resolveHostedWhoami(authorizationHeader: string | null | undefined): Promise<HostedWhoami> {
  const token = parseBearerToken(authorizationHeader);
  const store = resolveIdentityStore();
  if (!store) {
    return {
      authenticated: false,
      labels: [],
      reason: token ? "identity_store_unset" : "missing_or_short_token",
      identityStore: "unset",
      note: "Public OS tools stay open. Gated tools need a pirin.ai access token and this host's Supabase env.",
    };
  }
  return store.whoami(token);
}
