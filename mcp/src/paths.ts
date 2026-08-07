import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireActiveContext, resolveDataRoot } from "./companies.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the Bootstrap OS template clone (contains company-os/). */
export function resolveOsRoot(): string {
  if (process.env.BOOTSTRAP_OS_ROOT) {
    return path.resolve(process.env.BOOTSTRAP_OS_ROOT);
  }
  // mcp/dist -> mcp -> repo root
  return path.resolve(__dirname, "..", "..");
}

/**
 * Active company instance root (isolated control plane).
 * Priority: bootstrap_use_company session → BOOTSTRAP_INSTANCE_ROOT → registry active → template demo.
 */
export function resolveInstanceRoot(): string {
  return requireActiveContext().instanceRoot;
}

export function resolveStatePath(): string {
  if (process.env.BOOTSTRAP_STATE_PATH) {
    return path.resolve(process.env.BOOTSTRAP_STATE_PATH);
  }
  const instance = resolveInstanceRoot();
  const candidates = [
    path.join(instance, "company", "state", "company-state.json"),
    path.join(instance, "templates", "company", "state", "company-state.json"),
    path.join(instance, "company-state.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

export function resolveTracesDir(): string {
  if (process.env.BOOTSTRAP_TRACES_DIR) {
    return path.resolve(process.env.BOOTSTRAP_TRACES_DIR);
  }
  return path.join(resolveInstanceRoot(), "company", "traces");
}

export { resolveDataRoot };
