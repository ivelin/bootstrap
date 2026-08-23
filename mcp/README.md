# Bootstrap OS MCP (optional path 3)

**What this is / is not:** see root [`ROADMAP.md` §0](../ROADMAP.md) — MCP is optional adapter furniture to the control plane, not a second OS, harness, memory product, or hosted service.

**Markdown is the constitution.** Front door is still **path 1**: point an AI at https://github.com/ivelin/bootstrap — no install. Path 2 is optional instance files / CLI + `.grok/workflows`. **This package is path 3 (stdio writes) plus a preview HTTP read adapter.** Several ideas are allowed. Each `companyId` is its own board. Do not hide a second idea to look focused. Rank and kill per board. There is no public mentee-ready host.

| Path | Who it is for | Dependency |
|------|----------------|------------|
| **1. Point an AI** | Everyone (default) | None |
| **2. Optional instance / CLI** | When you want files in your repo | `./scripts/install-instance.sh` |
| **3. Local MCP (this package)** | Several ideas, isolated boards | Node 20+, this package, local data root |
| **4. Hosted MCP** | Preview only | HTTP read adapter + [`../plugin/`](../plugin/). No public mentee-ready host. No marketplace. |

Same state as markdown: `company-state.json` + `where-are-we.py`. Isolation is hard: no shared phase/evidence across `companyId`. MCP never writes `company-os/` template files.

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

Hard rules (OS 2.8.6):

- Journey phase does **not** change unless `founderApprovedPhaseChange=true`
- Human-eyes **green** is not demand or PMF
- Blueprint under `company-os/` is never written by MCP
- **Busy is not progress** — activity without evidence is not advancement
- **No cross-company writes**
- Weigh **stated / synthetic / observed** — observed wins a clash
- A spoken yes cannot promote a customer group
- Do not seed a persona from a demographic one-liner (demo-only role-play is the weak case)
- Do not ask a sim for a Likert or a naked dollar WTP — a choice or a sentence, then map
- Several ideas are allowed — each `companyId` is its own board; do not hide a second idea to look focused; rank and kill per board
- Marketing volume cannot promote

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

### Hosted read (preview)

Same package, Streamable HTTP transport: `npm run start:http`. Read tools only (`bootstrap_os_info`, docs, house-rule pins). Fetches the published repo. Does **not** host founder `company-state`. Write / init / use-company stay stdio.

Set `BOOTSTRAP_MCP_URL` in the preview plugin if you run this yourself. [`config/mcp.hosted.example.json`](config/mcp.hosted.example.json) is a placeholder — `mcp.pirin.ai` is dead. No public mentee-ready host. Path 1 stays the front door.

---

## Privacy

| Data | Local MCP (path 3) | Hosted read (preview) |
|------|--------------------|-------------------------|
| Blueprint | Read from your clone | Fetch published GitHub repo |
| Company state | Disk under data root, **per company** | **Not hosted** |
| Cross-tenant | **Denied** | **Denied** |
| Leaderboards | Out of scope | Never |

---

## Non-goals

- Replacing the open-source markdown pack or becoming the front door
- Auto-advancing journey phases
- Blended multi-idea scoreboard
- Writing into `company-os/` template files
- Public mentee-ready hosted boards (preview read adapter only)
- Weekly market-radar jobs
- Seeding personas from a demographic one-liner
- Likert or naked-dollar WTP from a sim

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
| `npm run test:http` | Streamable HTTP hosted-read (no local clone) |
| `npm run start:http` | Preview HTTP read adapter |
| `npm run ci` | Full local CI mirror |

Merge gates and manual checklist: [`QA.md`](QA.md).

GitHub Actions: `.github/workflows/mcp-ci.yml` (Node 20 + 22).

Runbooks: [`docs/COLD_PATH.md`](docs/COLD_PATH.md) · [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md) · [`QA.md`](QA.md)
