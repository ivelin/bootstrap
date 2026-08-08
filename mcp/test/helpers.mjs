import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Isolated data root + OS root for each test suite. */
export function makeTempEnv(prefix = "bootstrap-os-test-") {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.BOOTSTRAP_OS_ROOT = REPO_ROOT;
  process.env.BOOTSTRAP_DATA_ROOT = dataRoot;
  delete process.env.BOOTSTRAP_INSTANCE_ROOT;
  delete process.env.BOOTSTRAP_STATE_PATH;
  delete process.env.BOOTSTRAP_TRACES_DIR;
  return dataRoot;
}

export function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
