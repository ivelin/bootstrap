# Company OS pack (portable)

This folder is the **Bootstrap OS** blueprint and runtime shape. It is not any one company’s live state.

| File | Role |
|------|------|
| [`operating-system.md`](operating-system.md) | Blueprint — phases, gates, evidence, growth pack, Ready for human eyes |
| [`live-runtime.md`](live-runtime.md) | Live OS shape — durable state + 7-stage loop |
| [`ready-for-human-eyes.md`](ready-for-human-eyes.md) | Ship gate checklist before external product-test asks |
| [`ai-instructions.md`](ai-instructions.md) | Thin always-on rules for your main AI tool |
| [`first-hour.md`](first-hour.md) | Day 0 — thesis, ≥3 customer groups, first “Where are we?” |

**Blank instance files:** [`../templates/`](../templates/)  
**Install paths (markdown vs multi-company MCP):** [`../README.md`](../README.md#how-to-install-pick-a-path)  
**Optional MCP:** [`../mcp/README.md`](../mcp/README.md)

Optional Grok Build workflows live in [`../.grok/workflows/`](../.grok/workflows/).

### Mental model

```text
BLUEPRINT                          LIVE RUNTIME
operating-system.md                live-runtime.md
  journey 1–9 + gates                state + stages 1→7 → memory → back
  virtual office cards (jobs optional)  git remembers; day tools may feed it
  founder-day + skill-capture (optional)  honest scores + open questions
```

### Where filled state lives

Do **not** put filled thesis, ICPs, or product roadmaps in this folder.

| Install path | Instance location |
|--------------|-------------------|
| **A — Markdown in product repo** | Copy from `templates/` into that product repo (`docs/company-os/`, `company/state/`) |
| **B — Multi-company MCP** | `BOOTSTRAP_DATA_ROOT/instances/<companyId>/` via one connector — **no full pack import** into each product monorepo |
| **C — Hybrid** | MCP owns state; product repo keeps thin `AGENTS.md` + hard rules only |

Multiple startups ⇒ prefer **B or C** so process stays one clone and boards stay isolated.
