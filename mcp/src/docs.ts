import fs from "node:fs";
import path from "node:path";
import {
  DOC_FILES,
  PUBLISHED_BLOB_BASE,
  PUBLISHED_RAW_BASE,
  type DocKey,
} from "./constants.js";
import { resolveOsRoot } from "./paths.js";

export type DocsSource = "local" | "published";

export function resolveDocsSource(): DocsSource {
  const explicit = process.env.BOOTSTRAP_OS_DOCS_SOURCE;
  if (explicit === "published" || explicit === "remote") return "published";
  if (explicit === "local") return "local";
  if (process.env.BOOTSTRAP_MCP_SURFACE === "hosted-read") return "published";
  return "local";
}

export function resolveDocsBaseUrl(): string {
  const raw = process.env.BOOTSTRAP_OS_DOCS_BASE?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return PUBLISHED_RAW_BASE;
}

export function publishedDocUrl(key: DocKey): string {
  return `${PUBLISHED_BLOB_BASE}/${DOC_FILES[key]}`;
}

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

export async function loadOsDoc(key: DocKey): Promise<string> {
  if (resolveDocsSource() !== "published") return readOsDoc(key);
  const url = `${resolveDocsBaseUrl()}/${DOC_FILES[key]}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`OS doc fetch failed ${res.status}: ${url}`);
  }
  return await res.text();
}

export async function loadOsDocList(): Promise<
  {
    key: DocKey;
    path: string;
    source: DocsSource;
    url?: string;
    published: string;
    bytes?: number;
  }[]
> {
  const source = resolveDocsSource();
  if (source !== "published") {
    return listOsDocs().map((row) => ({
      ...row,
      source,
      published: publishedDocUrl(row.key),
    }));
  }
  return (Object.keys(DOC_FILES) as DocKey[]).map((key) => ({
    key,
    path: DOC_FILES[key],
    source,
    url: `${resolveDocsBaseUrl()}/${DOC_FILES[key]}`,
    published: publishedDocUrl(key),
  }));
}
