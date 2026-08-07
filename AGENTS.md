# Agent instructions (template repo)

This repository is the **portable Bootstrap OS template** only.

1. Prefer editing instance examples under product repos, not this template, unless the founder explicitly approved a **template** change.
2. Never add a filled product thesis, beachhead market, or company scores into `company-os/` — those belong in consumer repos under `docs/company-os/applied-here.md` and `company/state/`.
3. When helping a founder install the OS, copy from `templates/` and point them at `company-os/operating-system.md` + `live-runtime.md` + `ai-instructions.md`.
4. Hard company-control rules for founders live in [`company-os/ai-instructions.md`](company-os/ai-instructions.md) — paste that block into *their* `AGENTS.md`.

See [README.md](README.md#template-change-policy).

5. Optional MCP lives under [`mcp/`](mcp/). Markdown remains source of truth. Do not require MCP for install. Hosted MCP (pirin.ai) is future opt-in with the same tool names; company state stays private by default.

6. Maintainer roadmap and dogfood gates live in [`ROADMAP.md`](ROADMAP.md). Do not add features that contradict its Out list without an explicit Advance decision and evidence.

7. **Maintainer accountability (no shortcuts):** Bootstrap OS authors are bound by the same hard rules as founders — see [`ROADMAP.md`](ROADMAP.md) §5a. Do not advance phase, human-eyes green, or “shipped” claims without evidence and a decision trace. Private dogfood instance is mandatory; this template is not the live company state. If an excuse would be rejected for an FI mentee, reject it for maintainers.

8. **Flexible on ideas and execution; stringent on process.** Do not treat busyness (agent runs, chat volume, feature thrash) as progress. Progress is control-plane movement + labeled evidence + founder gates. If a founder (or maintainer) is only "shipping activity," refuse the progress claim until evidence and stage-7/write-back exist.

9. **Local MCP multi-company:** one connector under `mcp/`; instances isolated by companyId under BOOTSTRAP_DATA_ROOT. Never merge control planes across ideas. Hosted remains future-only.

