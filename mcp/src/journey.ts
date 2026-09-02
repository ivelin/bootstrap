/**
 * FAST 0-1 journey control plane: company and idea are separate.
 * Clocks are enums. Scoreboard is versioned jsonb. Views are generated, not stored.
 * Research/traces stay local — do not lift ~/.bootstrap-os.
 */
import { JOURNEY_PHASES, LOOP_STAGES } from "./constants.js";
import type { JourneyAclRole, JourneyActor } from "./journey-auth.js";

export const SCOREBOARD_SCHEMA_VERSION = 1;
/** Short fluid text on the idea. Not a clock. Not tickets. */
export const CONSTRAINT_THIS_WEEK_MAX = 280;

export type GateDecision = "advance" | "iterate" | "hold" | "kill";

export const GATE_DECISIONS: readonly GateDecision[] = [
  "advance",
  "iterate",
  "hold",
  "kill",
] as const;

export type Scoreboard = {
  schema_version: number;
  hypothesis?: string;
  readyForHumanEyes?: { status: "unknown" | "blocked" | "green" };
  autonomyPosture?: "strict" | "auto" | "dangerous";
  openQuestions?: string[];
  lastAction?: string;
  progress?: string[];
  challenges?: string[];
  helpNeeded?: string[];
  /** Fluid. Where help is required this week. Not a clock. Not tickets. */
  constraint_this_week?: string;
};

export type CompanyRow = {
  id: string;
  slug: string;
  label: string;
};

export type AclRow = {
  companyId: string;
  principal: string;
  principalKind: "email" | "sub";
  role: JourneyAclRole;
};

export type IdeaRow = {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  journeyPhase: number;
  loopStage: number;
  currentGate: GateDecision;
  scoreboard: Scoreboard;
};

export type GateEventRow = {
  id: string;
  ideaId: string;
  action: GateDecision;
  at: string;
  why: string;
  who: string;
};

export type CommentRow = {
  id: string;
  ideaId: string;
  body: string;
  at: string;
  who: string;
};

export type AuditEventRow = {
  id: string;
  companyId: string;
  ideaId: string | null;
  who: string;
  at: string;
  client: string;
  whatChanged: Record<string, unknown>;
};

export function isGateDecision(value: string): value is GateDecision {
  return (GATE_DECISIONS as readonly string[]).includes(value);
}

export function isJourneyPhase(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 9;
}

export function isLoopStage(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 7;
}

export function defaultScoreboard(): Scoreboard {
  return {
    schema_version: SCOREBOARD_SCHEMA_VERSION,
    readyForHumanEyes: { status: "unknown" },
    autonomyPosture: "strict",
    openQuestions: [],
    constraint_this_week: "",
  };
}

export function constraintThisWeekOf(idea: IdeaRow): string {
  const raw = idea.scoreboard.constraint_this_week;
  return typeof raw === "string" ? raw.trim() : "";
}

export function normalizeConstraintThisWeek(
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (value == null) {
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "constraint_this_week is short text, not a clock" };
  }
  const trimmed = value.trim();
  if (trimmed.length > CONSTRAINT_THIS_WEEK_MAX) {
    return { ok: false, error: `constraint_this_week is short text (${CONSTRAINT_THIS_WEEK_MAX})` };
  }
  return { ok: true, value: trimmed };
}

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

/** "CoreHaul" or "CoreHaul / last-mile" — company vs idea, not a composite key. */
export function parseJourneyQuery(input: {
  q?: string;
  company?: string;
  idea?: string;
}): { companySlug?: string; ideaSlug?: string } {
  let companySlug = input.company ? normalizeSlug(input.company) : undefined;
  let ideaSlug = input.idea ? normalizeSlug(input.idea) : undefined;
  const q = input.q?.trim();
  if (q) {
    const parts = q.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts[0] && !companySlug) companySlug = normalizeSlug(parts[0]);
    if (parts[1] && !ideaSlug) ideaSlug = normalizeSlug(parts[1]);
  }
  return { companySlug, ideaSlug };
}

export function actorMatchesAcl(actor: JourneyActor, row: AclRow): boolean {
  if (!actor.authenticated) return false;
  if (row.principalKind === "email") {
    return Boolean(actor.email && actor.email === row.principal);
  }
  return Boolean(actor.sub && actor.sub === row.principal);
}

