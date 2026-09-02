import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  DOC_KEYS,
  HOSTED_GATED_JOURNEY_TOOL_NAMES,
  JOURNEY_PHASES,
  LOOP_STAGES,
  MCP_VERSION,
  OS_VERSION,
  PATH4_HONESTY,
  PUBLISHED_REPO,
  type DocKey,
} from "./constants.js";
import type { JourneyActor } from "./journey-auth.js";
import { parseJourneyQuery, resolveJourneyStore } from "./journey.js";
import { loadOsDoc, loadOsDocList, resolveDocsBaseUrl, resolveDocsSource } from "./docs.js";
import {
  initCompany,
  listCompanies,
  requireActiveContext,
  resolveDataRoot,
  useCompany,
} from "./companies.js";
import {
  resolveOsRoot,
  resolveStatePath,
  resolveTracesDir,
} from "./paths.js";
import {
  appendDecisionTrace,
  patchState,
  readState,
  whereAreWePlain,
  writeState,
} from "./state.js";
import { buildNextEvidenceView, buildStatusView } from "./guidance.js";
import { evaluateExternalAsk } from "./policy.js";
import { HOUSE_RULE_LINES, HOUSE_RULE_PINS } from "./house-rules.js";

export type McpSurface = "full" | "hosted-read";

function text(payload: unknown) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text" as const, text: body }] };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function activeScopeNote() {
  const ctx = requireActiveContext();
  return {
    activeCompanyId: ctx.companyId,
    instanceRoot: ctx.instanceRoot,
    resolveMode: ctx.mode,
    isolation:
      "State and traces are per company only. Never copy evidence or phase across companyId.",
  };
}

function adoptionOrder() {
  return {
    path1: `Point an AI at ${PUBLISHED_REPO} — no install, no MCP. Default front door.`,
    path2: "Optional instance files / ./scripts/install-instance.sh + optional .grok/workflows.",
    path3: "Local stdio MCP (optional, several ideas). Same company-state.json + where-are-we.py. Write/init/use-company stays here.",
    path4Hosted: PATH4_HONESTY,
  };
}

