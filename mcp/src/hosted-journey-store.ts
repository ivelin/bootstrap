/**
 * Hosted 0-1 board: membership (company labels) is who can see a company.
 * Lazy-ensure company + default idea. Production persists via SECURITY DEFINER RPCs.
 * Preview never attaches. Tests inject this store.
 */
import { hostedProdIdentityAllowed } from "./identity.js";
import type { JourneyActor } from "./journey-auth.js";
import {
  MemoryJourneyStore,
  normalizeSlug,
  type GateDecision,
  type JourneyStore,
  type Scoreboard,
} from "./journey.js";

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

export class HostedMembershipJourneyStore implements JourneyStore {
  readonly kind = "memory" as const;
  private readonly inner = new MemoryJourneyStore([], [], [], [], []);

  constructor(private readonly labelsFor: (actor: JourneyActor) => string[]) {
    this.inner.allowMemberComments = true;
  }

  actorOnAllowlist(actor: JourneyActor): boolean {
    return this.labelsFor(actor).length > 0;
  }

  private held(actor: JourneyActor, slug: string): boolean {
    return this.labelsFor(actor).includes(normalizeSlug(slug));
  }

  async getJourney(
    actor: JourneyActor,
    query: { companySlug?: string; ideaSlug?: string; expandMeetingDoc?: boolean },
  ): Promise<unknown> {
    if (!actor.authenticated || !actor.principal) {
      return { ok: false, error: "unauthenticated" };
    }
    if (!query.companySlug) {
      return { ok: false, error: "company required" };
    }
    const slug = normalizeSlug(query.companySlug);
    if (!this.held(actor, slug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(slug, actor);
    const result = (await this.inner.getJourney(actor, { ...query, companySlug: slug })) as {
      ok?: boolean;
      acl?: Array<{ principal: string; role: string }>;
      owners?: Array<{ principal: string; role: string }>;
    };
    if (result?.ok && Array.isArray(result.acl)) {
      result.owners = result.acl.map((row) => ({ principal: row.principal, role: row.role }));
    }
    return result;
  }

  async putJourney(
    actor: JourneyActor,
    input: Parameters<JourneyStore["putJourney"]>[1],
  ): Promise<unknown> {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(input.companySlug, actor);
    return this.inner.putJourney(actor, {
      ...input,
      ideaSlug: input.ideaSlug || "default",
    });
  }

  async postComment(
    actor: JourneyActor,
    input: Parameters<JourneyStore["postComment"]>[1],
  ): Promise<unknown> {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(input.companySlug, actor);
    return this.inner.postComment(actor, { ...input, ideaSlug: input.ideaSlug || "default" });
  }

  async changeAcl(actor: JourneyActor, input: Parameters<JourneyStore["changeAcl"]>[1]) {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(input.companySlug, actor);
    return this.inner.changeAcl(actor, input);
  }

  async subscribeBoard(actor: JourneyActor, input: Parameters<JourneyStore["subscribeBoard"]>[1]) {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(input.companySlug, actor);
    return this.inner.subscribeBoard(actor, input);
  }

  async unsubscribeBoard(
    actor: JourneyActor,
    input: Parameters<JourneyStore["unsubscribeBoard"]>[1],
  ) {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    return this.inner.unsubscribeBoard(actor, input);
  }

  async listSubscribers(
    actor: JourneyActor,
    input: Parameters<JourneyStore["listSubscribers"]>[1],
  ) {
    if (!this.held(actor, input.companySlug)) {
      return { ok: false, error: "company not visible" };
    }
    this.inner.ensureCompanyForMember(input.companySlug, actor);
    return this.inner.listSubscribers(actor, input);
  }
}

export class SupabaseJourneyStore implements JourneyStore {
  readonly kind = "supabase" as const;

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly accessToken: string,
  ) {}

  actorOnAllowlist(actor: JourneyActor): boolean {
    return Boolean(actor.authenticated && (actor.email || actor.sub));
  }

  private async rpc(name: string, body: Record<string, unknown>): Promise<{ raw: unknown } | { error: string }> {
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
    let raw: unknown = text;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = text;
    }
    if (!res.ok) return { error: `journey_rpc_failed:${res.status}` };
    return { raw };
  }

  async getJourney(
    _actor: JourneyActor,
    query: { companySlug?: string; ideaSlug?: string; expandMeetingDoc?: boolean },
  ): Promise<unknown> {
    if (!query.companySlug) return { ok: false, error: "company required" };
    const hit = await this.rpc("bootstrap_os_get_journey", {
      p_company: query.companySlug,
      p_idea: query.ideaSlug ?? null,
    });
    if ("error" in hit) return { ok: false, error: hit.error };
    return hit.raw;
  }

  async putJourney(
    _actor: JourneyActor,
    input: {
      companySlug: string;
      ideaSlug?: string;
      journeyPhase?: number;
      loopStage?: number;
      currentGate?: GateDecision;
      scoreboard?: Scoreboard;
      constraintThisWeek?: string;
      why: string;
      founderYes: boolean;
      founderWrittenDecision?: string;
      client?: string;
    },
  ): Promise<unknown> {
    const hit = await this.rpc("bootstrap_os_put_journey", {
      p_company: input.companySlug,
      p_idea: input.ideaSlug ?? "default",
      p_journey_phase: input.journeyPhase ?? null,
      p_loop_stage: input.loopStage ?? null,
      p_current_gate: input.currentGate ?? null,
      p_constraint: input.constraintThisWeek ?? null,
      p_why: input.why,
      p_founder_yes: input.founderYes,
      p_founder_written_decision: input.founderWrittenDecision ?? null,
    });
    if ("error" in hit) return { ok: false, error: hit.error };
    return hit.raw;
  }

  async postComment(
    _actor: JourneyActor,
    input: { companySlug: string; ideaSlug?: string; body: string; client?: string },
  ): Promise<unknown> {
    const hit = await this.rpc("bootstrap_os_post_comment", {
      p_company: input.companySlug,
      p_idea: input.ideaSlug ?? "default",
      p_body: input.body,
    });
    if ("error" in hit) return { ok: false, error: hit.error };
    return hit.raw;
  }

  async changeAcl() {
    return { ok: false, error: "not in this slice" };
  }
  async subscribeBoard() {
    return { ok: false, error: "not in this slice" };
  }
  async unsubscribeBoard() {
    return { ok: false, error: "not in this slice" };
  }
  async listSubscribers() {
    return { ok: false, error: "not in this slice" };
  }
}

export function createJourneyStore(accessToken?: string): JourneyStore | null {
  if (!hostedProdIdentityAllowed()) return null;
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key || !accessToken) return null;
  return new SupabaseJourneyStore(url, key, accessToken);
}
