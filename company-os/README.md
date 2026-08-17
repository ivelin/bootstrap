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
**Repo overview & adopt order:** [`../README.md`](../README.md) — path 1 point-an-AI, path 2 optional install.

Optional Grok Build workflows live in [`../.grok/workflows/`](../.grok/workflows/).  
Optional local MCP (path 3, several ideas only): [`../mcp/README.md`](../mcp/README.md). Not required. Hosted MCP does not exist.

### Mental model

```text
BLUEPRINT                          LIVE RUNTIME
operating-system.md                live-runtime.md
  journey 1–9 + gates                state + stages 1→7 → memory → back
  virtual office cards (jobs optional)  git remembers; day tools may feed it
  founder-day + skill-capture (optional)  honest scores + open questions
```

Do not put filled thesis, ICPs, or product roadmaps in this folder. Those belong in *your* company’s instance after you copy from `templates/`.
