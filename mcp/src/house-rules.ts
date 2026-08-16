/**
 * OS 2.8.3 house-rule reminders for the optional MCP adapter.
 * Constitution lives in company-os/*.md. This file must not invent a second OS.
 */

export type ResearchInputLabel = "stated" | "synthetic" | "observed";

export const RESEARCH_INPUT_LABELS: readonly ResearchInputLabel[] = [
  "stated",
  "synthetic",
  "observed",
] as const;

export const HOUSE_RULE_LINES = [
  "Weigh stated, synthetic, and observed. When they disagree, observed wins.",
  "A spoken yes cannot promote a customer group.",
  "Do not seed a persona from a demographic one-liner. Seed from traces. Demo-only role-play is the weak case.",
  "Do not ask a synthetic user for a Likert or a naked dollar WTP; a choice or a sentence, then map.",
  "Ready for human eyes green is not demand or PMF.",
  "AI never advances a journey phase without founder Advance / Iterate / Hold / Kill.",
] as const;

export function weighResearchInputs(input: {
  stated?: boolean;
  synthetic?: boolean;
  observed?: boolean;
}): {
  winner: ResearchInputLabel | null;
  mayPromote: boolean;
  reason: string;
} {
  if (input.observed) {
    return {
      winner: "observed",
      mayPromote: true,
      reason:
        "Observed (time or money) wins a clash. A spoken yes still cannot promote by itself.",
    };
  }
  if (input.synthetic) {
    return {
      winner: "synthetic",
      mayPromote: false,
      reason: "Synthetic may rank or kill. Promote stays hold until observed time or money.",
    };
  }
  if (input.stated) {
    return {
      winner: "stated",
      mayPromote: false,
      reason: "Stated words are clues. A spoken yes cannot promote a group.",
    };
  }
  return {
    winner: null,
    mayPromote: false,
    reason: "No research-input label yet. Write none yet rather than inventing a persona.",
  };
}

export function spokenYesMayPromote(): false {
  return false;
}

export function demographicOneLinerIsValidSeed(): false {
  return false;
}

export function likertOrNakedDollarWtpAllowed(): false {
  return false;
}
