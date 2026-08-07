# Company OS instance (index)

**This is the living instance**, not the portable template.

| Artifact | Path (markdown install) | Path (MCP multi-company) |
|----------|-------------------------|----------------------------|
| Durable state | `company/state/company-state.json` | `$BOOTSTRAP_DATA_ROOT/instances/<id>/company/state/…` |
| Gap analysis | `docs/company-os/applied-here.md` | same file under instance root if created |
| Scoreboard (human) | [`scores.md`](scores.md) | optional under instance |
| Thesis snapshot | [`thesis.md`](thesis.md) | optional under instance |
| Portable template | [ivelin/bootstrap](https://github.com/ivelin/bootstrap) | process only — not per-product import |

## Install path reminder

| Path | When |
|------|------|
| **A** — copy this tree into **one** product repo | Single company; offline markdown |
| **B** — `bootstrap_init_company` via MCP | Multiple startups; one connector |
| **C** — MCP state + thin product `AGENTS.md` | Code in monorepo; board outside |

See root [README — How to install](../../README.md#how-to-install-pick-a-path).

## Where are we?

Answer in plain language: journey N/9, loop M/7, gate, autonomy posture, Ready for human eyes, top open questions, honest scores.

Prefer a weekly control-plane snapshot (date it). After real or heavy synthetic work, close loop stage 7 (memory update).

With MCP: `bootstrap_use_company` then `bootstrap_where_are_we` for **this** company only.

## Layout vs template categories

| Template category | Suggested location |
|-------------------|--------------------|
| research/ | `research/icps/` |
| product/ | your app / product surface (product repo) |
| evals/ | `evals/` or test suite |
| traces/ | `company/traces/` or `traces/decisions/` |
| growth/ | `growth/` (after proof) |
| company/ | `company/state/` |
| docs (OS instance) | `docs/company-os/` or MCP instance root |

**Never** merge this instance’s phase/evidence with another `companyId`.