function registerReadTools(server: McpServer, surface: McpSurface) {
  server.tool(
    "bootstrap_os_info",
    "Bootstrap OS + MCP modes, versions, and honesty about hosted preview vs path 3 writes.",
    {},
    async () => {
      const common = {
        osVersion: OS_VERSION,
        mcpVersion: MCP_VERSION,
        surface,
        publishedRepo: PUBLISHED_REPO,
        adoptionOrder: adoptionOrder(),
        hardRules: [
          "AI never advances journey phase without founder approval",
          "Ready for human eyes green is not demand or PMF",
          "Company state is isolated per companyId — no cross-tenant bleed",
          "One connector, many instances; product repos need not import full Bootstrap tree",
          "Flexible on ideas/execution; stringent on process — busy is not progress",
          "Activity without labeled evidence or gates is not advancement",
          "MCP never writes company-os/ template files",
          ...HOUSE_RULE_LINES,
        ],
        houseRules: HOUSE_RULE_LINES,
        houseRulePins: HOUSE_RULE_PINS,
        marketplace: false,
        pluginPreview: {
          path: "plugin/",
          version: "0.1.1",
          note: "Preview Agent Plugin 0.1.1. Skills hyperlink the published OS. Team Import from Repo only — not a public catalog submit. Not mentee-ready hosted boards. Path 1 stays the front door.",
        },
      };

      if (surface === "hosted-read") {
        return text({
          ...common,
          connectorModel:
            "Preview HTTP read adapter. Markdown on GitHub is the constitution. Not a second OS. Not mentee-ready hosted boards.",
          docsSource: resolveDocsSource(),
          docsBase: resolveDocsBaseUrl(),
          companyState:
            "Not hosted. Write / init / use-company stays path 3 local stdio.",
          modes: {
            markdownOnly: "Path 1–2. Use company-os/*.md. Full ownership, offline. Front door.",
            localMcpMultiCompany:
              "Path 3. One stdio server; bootstrap_init_company / list / use_company; state under BOOTSTRAP_DATA_ROOT/instances/<id>.",
            hostedReadPreview:
              "Path 4 preview. Read-only: os info, docs, house-rule pins. Fetch published repo. No shared founder boards.",
          },
          journeyTools: {
            names: HOSTED_GATED_JOURNEY_TOOL_NAMES,
            gated: true,
            onProductionPin: false,
            note: "Branch only. Production pin stays main. Login/OAuth Hold. Public OS tools stay unauthenticated.",
          },
        });
      }

      const ctx = requireActiveContext();
      return text({
        ...common,
        connectorModel:
          "Optional path 3 adapter: one MCP connector, many isolated company instances. Not a second OS. Markdown is the constitution.",
        docsSource: resolveDocsSource(),
        modes: {
          markdownOnly:
            "Path 1–2. Use company-os/*.md and templates/ with no MCP. Full ownership, offline.",
          localMcpMultiCompany:
            "Path 3. One stdio server; bootstrap_init_company / list / use_company; state under BOOTSTRAP_DATA_ROOT/instances/<id>.",
          localMcpSingleEnv:
            "Optional BOOTSTRAP_INSTANCE_ROOT pins one company (backward compatible).",
          hostedReadPreview: PATH4_HONESTY,
        },
        paths: {
          osRoot: resolveOsRoot(),
          dataRoot: resolveDataRoot(),
          activeCompanyId: ctx.companyId,
          instanceRoot: ctx.instanceRoot,
          statePath: resolveStatePath(),
          tracesDir: resolveTracesDir(),
          resolveMode: ctx.mode,
        },
        env: {
          BOOTSTRAP_OS_ROOT: process.env.BOOTSTRAP_OS_ROOT ?? null,
          BOOTSTRAP_DATA_ROOT: process.env.BOOTSTRAP_DATA_ROOT ?? null,
          BOOTSTRAP_INSTANCE_ROOT: process.env.BOOTSTRAP_INSTANCE_ROOT ?? null,
          BOOTSTRAP_STATE_PATH: process.env.BOOTSTRAP_STATE_PATH ?? null,
          BOOTSTRAP_TRACES_DIR: process.env.BOOTSTRAP_TRACES_DIR ?? null,
        },
      });
    },
  );

  server.tool(
    "bootstrap_list_docs",
    "List portable Bootstrap OS blueprint docs available as resources/tools.",
    {},
    async () => text(await loadOsDocList()),
  );

  server.tool(
    "bootstrap_get_doc",
    "Read a portable Bootstrap OS document (blueprint/runtime/checklist/ai instructions). Process only — not another company's filled state.",
    {
      doc: z
        .enum(DOC_KEYS as unknown as [DocKey, ...DocKey[]])
        .describe(
          "operating-system | live-runtime | ready-for-human-eyes | ai-instructions | first-hour | after-proof-efficiency (post-proof + fences + they asked)",
        ),
    },
    async ({ doc }) => {
      try {
        return text(await loadOsDoc(doc));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_get_ai_instructions",
    "Return the thin always-on AI enforcement layer (paste into AGENTS.md / Cursor / Claude / Grok).",
    {},
    async () => {
      try {
        return text(await loadOsDoc("ai-instructions"));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_reference_clocks",
    "Reference labels for the two clocks: journey phases 1–9 and live loop stages 1–7.",
    {},
    async () =>
      text({
        journeyPhases: JOURNEY_PHASES,
        loopStages: LOOP_STAGES,
        note: "Journey advances only with founder Advance / Iterate / Hold / Kill. Loop may run many times inside one phase.",
      }),
  );

  server.tool(
    "bootstrap_house_rule_pins",
    "House-rule pins with links to the published OS. Full essays live on GitHub — do not treat this as a second constitution.",
    {},
    async () =>
      text({
        publishedRepo: PUBLISHED_REPO,
        note: "Pins only. Read the linked OS sections.",
        pins: HOUSE_RULE_PINS,
      }),
  );
}

function registerWriteTools(server: McpServer) {
  server.tool(
    "bootstrap_list_companies",
    "List registered company instances on this machine (isolated control planes). Shows which is active.",
    {},
    async () => text(listCompanies()),
  );

  server.tool(
    "bootstrap_init_company",
    "Create an isolated company instance (state + traces) under the data root, or return existing. Activates it by default. Does not import Bootstrap into product repos.",
    {
      companyId: z
        .string()
        .describe("Stable id/slug, e.g. pirin, zk0, tokbox"),
      displayName: z.string().optional().describe("Human label"),
      hypothesis: z.string().optional().describe("One-sentence thesis (subject to evidence)"),
      instanceRoot: z
        .string()
        .optional()
        .describe("Optional custom path; default $BOOTSTRAP_DATA_ROOT/instances/<id>"),
      activate: z
        .boolean()
        .optional()
        .describe("Set as active company (default true)"),
    },
    async (input) => {
      try {
        const result = initCompany(input);
        return text({
          ok: true,
          ...result,
          note: result.created
            ? "Isolated instance created. Call bootstrap_where_are_we on this company."
            : "Company already existed; registry left intact.",
          list: listCompanies(),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_use_company",
    "Switch active company for this MCP session (and persist as registry default). All subsequent state tools use only that instance.",
    {
      companyId: z.string().describe("Registered company id"),
    },
    async ({ companyId }) => {
      try {
        const result = useCompany(companyId);
        let snapshot: unknown = null;
        try {
          snapshot = {
            companyId: readState().companyId,
            journeyPhase: readState().journeyPhase,
            loopStage: readState().loopStage,
            readyForHumanEyes: readState().readyForHumanEyes?.status,
          };
        } catch {
          snapshot = "state not readable";
        }
        return text({
          ok: true,
          ...result,
          scope: activeScopeNote(),
          snapshot,
          note: "Active company switched. Evidence and phase for other companies are not visible to mutating tools.",
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_get_state",
    "Read active company's company-state.json only (isolated).",
    {},
    async () => {
      try {
        return text({
          scope: activeScopeNote(),
          path: resolveStatePath(),
          state: readState(),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_where_are_we",
    "Clear status for the ACTIVE company only: plain + structured two clocks, human-eyes, questions, scores.",
    {},
    async () => {
      try {
        const state = readState();
        const plain = whereAreWePlain(state);
        return text({
          scope: activeScopeNote(),
          ...buildStatusView(state, plain),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_next_evidence",
    "Evidence needed for active company to advance slow phase / fast stage + agent focus. Does not advance phases.",
    {},
    async () => {
      try {
        return text({
          scope: activeScopeNote(),
          ...buildNextEvidenceView(readState()),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_agent_focus",
    "Short work order for active company: gather evidence vs do work vs stage-7.",
    {},
    async () => {
      try {
        const v = buildNextEvidenceView(readState());
        return text({
          scope: activeScopeNote(),
          plain: [
            v.agentFocus.modePlain,
            "",
            "Do now:",
            ...v.agentFocus.doNow.map((x) => `- ${x}`),
            "",
            "Do not:",
            ...v.agentFocus.doNotDo.slice(0, 8).map((x) => `- ${x}`),
          ].join("\n"),
          ...v.agentFocus,
          slowClock: {
            phase: v.slowClock.currentPhase,
            name: v.slowClock.currentName,
            exitSignal: v.slowClock.exitSignal,
          },
          fastClock: {
            stage: v.fastClock.currentStage,
            name: v.fastClock.currentName,
            completeWhen: v.fastClock.completeWhen,
          },
          humanEyes: v.humanEyes.status,
          howToRecordWhenReady: v.howToRecordWhenReady,
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_update_state",
    "Patch ACTIVE company state only. Journey phase changes require founderApprovedPhaseChange=true.",
    {
      companyId: z.string().optional().describe("Ignored if set; active company wins (isolation)"),
      hypothesis: z.string().optional(),
      journeyPhase: z.number().int().min(1).max(9).optional(),
      loopStage: z.number().int().min(1).max(7).optional(),
      gateStatus: z.string().optional(),
      autonomyPosture: z.enum(["strict", "auto", "dangerous"]).optional(),
      lastAction: z.string().optional(),
      lastWeeklySnapshotAt: z.string().nullable().optional(),
      openQuestions: z.array(z.string()).optional(),
      scores: z.record(z.unknown()).optional(),
      founderApprovedPhaseChange: z
        .boolean()
        .optional()
        .describe("Required true to apply journeyPhase change"),
    },
    async (args) => {
      try {
        const { founderApprovedPhaseChange, scores, companyId: _ignore, ...rest } = args;
        void _ignore;
        const patch: Record<string, unknown> = { ...rest };
        if (scores) patch.scores = scores;
        const { state, warnings } = patchState(patch as never, {
          allowPhaseAdvance: Boolean(founderApprovedPhaseChange),
        });
        return text({
          ok: true,
          scope: activeScopeNote(),
          warnings,
          state,
          path: resolveStatePath(),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_set_ready_for_human_eyes",
    "Update Ready for human eyes on ACTIVE company only. Green is not demand/PMF.",
    {
      status: z.enum(["unknown", "blocked", "green"]),
      happyPath: z.string().optional(),
      blockers: z.array(z.string()).optional(),
      evidencePath: z.string().optional(),
      lastAction: z.string().optional(),
    },
    async ({ status, happyPath, blockers, evidencePath, lastAction }) => {
      try {
        const state = readState();
        state.readyForHumanEyes = {
          status,
          checkedAt: new Date().toISOString(),
          happyPath: happyPath ?? state.readyForHumanEyes?.happyPath ?? "",
          blockers: status === "blocked" ? blockers ?? state.readyForHumanEyes?.blockers ?? [] : [],
          evidencePath: evidencePath ?? state.readyForHumanEyes?.evidencePath,
        };
        if (lastAction) state.lastAction = lastAction;
        else state.lastAction = `ready_for_human_eyes_${status}`;
        writeState(state);

        const notes: string[] = [];
        if (status === "green") {
          notes.push(
            "Green: cold URL + happy path only. Not demand, not PMF, not willingness to pay.",
          );
        }
        if (status === "blocked") {
          notes.push(
            "Do not draft mentor/user 'try my link' asks until green or explicit founder override + decision trace.",
          );
        }
        return text({
          ok: true,
          scope: activeScopeNote(),
          notes,
          state: state.readyForHumanEyes,
          path: resolveStatePath(),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_ready_checklist",
    "Portable Ready for human eyes checklist + ACTIVE company status.",
    {},
    async () => {
      try {
        const checklist = await loadOsDoc("ready-for-human-eyes");
        let current: unknown = null;
        try {
          current = readState().readyForHumanEyes;
        } catch {
          current = "state not loaded";
        }
        return text({ scope: activeScopeNote(), current, checklist });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_log_decision",
    "Append decision trace under ACTIVE company traces only.",
    {
      title: z.string(),
      decision: z.string(),
      evidence: z.string().optional(),
      outcome: z.string().optional(),
      nextReview: z.string().optional(),
      founderApproved: z.boolean().optional(),
      setLastAction: z.boolean().optional().describe("If true, update state.lastAction"),
    },
    async (input) => {
      try {
        const file = appendDecisionTrace(input);
        if (input.setLastAction) {
          const state = readState();
          state.lastAction = `decision:${input.title}`;
          writeState(state);
        }
        return text({ ok: true, scope: activeScopeNote(), file });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "bootstrap_refuse_external_ask_if_not_green",
    "Policy helper for ACTIVE company: allow/deny external product-test asks.",
    {
      intent: z.string().describe("What the agent wants to draft, e.g. mentor beta email"),
      founderOverride: z
        .boolean()
        .optional()
        .describe("Only true if founder explicitly overrode with written decision trace"),
    },
    async ({ intent, founderOverride }) => {
      try {
        const state = readState();
        const status = state.readyForHumanEyes?.status ?? "unknown";
        const decision = evaluateExternalAsk({
          readyStatus: status,
          intent,
          founderOverride,
          blockers: state.readyForHumanEyes?.blockers ?? [],
        });
        return text({
          ...decision,
          scope: activeScopeNote(),
          intent,
          blockers: state.readyForHumanEyes?.blockers ?? [],
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}

export type HostedRequestContext = {
  actor?: JourneyActor;
};

function registerJourneyTools(server: McpServer, ctx: HostedRequestContext) {
  server.tool(
    "get_journey",
    "Where are we — company (every idea) or company/idea. Visual flow + two-minute snapshot; optional meeting-doc view. Gated. Not the production pin.",
    {
      q: z
        .string()
        .optional()
        .describe("CoreHaul or CoreHaul / last-mile. Company and idea are separate."),
      company: z.string().optional().describe("Company slug"),
      idea: z.string().optional().describe("Idea slug. Omit for every idea under the company."),
      expand: z
        .enum(["snapshot", "meeting_doc"])
        .optional()
        .describe("snapshot is always returned. meeting_doc is a generated view, not stored."),
    },
    async (input) => {
      const store = resolveJourneyStore();
      const actor = ctx.actor;
      if (!store || !actor?.authenticated) {
        return err("Gated. Founder or advisor token required. Public OS tools stay open.");
      }
      const parsed = parseJourneyQuery(input);
      try {
        return text(
          await store.getJourney(actor, {
            companySlug: parsed.companySlug,
            ideaSlug: parsed.ideaSlug,
            expandMeetingDoc: input.expand === "meeting_doc",
          }),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "put_journey",
    "Overwrite clocks and versioned jsonb for one idea. Founder or founder-authorized. One founder yes in chat — not a form, not mail.",
    {
      company: z.string().describe("Company slug"),
      idea: z.string().optional().describe("Idea slug. Default idea if omitted."),
      journeyPhase: z.number().int().min(1).max(9).optional(),
      loopStage: z.number().int().min(1).max(7).optional(),
      currentGate: z.enum(["advance", "iterate", "hold", "kill"]).optional(),
      scoreboard: z.record(z.unknown()).optional(),
      why: z.string().describe("Short why for the gate"),
      founderYes: z
        .boolean()
        .describe("True only after an explicit founder yes in their agent chat"),
      client: z.string().optional().describe("Which client wrote. Stored on the audit row."),
    },
    async (input) => {
      const store = resolveJourneyStore();
      const actor = ctx.actor;
      if (!store || !actor?.authenticated) {
        return err("Gated. Founder or founder-authorized token required.");
      }
      try {
        return text(
          await store.putJourney(actor, {
            companySlug: input.company,
            ideaSlug: input.idea,
            journeyPhase: input.journeyPhase,
            loopStage: input.loopStage,
            currentGate: input.currentGate as import("./journey.js").GateDecision | undefined,
            scoreboard: input.scoreboard as import("./journey.js").Scoreboard | undefined,
            why: input.why,
            founderYes: input.founderYes,
            client: input.client,
          }),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.tool(
    "post_comment",
    "Advisor comment on an idea. Side table only. Never mutates phase or gate.",
    {
      company: z.string().describe("Company slug"),
      idea: z.string().optional().describe("Idea slug. Default idea if omitted."),
      body: z.string().describe("Comment text"),
      client: z.string().optional().describe("Which client wrote. Stored on the audit row."),
    },
    async (input) => {
      const store = resolveJourneyStore();
      const actor = ctx.actor;
      if (!store || !actor?.authenticated) {
        return err("Gated. Advisor token required.");
      }
      try {
        return text(
          await store.postComment(actor, {
            companySlug: input.company,
            ideaSlug: input.idea,
            body: input.body,
            client: input.client,
          }),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}

export function createBootstrapServer(
  surface: McpSurface = "full",
  ctx: HostedRequestContext = {},
): McpServer {
  const server = new McpServer({
    name: "bootstrap-os",
    version: MCP_VERSION,
  });
  registerReadTools(server, surface);
  if (surface === "full") {
    registerWriteTools(server);
  }
  if (surface === "hosted-read") {
    registerJourneyTools(server, ctx);
  }
  return server;
}
