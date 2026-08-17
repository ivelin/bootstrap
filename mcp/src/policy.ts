/**
 * Fail-closed product policies shared by MCP tools and unit tests.
 * Keep pure (no IO) so CI can pin behavior without stdio.
 */

export type ReadyEyesStatus = "unknown" | "blocked" | "green" | string;

export interface ExternalAskDecision {
  allow: boolean;
  reason: string;
  status: ReadyEyesStatus;
  nextSteps?: string[];
}

/**
 * External product-test asks (mentor try-link, cold beta) only when human-eyes is green
 * or founder override is explicit. Green is never demand/PMF.
 */
export function evaluateExternalAsk(input: {
  readyStatus: ReadyEyesStatus;
  intent: string;
  founderOverride?: boolean;
  blockers?: string[];
}): ExternalAskDecision {
  const status = input.readyStatus ?? "unknown";
  if (status === "green") {
    return {
      allow: true,
      reason: "Ready for human eyes is green. Still not demand/PMF.",
      status,
    };
  }
  if (input.founderOverride) {
    return {
      allow: true,
      reason:
        "Founder override claimed. Require decision trace (why, risks, what not to judge).",
      status,
    };
  }
  return {
    allow: false,
    reason: "Ready for human eyes is not green.",
    status,
    nextSteps: [
      "Run cold URL + happy path",
      "Call bootstrap_set_ready_for_human_eyes with blocked or green",
      "Or founder override + bootstrap_log_decision",
    ],
  };
}

export function isPhaseAdvanceAllowed(founderApprovedPhaseChange: boolean | undefined): boolean {
  return founderApprovedPhaseChange === true;
}
