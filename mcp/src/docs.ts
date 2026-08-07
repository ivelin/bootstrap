import fs from "node:fs";
import path from "node:path";
import { DOC_FILES, type DocKey } from "./constants.js";
import { resolveOsRoot } from "./paths.js";

export function readOsDoc(key: DocKey): string {
  const rel = DOC_FILES[key];
  const full = path.join(resolveOsRoot(), rel);
  if (!fs.existsSync(full)) {
    throw new Error(
      `OS doc not found: ${full}. Set BOOTSTRAP_OS_ROOT to the Bootstrap OS repo root.`,
    );
  }
  return fs.readFileSync(full, "utf8");
}

export function listOsDocs(): { key: DocKey; path: string; bytes: number }[] {
  const root = resolveOsRoot();
  return (Object.keys(DOC_FILES) as DocKey[]).map((key) => {
    const full = path.join(root, DOC_FILES[key]);
    const bytes = fs.existsSync(full) ? fs.statSync(full).size : 0;
    return { key, path: DOC_FILES[key], bytes };
  });
}
