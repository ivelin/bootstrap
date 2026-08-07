import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
 * Founder's company instance root (contains company/state or docs/company-os).
 * Defaults to OS root so template demos work; set BOOTSTRAP_INSTANCE_ROOT in real use.
 */
export function resolveInstanceRoot(): string {
  if (process.env.BOOTSTRAP_INSTANCE_ROOT) {
    return path.resolve(process.env.BOOTSTRAP_INSTANCE_ROOT);
  }
  return resolveOsRoot();
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
