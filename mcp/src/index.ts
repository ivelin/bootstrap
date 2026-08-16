#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  DOC_KEYS,
  JOURNEY_PHASES,
  LOOP_STAGES,
  MCP_VERSION,
  OS_VERSION,
  type DocKey,
} from "./constants.js";
import { listOsDocs, readOsDoc } from "./docs.js";
import {
  initCompany,
  listCompanies,
  requireActiveContext,
  resolveDataRoot,
  useCompany,
} from "./companies.js";
import {
  resolveInstanceRoot,
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
import { HOUSE_RULE_LINES } from "./house-rules.js";

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

const server = new McpServer({
  name: "bootstrap-os",
  version: MCP_VERSION,
});

server.tool(
  "bootstrap_os_info",
  "Bootstrap OS + MCP modes, versions, multi-company data root, and active company paths.",
  {},
  async () => {
    const ctx = requireActiveContext();
    return text({
      osVersion: OS_VERSION,
      mcpVersion: MCP_VERSION,
      connectorModel:
        "Optional path 3 adapter: one MCP connector, many isolated company instances. Not a second OS. Markdown is the constitution.",
      adoptionOrder: {
        path1: "Point an AI at https://github.com/ivelin/bootstrap — no install, no MCP.",
        path2: "Optional instance files / ./scripts/install-instance.sh + optional .grok/workflows.",
        path3: "This local MCP (optional, several ideas). Same company-state.json + where-are-we.py.",
        path4Hosted: "Does not exist. Nothing to connect to today.",
      },
      modes: {
        markdownOnly:
          "Path 1–2. Use company-os/*.md and templates/ with no MCP. Full ownership, offline.",
        localMcpMultiCompany:
          "Path 3. One stdio server; bootstrap_init_company / list / use_company; state under BOOTSTRAP_DATA_ROOT/instances/<id>.",
        localMcpSingleEnv:
          "Optional BOOTSTRAP_INSTANCE_ROOT pins one company (backward compatible).",
        hostedMcpFuture:
          "Path 4. Does not exist. Same tool names later if ever shipped. Nothing to connect to today.",
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
    });
  },
);

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
  "bootstrap_list_docs",
  "List portable Bootstrap OS blueprint docs available as resources/tools.",
  {},
  async () => text(listOsDocs()),
);

server.tool(
  "bootstrap_get_doc",
  "Read a portable Bootstrap OS document (blueprint/runtime/checklist/ai instructions). Process only — not another company's filled state.",
  {
    doc: z
      .enum(DOC_KEYS as unknown as [DocKey, ...DocKey[]])
      .describe(
        "operating-system | live-runtime | ready-for-human-eyes | ai-instructions | first-hour",
      ),
  },
  async ({ doc }) => {
    try {
      return text(readOsDoc(doc));
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
      return text(readOsDoc("ai-instructions"));
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
      const checklist = readOsDoc("ready-for-human-eyes");
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