export function rlsVisibleAcl(rows: AclRow[], actor: JourneyActor): AclRow[] {
  if (!actor.authenticated) return [];
  return rows.filter((row) => actorMatchesAcl(actor, row));
}

export function rlsVisibleCompanyIds(acl: AclRow[], actor: JourneyActor): Set<string> {
  return new Set(rlsVisibleAcl(acl, actor).map((row) => row.companyId));
}

export function roleOnCompany(
  acl: AclRow[],
  actor: JourneyActor,
  companyId: string,
): JourneyAclRole | undefined {
  const hits = rlsVisibleAcl(acl, actor).filter((row) => row.companyId === companyId);
  const order: JourneyAclRole[] = ["founder", "founder_authorized", "advisor"];
  for (const role of order) {
    if (hits.some((row) => row.role === role)) return role;
  }
  return undefined;
}

export function canReadCompany(acl: AclRow[], actor: JourneyActor, companyId: string): boolean {
  return roleOnCompany(acl, actor, companyId) !== undefined;
}

export function canWriteJourney(acl: AclRow[], actor: JourneyActor, companyId: string): boolean {
  const role = roleOnCompany(acl, actor, companyId);
  return role === "founder" || role === "founder_authorized";
}

/** Advisors post comments. Side table only. Comments never mutate phase/gate. */
export function canPostComment(acl: AclRow[], actor: JourneyActor, companyId: string): boolean {
  return roleOnCompany(acl, actor, companyId) === "advisor";
}

export function commentsMayMutateGate(): boolean {
  return false;
}

/** Advisors cannot write audit except via put_journey / post_comment / ACL tools. */
export function canWriteAuditDirectly(): boolean {
  return false;
}

export function auditEventsMayBeUpdated(): boolean {
  return false;
}

