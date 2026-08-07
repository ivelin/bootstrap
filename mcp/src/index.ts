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

const server = new McpServer({
  name: "bootstrap-os",
  version: MCP_VERSION,
});

server.tool(
  "bootstrap_os_info",
  "Bootstrap OS + MCP modes, versions, and resolved local paths. Does not require company state.",
  {},
  async () => {
    return text({
      osVersion: OS_VERSION,
      mcpVersion: MCP_VERSION,
      modes: {
        markdownOnly:
          "Use company-os/*.md and templates/ with no MCP. Full ownership, offline.",
        localMcp:
          "Run this stdio server; agents call tools; state stays on disk under BOOTSTRAP_INSTANCE_ROOT.",
        hostedMcpFuture:
          "Same tool names via https://mcp.pirin.ai/bootstrap-os (or successor). Opt-in; private by default. Not required.",
      },
      paths: {
        osRoot: resolveOsRoot(),
        instanceRoot: resolveInstanceRoot(),
        statePath: resolveStatePath(),
        tracesDir: resolveTracesDir(),
      },
      env: {
        BOOTSTRAP_OS_ROOT: process.env.BOOTSTRAP_OS_ROOT ?? null,
        BOOTSTRAP_INSTANCE_ROOT: process.env.BOOTSTRAP_INSTANCE_ROOT ?? null,
        BOOTSTRAP_STATE_PATH: process.env.BOOTSTRAP_STATE_PATH ?? null,
        BOOTSTRAP_TRACES_DIR: process.env.BOOTSTRAP_TRACES_DIR ?? null,
      },
      hardRules: [
        "AI never advances journey phase without founder approval",
        "Ready for human eyes green is not demand or PMF",
        "Company state belongs to the founder instance, not the template",
      ],
    });
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
      .describe("operating-system | live-runtime | ready-for-human-eyes | ai-instructions"),
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
  "Read the founder's durable company-state.json (instance path, not template by default when BOOTSTRAP_INSTANCE_ROOT is set).",
  {},
  async () => {
    try {
      return text({ path: resolveStatePath(), state: readState() });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_where_are_we",
  "Clear company status: plain-language + structured control plane (two clocks, human-eyes, open questions, scores). Prefer this for 'where are we?'.",
  {},
  async () => {
    try {
      const state = readState();
      const plain = whereAreWePlain(state);
      return text(buildStatusView(state, plain));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_next_evidence",
  "What evidence is needed to advance the slow journey phase and to progress the fast loop stage — plus agent focus (gather evidence vs do work vs stage-7 write-back). Does not advance phases.",
  {},
  async () => {
    try {
      return text(buildNextEvidenceView(readState()));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_agent_focus",
  "Short work order for founder agents: mode + do-now / do-not based on current phase, loop stage, and human-eyes. Use when starting a session.",
  {},
  async () => {
    try {
      const v = buildNextEvidenceView(readState());
      return text({
        plain: [v.agentFocus.modePlain, "", "Do now:", ...v.agentFocus.doNow.map((x) => `- ${x}`), "", "Do not:", ...v.agentFocus.doNotDo.slice(0, 8).map((x) => `- ${x}`)].join("\n"),
        ...v.agentFocus,
        slowClock: { phase: v.slowClock.currentPhase, name: v.slowClock.currentName, exitSignal: v.slowClock.exitSignal },
        fastClock: { stage: v.fastClock.currentStage, name: v.fastClock.currentName, completeWhen: v.fastClock.completeWhen },
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
  "Patch company state fields. Journey phase changes require founderApprovedPhaseChange=true after explicit founder decision. Does not rewrite OS blueprint files.",
  {
    companyId: z.string().optional(),
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
      const { founderApprovedPhaseChange, scores, ...rest } = args;
      const patch: Record<string, unknown> = { ...rest };
      if (scores) patch.scores = scores;
      const { state, warnings } = patchState(patch as never, {
        allowPhaseAdvance: Boolean(founderApprovedPhaseChange),
      });
      return text({ ok: true, warnings, state, path: resolveStatePath() });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_set_ready_for_human_eyes",
  "Update Ready for human eyes ship gate (unknown | blocked | green). Green is not demand/PMF. Prefer blockers when blocked.",
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
        notes.push(
          "You may draft external product-test asks only now (or with founder override + decision trace).",
        );
      }
      if (status === "blocked") {
        notes.push(
          "Do not draft mentor/user 'try my link' asks until green or explicit founder override + decision trace.",
        );
      }
      return text({
        ok: true,
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
  "Return the portable Ready for human eyes checklist markdown plus current status from state if available.",
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
      return text({ current, checklist });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_log_decision",
  "Append a founder-readable decision trace markdown under company/traces (or BOOTSTRAP_TRACES_DIR).",
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
      return text({ ok: true, file });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
);

server.tool(
  "bootstrap_refuse_external_ask_if_not_green",
  "Policy helper: given intent to ask outsiders to try a product link, return allow/deny with plain-language blockers.",
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
      if (status === "green") {
        return text({
          allow: true,
          reason: "Ready for human eyes is green. Still not demand/PMF.",
          intent,
        });
      }
      if (founderOverride) {
        return text({
          allow: true,
          reason:
            "Founder override claimed. Require decision trace (why, risks, what not to judge).",
          intent,
          status,
        });
      }
      return text({
        allow: false,
        reason: "Ready for human eyes is not green.",
        status,
        blockers: state.readyForHumanEyes?.blockers ?? [],
        nextSteps: [
          "Run cold URL + happy path (sandbox browser / other device / synthetic cold user)",
          "Call bootstrap_set_ready_for_human_eyes with blocked or green",
          "Or founder override + bootstrap_log_decision",
        ],
        intent,
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
