# Bootstrap OS MCP (optional)

**What this is / is not:** see root [`ROADMAP.md` §0](../ROADMAP.md) — MCP is an optional tool adapter to the control plane, not a harness, memory product, or hosted social graph.

**Markdown is still the product.** This package is an *optional* **one connector, many isolated companies** adapter (same idea as Supabase/Vercel multi-project MCP). Founders do **not** need to import the full Bootstrap repo into each product monorepo.

| Mode | Who it is for | Dependency |
|------|----------------|------------|
| **1. Repo only** | Everyone | None — copy templates, paste `ai-instructions` |
| **2. Local MCP (multi-company)** | Founders with one or many ideas | Node 20+, this package, local data root |
| **3. Hosted MCP (future)** | Zero-install convenience | Same tool names + company scope; private by default |

State always belongs to **one company instance at a time**. Isolation is hard: no shared phase/evidence across `companyId`.

---

## Connector model

```text
  One bootstrap-os MCP process
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
   pirin  zk0  tokbox   ← isolated instances under BOOTSTRAP_DATA_ROOT
```

| Path | Role |
|------|------|
| `$BOOTSTRAP_DATA_ROOT` (default `~/.bootstrap-os`) | Registry + instances |
| `…/registry.json` | Active company + catalog |
| `…/instances/<companyId>/` | That company's state + traces only |

Product code (pirin app, zk0, …) stays in its own repo. Point the agent at this connector once.

---

## Tools (v0.2)

### Multi-company

| Tool | Purpose |
|------|---------|
| `bootstrap_list_companies` | List instances + which is active |
| `bootstrap_init_company` | Create isolated instance (state + traces) |
| `bootstrap_use_company` | Switch active company for session + registry |

### Process / active company only

| Tool | Purpose |
|------|---------|
| `bootstrap_os_info` | Modes, versions, data root, active paths |
| `bootstrap_list_docs` / `bootstrap_get_doc` / `bootstrap_get_ai_instructions` | Blueprint |
| `bootstrap_reference_clocks` | Journey 1–9 + loop 1–7 |
| `bootstrap_get_state` | Active `company-state.json` |
| `bootstrap_where_are_we` | Status visibility (active only) |
| `bootstrap_next_evidence` | Evidence for next phase/stage |
| `bootstrap_agent_focus` | Session work order |
| `bootstrap_update_state` | Patch active (phase advance gated) |
| `bootstrap_set_ready_for_human_eyes` | unknown / blocked / green |
| `bootstrap_ready_checklist` | Checklist + status |
| `bootstrap_log_decision` | Trace under active company |
| `bootstrap_refuse_external_ask_if_not_green` | Fail-closed external asks |

Hard rules:

- Journey phase does **not** change unless `founderApprovedPhaseChange=true`
- Human-eyes **green** is not demand or PMF
- Blueprint under `company-os/` is never written by MCP
- **Busy is not progress** — activity without evidence is not advancement
- **No cross-company writes**

---

## Install (local)

From the Bootstrap OS clone:

```bash
cd mcp
npm install
npm run build
```

### Multi-company (recommended)

```bash
export BOOTSTRAP_OS_ROOT=/path/to/bootstrap   # template clone (docs + blank templates)
export BOOTSTRAP_DATA_ROOT=$HOME/.bootstrap-os  # optional; this is the default
# do NOT set BOOTSTRAP_INSTANCE_ROOT if you want multi-company
```

Then in the agent:

1. `bootstrap_init_company` — `companyId: "pirin"` (and zk0, tokbox, …)
2. `bootstrap_use_company` — switch when the conversation is about another idea
3. `bootstrap_where_are_we` / `bootstrap_next_evidence` — always on the **active** company

### Single-company env (backward compatible)

```bash
export BOOTSTRAP_OS_ROOT=/path/to/bootstrap
export BOOTSTRAP_INSTANCE_ROOT=/path/to/one-company-instance
```

---

## Client config (one connector)

See [`config/mcp.stdio.example.json`](config/mcp.stdio.example.json).

```json
{
  "mcpServers": {
    "bootstrap-os": {
      "command": "node",
      "args": ["/absolute/path/to/bootstrap/mcp/dist/index.js"],
      "env": {
        "BOOTSTRAP_OS_ROOT": "/absolute/path/to/bootstrap",
        "BOOTSTRAP_DATA_ROOT": "/absolute/path/to/.bootstrap-os"
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

Placeholder until shipped. Tool names + company isolation stay stable.

---

## Privacy

| Data | Local MCP | Hosted (planned) |
|------|-----------|------------------|
| Blueprint | Read from your clone | Served from template |
| Company state | Disk under data root, **per company** | Private tenant per company |
| Cross-tenant | **Denied** | **Denied** |
| Leaderboards | Out of scope | Never default-on |

---

## Non-goals

- Replacing the open-source markdown pack
- Auto-advancing journey phases
- Blended multi-idea scoreboard
- Writing into `company-os/` template files
- Hosted service in this version

---

*You supply the insight. AI supplies the speed. MCP is optional furniture.*

## Roadmap

High-impact plan, dogfood protocol, and kill criteria: [`../ROADMAP.md`](../ROADMAP.md).

---

## CI & tests

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | Strict TypeScript |
| `npm run build` | Emit `dist/` |
| `npm run test:unit` | Hard-rule unit tests (phase gate, isolation, policy, markdown path) |
| `npm run test:smoke` | Cold-path multi-company smoke |
| `npm run test:stdio` | Real stdio MCP client (M1 protocol) |
| `npm run ci` | Full local CI mirror |

Merge gates and manual checklist: [`QA.md`](QA.md).

GitHub Actions: `.github/workflows/mcp-ci.yml` (Node 20 + 22).

Runbooks: [`docs/COLD_PATH.md`](docs/COLD_PATH.md) · [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md) · [`QA.md`](QA.md)
