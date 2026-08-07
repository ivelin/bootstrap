# Application: [YOUR COMPANY]

**Status:** Living instance — not part of the portable Bootstrap OS template.  
**Template source:** [ivelin/bootstrap](https://github.com/ivelin/bootstrap) (`company-os/`)  
**Read first:** [operating-system.md](https://github.com/ivelin/bootstrap/blob/main/company-os/operating-system.md) · [live-runtime.md](https://github.com/ivelin/bootstrap/blob/main/company-os/live-runtime.md)
**Install path:** A (markdown in product repo) · B (MCP multi-company) · C (hybrid) — see root [README](https://github.com/ivelin/bootstrap/blob/main/README.md#how-to-install-pick-a-path)
If you run multiple startups, keep this instance isolated under one `companyId` (MCP: `bootstrap_use_company`). Never blend phase/evidence across ideas.

Replace every placeholder with *your* company. Do not import another founder’s market.

---

## One-sentence hypothesis (subject to evidence)

> [What problem, for whom, why now, why you — one sentence]

---

## Journey phase (bootstrap) — where we are

| OS # | Simple name | Our status (honest) |
|------|-------------|---------------------|
| 1 | Form thesis + list possible customer groups | |
| 2 | Define success per group | |
| 3 | Synthetic research and first validation | |
| 4 | Real-world research + monetization stress | |
| 5 | Design the simplest system that can test the winner | |
| 6 | Build a tiny slice and test it hard | |
| 7 | Try it with real or realistic users | |
| 8 | Learn from what happens and improve | |
| 9 | Grow only after it clearly works | Deferred until proof |

**Current journey phase:** N / 9 — [name]  
**Current live loop stage:** M / 7 — [name]  
**Gate:** OPEN | WAITING | BLOCKED  
**Autonomy posture:** Strict (default) | Auto | Dangerous  
**Ready for human eyes:** unknown | blocked | green

---

## Customer groups (reward / risk — rank, don’t multi-GTM by default)

| Rank | Group | Pain | Reach | Evidence (stated / synthetic / observed) | Notes |
|------|-------|------|-------|------------------------------------------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## Tiny slice (what we build / sell first)

- **Slice:** …
- **Pass / fail:** …
- **Human gates:** …

---

## Map to OS principles (gap analysis)

| OS idea | Where it shows up here | Gap |
|---------|------------------------|-----|
| You supply insight; AI supplies speed | | |
| Don’t fall in love with the idea | | |
| Stay small until it works | | |
| You stay in control | | |
| Visible & explainable (“Where are we?”) | | |
| Evidence beats narrative | | |
| Build evaluation-first | | |
| Ready for human eyes before external product asks | | |
| Learning rituals (weekly snapshot, stage 7) | | |

---

## Persistent state locations

| Store (OS) | Path A (in product repo) | Path B (MCP multi-company) | Status |
|------------|--------------------------|----------------------------|--------|
| Durable cursor + scores | `company/state/company-state.json` | `$BOOTSTRAP_DATA_ROOT/instances/<id>/company/state/…` | |
| Thesis snapshot | `docs/company-os/instance/thesis.md` | under instance root (optional) | |
| Scoreboard notes | `docs/company-os/instance/scores.md` | under instance root (optional) | |
| ICP research | `research/icps/` (create when ready) | same idea, per instance | |
| Decision traces | `traces/decisions/` or `company/traces/` | instance `company/traces/` | |
| Ready-for-eyes evidence | `product/READY_FOR_HUMAN_EYES.md` or equivalent | per instance | |

Path C: prefer MCP paths for control plane; avoid a second diverging `company-state.json` in the monorepo.

---

## Open questions (top)

1. …
2. …
3. …

---

## Last action / last weekly snapshot

- **Last action:** …
- **Last weekly control-plane snapshot:** YYYY-MM-DD (or missing)

---

*Update freely as the company learns. Do not edit the portable template without explicit approval in [ivelin/bootstrap](https://github.com/ivelin/bootstrap).*
