# Bootstrap OS MCP (optional)

**Markdown is still the product.** This package is an *optional* adapter so agents can call Bootstrap OS as tools instead of only reading docs.

| Mode | Who it is for | Dependency |
|------|----------------|------------|
| **1. Repo only** | Everyone | None — copy templates, paste `ai-instructions` |
| **2. Local MCP** | Founders who want tools + multi-agent clients | Node 20+, this package, local state file |
| **3. Hosted MCP (future)** | Zero-install convenience | Connect client to pirin.ai URL; same tool names |

State always belongs to **your company instance** (your disk or your private store). The template under `company-os/` stays process-only.

---

## Tools (v0.1)

| Tool | Purpose |
|------|---------|
| `bootstrap_os_info` | Modes, versions, resolved paths |
| `bootstrap_list_docs` | List blueprint docs |
| `bootstrap_get_doc` | Read OS markdown by key |
| `bootstrap_get_ai_instructions` | Thin always-on rules |
| `bootstrap_reference_clocks` | Journey 1–9 + loop 1–7 labels |
| `bootstrap_get_state` | Read `company-state.json` |
| `bootstrap_where_are_we` | Plain-language control plane |
| `bootstrap_update_state` | Patch state (phase advance gated) |
| `bootstrap_set_ready_for_human_eyes` | unknown / blocked / green |
| `bootstrap_ready_checklist` | Checklist + current status |
| `bootstrap_log_decision` | Append decision trace markdown |
| `bootstrap_refuse_external_ask_if_not_green` | Fail-closed external product-test policy |

Hard rules encoded in tools:

- Journey phase does **not** change unless `founderApprovedPhaseChange=true`
- Human-eyes **green** is not demand or PMF
- Blueprint files under `company-os/` are never written by the MCP

---

## Install (local)

From this repo:

```bash
cd mcp
npm install
npm run build
```

Point the server at **your** company instance (not only the template):

```bash
export BOOTSTRAP_OS_ROOT=/path/to/bootstrap        # this template clone
export BOOTSTRAP_INSTANCE_ROOT=/path/to/your-company
# optional overrides:
# export BOOTSTRAP_STATE_PATH=/path/to/company-state.json
# export BOOTSTRAP_TRACES_DIR=/path/to/company/traces
```

Default state path: `$BOOTSTRAP_INSTANCE_ROOT/company/state/company-state.json`  
(falls back to template `templates/company/state/company-state.json` if present).

Run (stdio — for MCP clients):

```bash
npm start
# or: node dist/index.js
```

---

## Client config examples

### Cursor / Claude Desktop style (stdio)

See [`config/mcp.stdio.example.json`](config/mcp.stdio.example.json).

```json
{
  "mcpServers": {
    "bootstrap-os": {
      "command": "node",
      "args": ["/absolute/path/to/bootstrap/mcp/dist/index.js"],
      "env": {
        "BOOTSTRAP_OS_ROOT": "/absolute/path/to/bootstrap",
        "BOOTSTRAP_INSTANCE_ROOT": "/absolute/path/to/your-company"
      }
    }
  }
}
```

### Hosted (future)

```json
{
  "mcpServers": {
    "bootstrap-os": {
      "url": "https://mcp.pirin.ai/bootstrap-os"
    }
  }
}
```

Hosted URL is a **placeholder** until pirin.ai ships it. Local tool names will stay stable so you can switch clients without rewriting agent prompts.

---

## Privacy

| Data | Local MCP | Hosted (planned) |
|------|-----------|------------------|
| Blueprint docs | Read from your clone | Served from template |
| Company state | **Your disk only** | Private by default; opt-in share later |
| Leaderboards / social | **Out of scope for v0.1** | Optional later; never default-on |

---

## Non-goals (v0.1)

- Replacing the open-source markdown pack
- Auto-advancing journey phases
- Multi-tenant leaderboard
- Writing into `company-os/` template files

---

*You supply the insight. AI supplies the speed. MCP is optional furniture.*

## Roadmap

High-impact plan, dogfood protocol, and kill criteria: [`../ROADMAP.md`](../ROADMAP.md).
