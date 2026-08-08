/**
 * M1 automated gate: spawn MCP over stdio via official SDK client.
 * Exercises multi-company tools, phase gate, refuse external ask.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(MCP_ROOT, "..");
const SERVER_JS = path.join(MCP_ROOT, "dist", "index.js");

function parseToolText(result) {
  assert.ok(result?.content?.length, "tool result missing content");
  const text = result.content.map((c) => ("text" in c ? c.text : "")).join("\n");
  if (result.isError) {
    const err = new Error(text);
    err.isToolError = true;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return parseToolText(result);
}

async function main() {
  assert.ok(fs.existsSync(SERVER_JS), `build missing: ${SERVER_JS}`);

  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-stdio-mcp-"));

  const env = { ...process.env };
  env.BOOTSTRAP_OS_ROOT = REPO_ROOT;
  env.BOOTSTRAP_DATA_ROOT = dataRoot;
  delete env.BOOTSTRAP_INSTANCE_ROOT;
  delete env.BOOTSTRAP_STATE_PATH;
  delete env.BOOTSTRAP_TRACES_DIR;

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_JS],
    cwd: MCP_ROOT,
    stderr: "pipe",
    env,
  });

  const client = new Client({ name: "bootstrap-os-stdio-smoke", version: "0.0.0" });
  let stderrBuf = "";
  transport.stderr?.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    const required = [
      "bootstrap_os_info",
      "bootstrap_list_companies",
      "bootstrap_init_company",
      "bootstrap_use_company",
      "bootstrap_where_are_we",
      "bootstrap_get_state",
      "bootstrap_update_state",
      "bootstrap_refuse_external_ask_if_not_green",
      "bootstrap_get_ai_instructions",
    ];
    for (const n of required) {
      assert.ok(names.includes(n), `missing tool ${n}`);
    }
    assert.ok(names.length >= 15, `expected full tool surface, got ${names.length}`);

    const info = await call(client, "bootstrap_os_info");
    assert.equal(info.mcpVersion, "0.2.0");
    assert.equal(path.resolve(info.paths.dataRoot), path.resolve(dataRoot));

    for (const id of ["pirin", "zk0", "tokbox"]) {
      const r = await call(client, "bootstrap_init_company", {
        companyId: id,
        displayName: id,
        hypothesis: `${id} hypothesis under stdio smoke`,
      });
      assert.equal(r.companyId, id);
      assert.equal(r.created, true);
      assert.equal(r.ok, true);
    }

    const listed = await call(client, "bootstrap_list_companies");
    assert.ok(listed.companies.length >= 3);

    await call(client, "bootstrap_use_company", { companyId: "pirin" });
    const where = await call(client, "bootstrap_where_are_we", {});
    const whereBlob = JSON.stringify(where);
    assert.match(whereBlob, /pirin/i);

    const denied = await call(client, "bootstrap_update_state", {
      journeyPhase: 5,
      founderApprovedPhaseChange: false,
    });
    assert.equal(denied.state.journeyPhase, 1);
    assert.ok(
      (denied.warnings || []).some((w) => /founder/i.test(w)),
      `expected founder warning, got ${JSON.stringify(denied.warnings)}`,
    );

    const allowed = await call(client, "bootstrap_update_state", {
      journeyPhase: 5,
      founderApprovedPhaseChange: true,
    });
    assert.equal(allowed.state.journeyPhase, 5);

    await call(client, "bootstrap_use_company", { companyId: "zk0" });
    const zk0 = await call(client, "bootstrap_get_state", {});
    assert.equal(zk0.state.journeyPhase, 1);
    assert.equal(zk0.state.companyId, "zk0");

    const refuse = await call(client, "bootstrap_refuse_external_ask_if_not_green", {
      intent: "email mentor a try-link",
    });
    assert.equal(refuse.allow, false);

    const ai = await call(client, "bootstrap_get_ai_instructions", {});
    assert.ok(String(typeof ai === "string" ? ai : JSON.stringify(ai)).length > 200);

    const diskPirin = JSON.parse(
      fs.readFileSync(
        path.join(dataRoot, "instances", "pirin", "company", "state", "company-state.json"),
        "utf8",
      ),
    );
    assert.equal(diskPirin.journeyPhase, 5);

    console.log(
      JSON.stringify(
        {
          ok: true,
          gate: "M1-stdio-protocol",
          tools: names.length,
          dataRoot,
          companies: ["pirin", "zk0", "tokbox"],
          pirinPhase: diskPirin.journeyPhase,
          refuseAllow: refuse.allow,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error("stdio MCP client smoke FAILED");
    console.error(e);
    if (stderrBuf) console.error("--- server stderr ---\n", stderrBuf);
    process.exitCode = 1;
  } finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
    fs.rmSync(dataRoot, { recursive: true, force: true });
  }
}

main();
