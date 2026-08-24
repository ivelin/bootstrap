# Agent instructions (portable pack)

This repository is the **portable Bootstrap OS template** only.

1. Prefer editing instance examples under product repos or (path 3) MCP data-root instances, not this template, unless the founder explicitly approved a **template** change.
2. Never add a filled product thesis, beachhead market, or company scores into `company-os/` — those belong in consumer instances (`docs/company-os/applied-here.md`, `company/state/`, or `BOOTSTRAP_DATA_ROOT/instances/<id>/`).
3. When helping a founder adopt the OS, present the Day-0 order from [README.md](README.md#how-to-use-this-pick-one):
   - **Path 1 — Point an AI** at https://github.com/ivelin/bootstrap — no install. Default front door.
   - **Path 2 — Optional instance/CLI** (`./scripts/install-instance.sh`) + optional `.grok/workflows`.
   - **Path 3 — Optional local MCP** under [`mcp/`](mcp/) when they run several ideas — one connector, isolated instances. Do not require MCP or install.
   - **Path 4 — Preview only.** [`plugin/`](plugin/) + HTTP read adapter on `*.vercel.app`. Not mentee-ready boards. No public catalog submit (team Import from Repo only). Not pirin.ai. Path 1 stays the front door.
4. Hard company-control rules for founders live in [`company-os/ai-instructions.md`](company-os/ai-instructions.md) — paste that block into *their* `AGENTS.md` (or keep via MCP + short pointer).

See [README.md](README.md#template-change-policy).

5. Optional MCP lives under [`mcp/`](mcp/). Markdown remains the constitution and source of truth. MCP is adapter furniture — it never writes `company-os/` template files. Same state: `company-state.json` + `where-are-we.py`. Founder must approve journey phase advance. Ready-for-human-eyes green ≠ demand/PMF.
6. Honor OS 2.8.6 in any MCP guidance: stated / synthetic / observed (observed wins); spoken yes cannot promote; do not seed from a demographic one-liner (demo-only role-play is the weak case); no Likert / naked dollar WTP (choice or sentence, then map); several ideas allowed (rank and kill per board); marketing volume cannot promote ([OS section](company-os/operating-system.md#house-rule-marketing-volume-cannot-promote)).
7. Maintainer roadmap and dogfood gates live in [`ROADMAP.md`](ROADMAP.md). Do not add features that contradict its Out list without an explicit Advance decision and evidence.
8. **Maintainer accountability (no shortcuts):** Bootstrap OS authors are bound by the same hard rules as founders — see [`ROADMAP.md`](ROADMAP.md) §5a. Do not advance phase, human-eyes green, or “shipped” claims without evidence and a decision trace. Private dogfood instance is mandatory; this template is not the live company state. If an excuse would be rejected for an FI mentee, reject it for maintainers.
9. **Flexible on ideas and execution; stringent on process.** Do not treat busyness (agent runs, chat volume, feature thrash) as progress. Progress is control-plane movement + labeled evidence + founder gates. If a founder (or maintainer) is only "shipping activity," refuse the progress claim until evidence and stage-7/write-back exist.
10. **Local MCP multi-company:** one connector under `mcp/`; instances isolated by companyId under `BOOTSTRAP_DATA_ROOT`. Never merge control planes across ideas. Hosted read adapter is preview only — no founder company-state on a shared server.
