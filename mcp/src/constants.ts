/** Portable journey + loop labels (aligned to company-os v2.8.7). */

export const OS_VERSION = "2.8.7";
export const MCP_VERSION = "0.2.0";

export const JOURNEY_PHASES: Record<number, string> = {
  1: "Thesis",
  2: "Success definitions",
  3: "Synthetic research",
  4: "Real-world research",
  5: "Design tiny system",
  6: "Build tiny slice",
  7: "Real / realistic users",
  8: "Learn and improve",
  9: "Grow",
};

export const LOOP_STAGES: Record<number, string> = {
  1: "Synthetic user research",
  2: "Validation / concept testing",
  3: "Product building",
  4: "Testing (synthetic + automated)",
  5: "Evaluation",
  6: "Real user feedback ingestion",
  7: "Memory update and loop back",
};

export const DOC_KEYS = [
  "operating-system",
  "live-runtime",
  "ready-for-human-eyes",
  "ai-instructions",
  "first-hour",
] as const;

export type DocKey = (typeof DOC_KEYS)[number];

export const DOC_FILES: Record<DocKey, string> = {
  "operating-system": "company-os/operating-system.md",
  "live-runtime": "company-os/live-runtime.md",
  "ready-for-human-eyes": "company-os/ready-for-human-eyes.md",
  "ai-instructions": "company-os/ai-instructions.md",
  "first-hour": "company-os/first-hour.md",
};
