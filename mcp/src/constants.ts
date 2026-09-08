/** Portable journey + loop labels (aligned to company-os v2.8.9). */

export const OS_VERSION = "2.8.9";
export const MCP_VERSION = "0.3.1";

/** Published constitution. Hosted read adapter fetches from here; do not embed copies. */
export const PUBLISHED_REPO = "https://github.com/ivelin/bootstrap";
export const PUBLISHED_BLOB_BASE = `${PUBLISHED_REPO}/blob/main`;
export const PUBLISHED_RAW_BASE = "https://raw.githubusercontent.com/ivelin/bootstrap/main";

export const HOSTED_READ_TOOL_NAMES = [
  "bootstrap_os_info",
  "bootstrap_list_docs",
  "bootstrap_get_doc",
  "bootstrap_get_ai_instructions",
  "bootstrap_reference_clocks",
  "bootstrap_house_rule_pins",
] as const;

/** Resource-server gated tools. Unauthenticated calls return HTTP 401 + WWW-Authenticate. */
export const HOSTED_GATED_TOOL_NAMES = [
  "bootstrap_whoami",
  "bootstrap_list_company_labels",
] as const;

export function isHostedGatedToolName(name: string | undefined): boolean {
  return Boolean(name && (HOSTED_GATED_TOOL_NAMES as readonly string[]).includes(name));
}

export const PATH4_HONESTY =
  "Preview only. plugin/ + HTTP read adapter exist. Public OS tools stay unauthenticated. Gated whoami + labels: 401 + WWW-Authenticate to pirin.ai OAuth metadata (not a login UI here). Public preview on *.vercel.app is not mentee-ready boards. No public catalog submit (team Import from Repo only). Not pirin.ai. No founder company-state on a shared server. Path 1 stays the front door.";

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
  "after-proof-efficiency",
] as const;

export type DocKey = (typeof DOC_KEYS)[number];

export const DOC_FILES: Record<DocKey, string> = {
  "operating-system": "company-os/operating-system.md",
  "live-runtime": "company-os/live-runtime.md",
  "ready-for-human-eyes": "company-os/ready-for-human-eyes.md",
  "ai-instructions": "company-os/ai-instructions.md",
  "first-hour": "company-os/first-hour.md",
  "after-proof-efficiency": "company-os/after-proof-efficiency.md",
};
