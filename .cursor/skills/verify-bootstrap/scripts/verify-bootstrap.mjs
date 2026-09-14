#!/usr/bin/env node
/**
 * Verification-only control helper for Bootstrap OS hosted MCP.
 * Does not change product behavior. Does not attach prod identity.
 * Never set VERCEL_ENV=production. Never live-probe supabase-pirin-ai.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SKILL_ROOT, "../../..");
const MCP_DIR = path.join(REPO_ROOT, "mcp");
const HTTP_ENTRY = path.join(MCP_DIR, "dist", "http.js");

const COLLAB_HOST = "mcp.bootstrap.pirin.ai";
const COLLAB_RESOURCE = "https://mcp.bootstrap.pirin.ai/mcp";
const COLLAB_METADATA =
  "https://mcp.bootstrap.pirin.ai/.well-known/oauth-protected-resource";
const PIRIN_LOGIN = "https://pirin.ai/bootstrap-os/login";
const EXPECTED_CHALLENGE =
  `Bearer realm="bootstrap-os-mcp", resource_metadata="${COLLAB_METADATA}", resource="${COLLAB_RESOURCE}", scope="bootstrap-os"`;

const RUN_DIR = process.env.VERIFY_BOOTSTRAP_RUN_DIR || "/tmp/verify-bootstrap-run";
const EVIDENCE_DIR =
  process.env.VERIFY_BOOTSTRAP_EVIDENCE_DIR || path.join(SKILL_ROOT, "artifacts");
const STATE_PATH = path.join(RUN_DIR, "state.json");

const FEATURES = {
  "hosted-handshake-whoami": driveHostedHandshakeWhoami,
  "invite-member": () =>
    driveNamedTest(
      "invite-member",
      "P1 invite_member: Ivelin invites Bill to zk0",
      "test/e2e-roleplay-matrix.test.mjs",
    ),
  "accept-invite-claim": () =>
    driveNamedTest(
      "accept-invite-claim",
      "P2 accept_invite: Bill lands on zk0",
      "test/e2e-roleplay-matrix.test.mjs",
    ),
  "invite-signup-login-url": () =>
    driveNamedTest(
      "invite-signup-login-url",
      "P3 Invitee login-URL",
      "test/e2e-roleplay-matrix.test.mjs",
    ),
  "journey-board": () =>
    driveJourneyBoard(),
};

function usage() {
  return `Usage:
  node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs launch
  node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs doctor
  node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs drive <feature>
  node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs cleanup

Features: ${Object.keys(FEATURES).join(", ")}

Env:
  VERIFY_BOOTSTRAP_RUN_DIR       scratch + pid (default /tmp/verify-bootstrap-run)
  VERIFY_BOOTSTRAP_EVIDENCE_DIR  proof that survives cleanup (default skill artifacts/)
`;
}

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    die(`No run state at ${STATE_PATH}. Run launch first.`);
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function refuseProdIdentity() {
  if (process.env.VERCEL_ENV === "production") {
    die(
      "Refusing to launch: VERCEL_ENV=production is set. Local verification must not attach prod identity.",
    );
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("failed to bind ephemeral port"));
        return;
      }
      const port = addr.port;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitHealth(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      last = await res.text();
      if (res.status === 200 && last.trim() === "ok") return last;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`health not ready at ${url}: ${last}`);
}

function mcpHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...extra,
  };
}

function initBody(id = 1) {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "verify-bootstrap", version: "0.0.0" },
    },
  };
}

function captureFetch(label, url, init = {}) {
  const target = new URL(url);
  const method = init.method || "GET";
  const headers = { ...(init.headers || {}) };
  const body = init.body ? String(init.body) : null;
  if (body && !headers["Content-Length"] && !headers["content-length"]) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const outHeaders = {};
          for (const [key, value] of Object.entries(res.headers)) {
            outHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
          }
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({
            label,
            request: { url, method, headers, body },
            status: res.statusCode ?? 0,
            headers: outHeaders,
            text,
            json,
          });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function writeEvidence(featureId, filename, payload) {
  const dir = path.join(EVIDENCE_DIR, featureId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) + "\n";
  fs.writeFileSync(dest, body);
  return dest;
}

function challengeOk(value) {
  return value === EXPECTED_CHALLENGE;
}

async function cmdLaunch() {
  refuseProdIdentity();
  if (!fs.existsSync(HTTP_ENTRY)) {
    die(`Missing ${HTTP_ENTRY}. From mcp/: npm ci && npm run build`);
  }
  if (fs.existsSync(STATE_PATH)) {
    const existing = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (existing.pid && pidAlive(existing.pid)) {
      die(
        `A verification instance is already running (pid ${existing.pid} at ${existing.url}). Run cleanup first.`,
      );
    }
  }

  const port = await freePort();
  fs.mkdirSync(RUN_DIR, { recursive: true });
  const stdoutPath = path.join(RUN_DIR, "http.stdout.log");
  const stderrPath = path.join(RUN_DIR, "http.stderr.log");
  const stdout = fs.openSync(stdoutPath, "w");
  const stderr = fs.openSync(stderrPath, "w");

  const env = { ...process.env };
  delete env.VERCEL_ENV;
  delete env.BOOTSTRAP_SUPABASE_URL;
  delete env.BOOTSTRAP_SUPABASE_ANON_KEY;
  delete env.BOOTSTRAP_SUPABASE_SERVICE_ROLE_KEY;
  env.BOOTSTRAP_MCP_HTTP_HOST = "127.0.0.1";
  env.BOOTSTRAP_MCP_HTTP_PORT = String(port);
  env.BOOTSTRAP_OS_DOCS_SOURCE = env.BOOTSTRAP_OS_DOCS_SOURCE || "published";

  const child = spawn(process.execPath, [HTTP_ENTRY], {
    cwd: MCP_DIR,
    env,
    stdio: ["ignore", stdout, stderr],
    detached: true,
  });
  child.unref();

  const url = `http://127.0.0.1:${port}/mcp`;
  const health = `http://127.0.0.1:${port}/health`;
  try {
    await waitHealth(health);
  } catch (e) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    die(e instanceof Error ? e.message : String(e));
  }

  const state = {
    pid: child.pid,
    port,
    host: "127.0.0.1",
    url,
    health,
    startedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    httpEntry: HTTP_ENTRY,
    stdoutPath,
    stderrPath,
  };
  writeState(state);
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: "launch",
        ready: `GET ${health} → 200 ok`,
        ...state,
      },
      null,
      2,
    ),
  );
}

async function collectDoctor() {
  const state = readState();
  const checks = [];
  const alive = Boolean(state.pid && pidAlive(state.pid));
  checks.push({
    name: "process",
    ok: alive,
    detail: alive ? `pid ${state.pid} alive` : `pid ${state.pid} not running`,
  });

  const health = await captureFetch("health", state.health);
  checks.push({
    name: "health",
    ok: health.status === 200 && health.text.trim() === "ok",
    detail: `${health.status} ${JSON.stringify(health.text)}`,
  });

  const wellKnown = await captureFetch(
    "oauth-protected-resource",
    `http://127.0.0.1:${state.port}/.well-known/oauth-protected-resource`,
  );
  const authServers = wellKnown.json?.authorization_servers;
  checks.push({
    name: "well-known",
    ok:
      wellKnown.status === 200 &&
      Array.isArray(authServers) &&
      authServers.includes(PIRIN_LOGIN),
    detail: wellKnown.json
      ? JSON.stringify({
          resource: wellKnown.json.resource,
          authorization_servers: wellKnown.json.authorization_servers,
        })
      : wellKnown.text,
  });

  const whoami = await captureFetch("whoami-no-bearer", state.url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "bootstrap_whoami", arguments: {} },
    }),
  });
  checks.push({
    name: "whoami-401",
    ok:
      whoami.status === 401 &&
      whoami.json?.error === "invalid_token" &&
      whoami.json?.reason === "missing_or_short_token" &&
      challengeOk(whoami.headers["www-authenticate"]),
    detail: `${whoami.status} reason=${whoami.json?.reason} identityStore=${whoami.json?.identityStore}`,
  });

  const localInit = await captureFetch("initialize-loopback", state.url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify(initBody(11)),
  });
  checks.push({
    name: "initialize-loopback-open",
    ok: localInit.status === 200 && localInit.json?.result?.serverInfo?.name === "bootstrap-os",
    detail: `${localInit.status} server=${localInit.json?.result?.serverInfo?.name ?? localInit.text.slice(0, 120)}`,
  });

  const collabInit = await captureFetch("initialize-collab-host", state.url, {
    method: "POST",
    headers: mcpHeaders({ Host: COLLAB_HOST }),
    body: JSON.stringify(initBody(12)),
  });
  checks.push({
    name: "initialize-collab-401",
    ok:
      collabInit.status === 401 &&
      collabInit.json?.error === "invalid_token" &&
      challengeOk(collabInit.headers["www-authenticate"]),
    detail: `${collabInit.status} ${collabInit.json?.error ?? collabInit.text.slice(0, 120)}`,
  });

  return { state, checks, captures: { health, wellKnown, whoami, localInit, collabInit } };
}

async function cmdDoctor() {
  const { state, checks } = await collectDoctor();
  const ok = checks.every((c) => c.ok);
  const report = {
    ok,
    command: "doctor",
    url: state.url,
    pid: state.pid,
    port: state.port,
    identityStoreExpected: "unset",
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

async function driveHostedHandshakeWhoami() {
  const { state, checks, captures } = await collectDoctor();
  if (!checks.every((c) => c.ok)) {
    writeEvidence("hosted-handshake-whoami", "doctor-failed.json", { checks, captures });
    die("doctor failed before drive; see artifacts/hosted-handshake-whoami/doctor-failed.json");
  }

  const getSse = await captureFetch("get-sse-collab-host", state.url, {
    method: "GET",
    headers: { Accept: "text/event-stream", Host: COLLAB_HOST },
  });
  const getSseOk =
    getSse.status === 401 &&
    getSse.json?.error === "invalid_token" &&
    challengeOk(getSse.headers["www-authenticate"]);

  const labels = await captureFetch("labels-no-bearer", state.url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 20,
      method: "tools/call",
      params: { name: "bootstrap_list_company_labels", arguments: {} },
    }),
  });
  const labelsOk =
    labels.status === 401 &&
    labels.json?.reason === "missing_or_short_token" &&
    labels.json?.labels === undefined;

  const proof = {
    featureId: "hosted-handshake-whoami",
    drivenAt: new Date().toISOString(),
    instance: { pid: state.pid, url: state.url, port: state.port },
    action: {
      health: "GET /health",
      whoami: "POST /mcp tools/call bootstrap_whoami without Authorization",
      handshake: `POST /mcp initialize with Host: ${COLLAB_HOST}`,
      sse: `GET /mcp with Host: ${COLLAB_HOST}`,
    },
    resultingState: {
      health: captures.health.text.trim(),
      whoamiStatus: captures.whoami.status,
      whoamiReason: captures.whoami.json?.reason,
      whoamiIdentityStore: captures.whoami.json?.identityStore,
      wwwAuthenticate: captures.whoami.headers["www-authenticate"],
      loopbackInitialize: captures.localInit.status,
      collabInitialize: captures.collabInit.status,
      getSse: getSse.status,
      labelsStatus: labels.status,
    },
    ok:
      checks.every((c) => c.ok) &&
      getSseOk &&
      labelsOk &&
      captures.whoami.json?.labels === undefined,
  };

  const proofPath = writeEvidence("hosted-handshake-whoami", "proof.json", proof);
  writeEvidence("hosted-handshake-whoami", "whoami-401.json", captures.whoami);
  writeEvidence("hosted-handshake-whoami", "initialize-collab-401.json", captures.collabInit);
  writeEvidence("hosted-handshake-whoami", "initialize-loopback-200.json", captures.localInit);
  writeEvidence("hosted-handshake-whoami", "get-sse-collab-401.json", getSse);
  writeEvidence("hosted-handshake-whoami", "health.txt", captures.health.text);
  writeEvidence("hosted-handshake-whoami", "well-known.json", captures.wellKnown.json ?? captures.wellKnown.text);

  if (!proof.ok) {
    die(`hosted-handshake-whoami failed; see ${proofPath}`);
  }
  console.log(JSON.stringify({ ok: true, command: "drive", featureId: "hosted-handshake-whoami", proofPath }, null, 2));
}

async function runNodeTest(testFile, namePattern) {
  const args = ["--test", "--test-name-pattern", namePattern, testFile];
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn(process.execPath, args, {
      cwd: MCP_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => chunks.push(d));
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString("utf8") });
    });
  });
}

async function driveNamedTest(featureId, namePattern, testFile) {
  const result = await runNodeTest(testFile, namePattern);
  const tapPath = writeEvidence(featureId, "e2e.tap.txt", result.output);
  const proof = {
    featureId,
    drivenAt: new Date().toISOString(),
    harness: `cd mcp && node --test --test-name-pattern ${JSON.stringify(namePattern)} ${testFile}`,
    exitCode: result.code,
    tapPath,
    ok: result.code === 0,
  };
  const proofPath = writeEvidence(featureId, "proof.json", proof);
  if (!proof.ok) {
    die(`${featureId} failed (exit ${result.code}); see ${proofPath}`);
  }
  console.log(JSON.stringify({ ok: true, command: "drive", featureId, proofPath, tapPath }, null, 2));
}

async function driveJourneyBoard() {
  const state = readState();
  const gated = await captureFetch("get-journey-no-bearer", state.url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 30,
      method: "tools/call",
      params: { name: "get_journey", arguments: { company: "corehaul" } },
    }),
  });
  const gatedOk =
    gated.status === 401 &&
    gated.json?.error === "invalid_token" &&
    challengeOk(gated.headers["www-authenticate"]);
  writeEvidence("journey-board", "get-journey-401.json", gated);

  const result = await runNodeTest("test/journey-tools.test.mjs", "company query returns every idea");
  const tapPath = writeEvidence("journey-board", "e2e.tap.txt", result.output);
  const proof = {
    featureId: "journey-board",
    drivenAt: new Date().toISOString(),
    instance: { pid: state.pid, url: state.url },
    action: {
      live: "POST /mcp tools/call get_journey without Authorization",
      fixture: 'cd mcp && node --test --test-name-pattern "company query returns every idea" test/journey-tools.test.mjs',
    },
    resultingState: {
      liveStatus: gated.status,
      liveReason: gated.json?.reason,
      fixtureExit: result.code,
    },
    ok: gatedOk && result.code === 0,
    tapPath,
  };
  const proofPath = writeEvidence("journey-board", "proof.json", proof);
  if (!proof.ok) {
    die(`journey-board failed; see ${proofPath}`);
  }
  console.log(JSON.stringify({ ok: true, command: "drive", featureId: "journey-board", proofPath }, null, 2));
}

async function cmdDrive(featureId) {
  if (!featureId || !FEATURES[featureId]) {
    die(`Unknown feature ${featureId || "(missing)"}.\n${usage()}`);
  }
  readState();
  await FEATURES[featureId]();
}

function cmdCleanup() {
  if (!fs.existsSync(STATE_PATH)) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "cleanup",
          note: "no run state; nothing to tear down",
          evidenceDir: EVIDENCE_DIR,
        },
        null,
        2,
      ),
    );
    return;
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  if (state.pid && pidAlive(state.pid)) {
    try {
      process.kill(state.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && pidAlive(state.pid)) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    if (pidAlive(state.pid)) {
      try {
        process.kill(state.pid, "SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }
  for (const name of ["http.stdout.log", "http.stderr.log", "state.json"]) {
    const p = path.join(RUN_DIR, name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: "cleanup",
        killedPid: state.pid ?? null,
        evidenceDir: EVIDENCE_DIR,
        evidenceKept: true,
      },
      null,
      2,
    ),
  );
}

const [command, featureId] = process.argv.slice(2);
if (command === "launch") {
  await cmdLaunch();
} else if (command === "doctor") {
  await cmdDoctor();
} else if (command === "drive") {
  await cmdDrive(featureId);
} else if (command === "cleanup") {
  cmdCleanup();
} else {
  die(usage());
}