export function visualFlowMermaid(idea: IdeaRow, events: GateEventRow[]): string {
  const phaseNodes = Array.from({ length: 9 }, (_, i) => {
    const n = i + 1;
    const mark = n === idea.journeyPhase ? ":::current" : "";
    return `    p${n}["${n} ${JOURNEY_PHASES[n]}"]${mark}`;
  }).join("\n");
  const phaseEdges = Array.from({ length: 8 }, (_, i) => `    p${i + 1} --> p${i + 2}`).join("\n");
  const loopNodes = Array.from({ length: 7 }, (_, i) => {
    const n = i + 1;
    const mark = n === idea.loopStage ? ":::current" : "";
    return `    l${n}["${n} ${LOOP_STAGES[n]}"]${mark}`;
  }).join("\n");
  const loopEdges = Array.from({ length: 6 }, (_, i) => `    l${i + 1} --> l${i + 2}`).join("\n");
  const last = events
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-3)
    .map((e) => `    t${e.id.replace(/[^a-zA-Z0-9]/g, "")}["${e.action} · ${e.who}: ${escapeMermaid(e.why)}"]`)
    .join("\n");
  return [
    "```mermaid",
    "flowchart TB",
    "  classDef current fill:#111,color:#fff,stroke:#111;",
    "  subgraph journey [Journey 1-9]",
    phaseNodes,
    phaseEdges,
    "  end",
    "  subgraph loop [Loop 1-7]",
    loopNodes,
    loopEdges,
    "  end",
    `  gate["Gate: ${idea.currentGate}"]:::current`,
    `  help["Constraint this week: ${escapeMermaid(constraintThisWeekOf(idea) || "none yet")}"]`,
    "  p" + idea.journeyPhase + " --> gate",
    "  l" + idea.loopStage + " --> gate",
    "  gate --> help",
    last ? "  subgraph last [Last transitions]\n" + last + "\n  end" : "",
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMermaid(text: string): string {
  return text.replace(/["[\]]/g, " ").slice(0, 80);
}

export function twoMinuteSnapshot(company: CompanyRow, idea: IdeaRow, events: GateEventRow[]): string {
  const last = events.slice().sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  const questions = idea.scoreboard.openQuestions ?? [];
  const eyes = idea.scoreboard.readyForHumanEyes?.status ?? "unknown";
  const constraint = constraintThisWeekOf(idea);
  return [
    `${company.label} / ${idea.name} — two-minute read`,
    `Constraint this week (where help is required): ${constraint || "none yet"}`,
    `Journey: ${idea.journeyPhase} ${JOURNEY_PHASES[idea.journeyPhase]} of 9`,
    `Loop: ${idea.loopStage} ${LOOP_STAGES[idea.loopStage]} of 7`,
    `Gate: ${idea.currentGate}`,
    last
      ? `Last transition: ${last.action} by ${last.who} at ${last.at} — ${last.why}`
      : "Last transition: none yet",
    `Ready for human eyes: ${eyes} (not demand, not PMF)`,
    questions.length ? `Open questions: ${questions.join("; ")}` : "Open questions: none yet",
    "Company and idea are separate. This is a view, not a second app.",
  ].join("\n");
}

export function meetingDocView(
  company: CompanyRow,
  idea: IdeaRow,
  events: GateEventRow[],
  comments: CommentRow[],
): string {
  const progress =
    idea.scoreboard.progress?.length
      ? idea.scoreboard.progress.map((x) => `- ${x}`).join("\n")
      : `- Clocks at journey ${idea.journeyPhase} / loop ${idea.loopStage}, gate ${idea.currentGate}.`;
  const challenges =
    idea.scoreboard.challenges?.length
      ? idea.scoreboard.challenges.map((x) => `- ${x}`).join("\n")
      : (idea.scoreboard.openQuestions ?? []).map((x) => `- ${x}`).join("\n") ||
        "- None written. Do not invent.";
  const constraint = constraintThisWeekOf(idea);
  const extras =
    idea.scoreboard.helpNeeded?.length
      ? idea.scoreboard.helpNeeded.map((x) => `- ${x}`).join("\n")
      : "";
  const help = [
    `- Constraint this week (where help is required): ${constraint || "none yet"}`,
    extras,
  ]
    .filter(Boolean)
    .join("\n");
  const advisorNotes = comments.length
    ? comments
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((c) => `- ${c.who} (${c.at}): ${c.body}`)
        .join("\n")
    : "- None.";
  const lastGates = events
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-5)
    .map((e) => `- ${e.at} ${e.action} (${e.who}): ${e.why}`)
    .join("\n");
  return [
    `# Where we are — ${company.label} / ${idea.name}`,
    "",
    twoMinuteSnapshot(company, idea, events),
    "",
    "## Progress",
    progress,
    "",
    "## Challenges",
    challenges,
    "",
    "## Where help is needed",
    help,
    "",
    "## Last gates",
    lastGates || "- None yet.",
    "",
    "## Advisor comments (side table; never a gate)",
    advisorNotes,
    "",
    "_Generated as a view. Do not store a novel._",
  ].join("\n");
}

export type JourneyIdeaPayload = {
  slug: string;
  name: string;
  clocks: {
    journeyPhase: number;
    loopStage: number;
    currentGate: GateDecision;
  };
  /** Fluid. Where help is required this week. Not a clock. Not tickets. */
  constraintThisWeek: string;
  scoreboard: Scoreboard;
  lastTransitions: GateEventRow[];
  visualFlow: string;
  snapshot: string;
  meetingDoc?: string;
  comments?: CommentRow[];
};

export function ideaPayload(
  company: CompanyRow,
  idea: IdeaRow,
  events: GateEventRow[],
  comments: CommentRow[],
  expandMeetingDoc: boolean,
): JourneyIdeaPayload {
  const lastTransitions = events
    .filter((e) => e.ideaId === idea.id)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const ideaComments = comments
    .filter((c) => c.ideaId === idea.id)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const payload: JourneyIdeaPayload = {
    slug: idea.slug,
    name: idea.name,
    clocks: {
      journeyPhase: idea.journeyPhase,
      loopStage: idea.loopStage,
      currentGate: idea.currentGate,
    },
    constraintThisWeek: constraintThisWeekOf(idea),
    scoreboard: idea.scoreboard,
    lastTransitions,
    visualFlow: visualFlowMermaid(idea, lastTransitions),
    snapshot: twoMinuteSnapshot(company, idea, lastTransitions),
  };
  if (expandMeetingDoc) {
    payload.meetingDoc = meetingDocView(company, idea, lastTransitions, ideaComments);
    payload.comments = ideaComments;
  }
  return payload;
}

export type JourneyStore = {
  readonly kind: "memory" | "pglite";
  actorOnAllowlist(actor: JourneyActor): boolean;
  getJourney(
    actor: JourneyActor,
    query: { companySlug?: string; ideaSlug?: string; expandMeetingDoc?: boolean },
  ): Promise<unknown>;
  putJourney(
    actor: JourneyActor,
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
      client?: string;
    },
  ): Promise<unknown>;
  postComment(
    actor: JourneyActor,
    input: { companySlug: string; ideaSlug?: string; body: string; client?: string },
  ): Promise<unknown>;
  changeAcl(
    actor: JourneyActor,
    input: {
      companySlug: string;
      principal: string;
      principalKind: "email" | "sub";
      role: JourneyAclRole;
      op: "grant" | "revoke";
      client?: string;
    },
  ): Promise<unknown>;
};

function notFound(message: string) {
  return { ok: false, error: message };
}

function forbidden(message: string) {
  return { ok: false, error: message };
}

export class MemoryJourneyStore implements JourneyStore {
  readonly kind = "memory" as const;
  private seq = 0;

  constructor(
    private companies: CompanyRow[],
    private acl: AclRow[],
    private ideas: IdeaRow[],
    private events: GateEventRow[],
    private comments: CommentRow[],
    private audit: AuditEventRow[] = [],
  ) {}

  actorOnAllowlist(actor: JourneyActor): boolean {
    return rlsVisibleAcl(this.acl, actor).length > 0;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  private companyBySlug(slug: string): CompanyRow | undefined {
    const want = normalizeSlug(slug);
    return this.companies.find((c) => c.slug === want);
  }

  private ideasFor(companyId: string, ideaSlug?: string): IdeaRow[] {
    const rows = this.ideas.filter((i) => i.companyId === companyId);
    if (!ideaSlug) return rows;
    const want = normalizeSlug(ideaSlug);
    return rows.filter((i) => i.slug === want);
  }

  private emitAudit(row: Omit<AuditEventRow, "id" | "at">): AuditEventRow {
    const event: AuditEventRow = {
      id: this.nextId("ae"),
      at: new Date().toISOString(),
      ...row,
    };
    this.audit.push(event);
    return event;
  }

  private auditFor(companyId: string, ideaId?: string): AuditEventRow[] {
    return this.audit
      .filter((row) => {
        if (row.companyId !== companyId) return false;
        if (!ideaId) return true;
        return row.ideaId === ideaId || row.ideaId === null;
      })
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async getJourney(
    actor: JourneyActor,
    query: { companySlug?: string; ideaSlug?: string; expandMeetingDoc?: boolean },
  ): Promise<unknown> {
    if (!actor.authenticated || !actor.principal) {
      return forbidden("unauthenticated");
    }
    if (!query.companySlug) {
      return notFound("company required");
    }
    const company = this.companyBySlug(query.companySlug);
    if (!company || !canReadCompany(this.acl, actor, company.id)) {
      return notFound("company not visible");
    }
    const ideas = this.ideasFor(company.id, query.ideaSlug);
    if (query.ideaSlug && ideas.length === 0) {
      return notFound("idea not visible");
    }
    return {
      ok: true,
      company: { slug: company.slug, label: company.label },
      ideas: ideas.map((idea) =>
        ideaPayload(company, idea, this.events, this.comments, Boolean(query.expandMeetingDoc)),
      ),
      audit: this.auditFor(company.id, query.ideaSlug ? ideas[0]?.id : undefined),
      note: "Same payload for team / advisor / board / investor prep. Views are generated. Comments never mutate gates. Audit is append-only. Not ~/.bootstrap-os.",
    };
  }

  async putJourney(
    actor: JourneyActor,
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
      client?: string;
    },
  ): Promise<unknown> {
    if (!actor.authenticated || !actor.principal) {
      return forbidden("unauthenticated");
    }
    if (!input.founderYes) {
      return forbidden("founder yes required in the agent chat — not a form, not mail");
    }
    const company = this.companyBySlug(input.companySlug);
    if (!company || !canWriteJourney(this.acl, actor, company.id)) {
      return forbidden("founder or founder-authorized only");
    }
    const ideas = this.ideasFor(company.id, input.ideaSlug);
    if (ideas.length !== 1) {
      return notFound("exactly one idea required to write");
    }
    const idea = ideas[0];
    if (input.journeyPhase !== undefined) {
      if (!isJourneyPhase(input.journeyPhase)) {
        return forbidden("journey_phase is a strict enum 1-9");
      }
      idea.journeyPhase = input.journeyPhase;
    }
    if (input.loopStage !== undefined) {
      if (!isLoopStage(input.loopStage)) {
        return forbidden("loop_stage is a strict enum 1-7");
      }
      idea.loopStage = input.loopStage;
    }
    if (input.currentGate !== undefined) {
      if (!isGateDecision(input.currentGate)) {
        return forbidden("current_gate is a strict enum");
      }
      idea.currentGate = input.currentGate;
    }
    if (input.scoreboard) {
      const fromBoard = normalizeConstraintThisWeek(input.scoreboard.constraint_this_week);
      if (!fromBoard.ok) {
        return forbidden(fromBoard.error);
      }
      idea.scoreboard = {
        ...input.scoreboard,
        schema_version: input.scoreboard.schema_version ?? SCOREBOARD_SCHEMA_VERSION,
        constraint_this_week: fromBoard.value,
      };
    }
    if (input.constraintThisWeek !== undefined) {
      const normalized = normalizeConstraintThisWeek(input.constraintThisWeek);
      if (!normalized.ok) {
        return forbidden(normalized.error);
      }
      idea.scoreboard = {
        ...idea.scoreboard,
        schema_version: idea.scoreboard.schema_version ?? SCOREBOARD_SCHEMA_VERSION,
        constraint_this_week: normalized.value,
      };
    }
    const clocksChanged =
      input.journeyPhase !== undefined ||
      input.loopStage !== undefined ||
      input.currentGate !== undefined;
    if (clocksChanged) {
      this.events.push({
        id: this.nextId("ge"),
        ideaId: idea.id,
        action: idea.currentGate,
        at: new Date().toISOString(),
        why: input.why,
        who: actor.principal,
      });
    }
    const audit = this.emitAudit({
      companyId: company.id,
      ideaId: idea.id,
      who: actor.principal,
      client: input.client?.trim() || "put_journey",
      whatChanged: {
        via: "put_journey",
        journeyPhase: idea.journeyPhase,
        loopStage: idea.loopStage,
        currentGate: idea.currentGate,
        constraint_this_week: constraintThisWeekOf(idea),
        why: input.why,
      },
    });
    return {
      ok: true,
      company: { slug: company.slug, label: company.label },
      idea: ideaPayload(company, idea, this.events, this.comments, false),
      audit,
    };
  }

  async postComment(
    actor: JourneyActor,
    input: { companySlug: string; ideaSlug?: string; body: string; client?: string },
  ): Promise<unknown> {
    if (!actor.authenticated || !actor.principal) {
      return forbidden("unauthenticated");
    }
    const company = this.companyBySlug(input.companySlug);
    if (!company || !canPostComment(this.acl, actor, company.id)) {
      return forbidden("advisors post comments");
    }
    const ideas = this.ideasFor(company.id, input.ideaSlug);
    if (ideas.length !== 1) {
      return notFound("exactly one idea required to comment");
    }
    const idea = ideas[0];
    const before = {
      journeyPhase: idea.journeyPhase,
      loopStage: idea.loopStage,
      currentGate: idea.currentGate,
    };
    this.comments.push({
      id: this.nextId("c"),
      ideaId: idea.id,
      body: input.body,
      at: new Date().toISOString(),
      who: actor.principal,
    });
    const comment = this.comments.at(-1)!;
    const audit = this.emitAudit({
      companyId: company.id,
      ideaId: idea.id,
      who: actor.principal,
      client: input.client?.trim() || "post_comment",
      whatChanged: { via: "post_comment", commentId: comment.id },
    });
    return {
      ok: true,
      clocksUnchanged: before,
      comment,
      audit,
      note: "Comments hang off the idea. They never mutate phase or gate.",
    };
  }

  async changeAcl(
    actor: JourneyActor,
    input: {
      companySlug: string;
      principal: string;
      principalKind: "email" | "sub";
      role: JourneyAclRole;
      op: "grant" | "revoke";
      client?: string;
    },
  ): Promise<unknown> {
    if (!actor.authenticated || !actor.principal) {
      return forbidden("unauthenticated");
    }
    const company = this.companyBySlug(input.companySlug);
    if (!company || roleOnCompany(this.acl, actor, company.id) !== "founder") {
      return forbidden("founder only");
    }
    const principal =
      input.principalKind === "email" ? input.principal.trim().toLowerCase() : input.principal.trim();
    if (input.op === "grant") {
      const exists = this.acl.some(
        (row) =>
          row.companyId === company.id &&
          row.principal === principal &&
          row.principalKind === input.principalKind,
      );
      if (!exists) {
        this.acl.push({
          companyId: company.id,
          principal,
          principalKind: input.principalKind,
          role: input.role,
        });
      }
    } else {
      this.acl = this.acl.filter(
        (row) =>
          !(
            row.companyId === company.id &&
            row.principal === principal &&
            row.principalKind === input.principalKind
          ),
      );
    }
    const audit = this.emitAudit({
      companyId: company.id,
      ideaId: null,
      who: actor.principal,
      client: input.client?.trim() || "acl",
      whatChanged: {
        via: "acl",
        op: input.op,
        principalKind: input.principalKind,
        role: input.role,
      },
    });
    return { ok: true, audit };
  }
}

/** PGlite fixture principals. Synthetic. Real FAST emails are not in git. */
export const JOURNEY_FIXTURE = {
  companies: [
    { id: "co-dye", slug: "dyeconverter", label: "DyeConverter" },
    { id: "co-core", slug: "corehaul", label: "CoreHaul" },
  ] satisfies CompanyRow[],
  acl: [
    {
      companyId: "co-dye",
      principal: "founder-dye@example.test",
      principalKind: "email" as const,
      role: "founder" as const,
    },
    {
      companyId: "co-core",
      principal: "founder-core@example.test",
      principalKind: "email" as const,
      role: "founder" as const,
    },
    {
      companyId: "co-core",
      principal: "sub-only-corehaul",
      principalKind: "sub" as const,
      role: "founder" as const,
    },
    {
      companyId: "co-dye",
      principal: "advisor-cos@example.test",
      principalKind: "email" as const,
      role: "advisor" as const,
    },
    {
      companyId: "co-core",
      principal: "advisor-cos@example.test",
      principalKind: "email" as const,
      role: "advisor" as const,
    },
    {
      companyId: "co-dye",
      principal: "authorized-dye@example.test",
      principalKind: "email" as const,
      role: "founder_authorized" as const,
    },
  ] satisfies AclRow[],
  ideas: [
    {
      id: "idea-dye",
      companyId: "co-dye",
      slug: "dyeconverter",
      name: "DyeConverter",
      journeyPhase: 1,
      loopStage: 1,
      currentGate: "hold" as const,
      scoreboard: defaultScoreboard(),
    },
    {
      id: "idea-core",
      companyId: "co-core",
      slug: "corehaul",
      name: "CoreHaul",
      journeyPhase: 1,
      loopStage: 1,
      currentGate: "hold" as const,
      scoreboard: defaultScoreboard(),
    },
  ] satisfies IdeaRow[],
};

export function fixtureJourneyStore(): MemoryJourneyStore {
  return new MemoryJourneyStore(
    JOURNEY_FIXTURE.companies.map((c) => ({ ...c })),
    JOURNEY_FIXTURE.acl.map((a) => ({ ...a })),
    JOURNEY_FIXTURE.ideas.map((i) => ({
      ...i,
      scoreboard: {
        ...i.scoreboard,
        openQuestions: [...(i.scoreboard.openQuestions ?? [])],
        constraint_this_week: i.scoreboard.constraint_this_week ?? "",
      },
    })),
    [],
    [],
  );
}

let testStore: JourneyStore | null | undefined;

export function setJourneyStoreForTests(store: JourneyStore | null | undefined): void {
  testStore = store;
}

export function resolveJourneyStore(): JourneyStore | null {
  if (testStore !== undefined) return testStore;
  return null;
}
