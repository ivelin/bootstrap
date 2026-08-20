# Bootstrap OS

**Portable Company Operating System for solo founders in the 0→1 journey.**

Use this repo as the **source of truth** for process and control. Point your AI here and apply what fits *your* startup. Instantiate blank files in *your* product repo only when you want them — fill only *your* thesis, customer groups, scores, and open questions.

| | |
|--|--|
| **Version** | Blueprint + live runtime **v2.8.6** · optional local MCP **v0.2** (path 3) |
| **License** | Apache-2.0 |
| **Audience** | Independent solo founders; mentors (Founder Institute, SCORE, …); AI helpers |
| **Maintainer** | [Ivelin Ivanov](https://github.com/ivelin) · [Pirin.ai](https://pirin.ai) |

---

## Mental model (two minutes)

```text
BLUEPRINT (how to decide)              LIVE RUNTIME (how to learn every week)
company-os/operating-system.md         company-os/live-runtime.md
  journey phases 1–9                     persistent state (personas, traces, scores…)
  founder gates + honest evidence        stages 1→7 loop → memory → back to 1
  reward/risk + virtual office           git remembers; day tools may feed it
  (cards stay; jobs optional)            optional: founder-day + skill-capture
```

**Golden rule:** Copy *process and control*. Do **not** copy another founder’s market, ICP list, feature roadmap, or “current hypothesis.”

---

## What’s in this repo

| Path | What it is |
|------|------------|
| [`company-os/operating-system.md`](company-os/operating-system.md) | **Blueprint** — principles, 9 journey phases, gates, evidence labels, next pack, Ready for human eyes, growth pack |
| [`company-os/live-runtime.md`](company-os/live-runtime.md) | **Live OS shape** — durable state + 7-stage loop + eval harness ideas |
| [`company-os/ready-for-human-eyes.md`](company-os/ready-for-human-eyes.md) | **Ship gate checklist** — cold URL + happy path before external product-test asks |
| [`company-os/ai-instructions.md`](company-os/ai-instructions.md) | Thin enforcement layer — paste into `AGENTS.md` / Cursor / Claude / Grok |
| [`company-os/first-hour.md`](company-os/first-hour.md) | **Day 0** — thesis, ≥3 ICPs, first “Where are we?” (chat or instance files) |
| [`templates/`](templates/) | Blank files to copy into *your* company repo when you instantiate |
| [`examples/`](examples/) | Pointers to public live instances (illustration only) |
| [`.grok/workflows/`](.grok/workflows/) | Optional Grok Build workflows (path 2) — company-operating-loop, user-research, ready-for-human-eyes |
| [`mcp/`](mcp/) | **Optional path 3** — local MCP adapter (one connector, isolated instances). Not a second OS. |

This repo is **template only**. Filled company state never lives here.

---

## How to use this (pick one)

Compatible paths. Start at **1**. Later rungs are opt-in. Several ideas are allowed; each stays *your* company on its own board.

### 1. Point an AI at this pack (default)

No copy, no script, no CLI, no MCP. Use what applies to *your* startup immediately.

```text
Take the Bootstrap OS from https://github.com/ivelin/bootstrap
(company-os/operating-system.md + live-runtime.md + ai-instructions.md).
Apply process and control to MY startup only.
Do not import any other company's product thesis or market.
```

Then Day 0 — thesis, ≥3 customer groups, first “Where are we?”: [`company-os/first-hour.md`](company-os/first-hour.md). Chat is enough.

### 2. Instantiate files (when you want them in your repo)

Optional. Script or hand copy — [Install](#install-in-your-company). Optional Grok Build workflows live in [`.grok/workflows/`](.grok/workflows/) (`company-operating-loop`, `user-research`, `ready-for-human-eyes`) if present — same rung, not the only front door. One idea per repo is fine; several ideas each get their own board.

### 3. Self-hosted MCP (optional — several ideas)

Several ideas are allowed. Do not hide a second thesis to look focused. Optional local MCP under [`mcp/`](mcp/) keeps each idea on its own board — `company-state.json` + `where-are-we.py` — without importing this tree into every product repo. Same founder gates. Same evidence rules (OS 2.8.6). Rank and kill per board. Markdown remains the constitution.

Not required. Path 1 (point an AI) and path 2 (optional files + workflows) stay enough.

```bash
cd mcp && npm install && npm run build
```

One stdio connector, many `companyId`s: [`mcp/README.md`](mcp/README.md). MCP never writes `company-os/` template files.

### 4. Hosted MCP (later)

A hosted MCP may exist later. Nothing to connect to today.

---

## Install in your company

Optional (path 2). From this repo:

```text
./scripts/install-instance.sh /path/to/your-company
```

That copies `templates/` into the target and merges [`company-os/ai-instructions.md`](company-os/ai-instructions.md) into the instance `AGENTS.md`. If present, optional Grok Build workflows also copy to `.grok/workflows/`. You can run them with `grok` by name without making install the only front door.

Then do **first hour**: [`company-os/first-hour.md`](company-os/first-hour.md) (also copied to `docs/company-os/first-hour.md` in the target). Fill thesis, ≥3 ICP scorecards, first “Where are we?” — *your* company only.

**Manual copy:** if you cannot run the script, use the copy map in [`templates/README.md`](templates/README.md) and paste the fenced block from [`company-os/ai-instructions.md`](company-os/ai-instructions.md) into the instance `AGENTS.md`.

Start with markdown + a weekly “Where are we?” ritual. Add agent frameworks only when they reduce pain.

Local CI is `./scripts/ci.sh`.

---

## Two clocks (the whole game)

| Clock | Question | Changes when |
|-------|----------|--------------|
| **Bootstrap journey** (phases 1–9) | Where is the company on the prove-it path? | Founder **Advance / Iterate / Hold / Kill** |
| **Live loop** (stages 1–7) | What did we learn this week? | Continuous; many cycles inside one journey phase |

AI never advances a journey phase alone. Evidence beats narrative. Waitlists and synthetic research are filters, not product–market fit.

---

## Template change policy

Treat promotion into this template as rare, deliberate work — not a continuous sync from any product PR.

| Layer | Default |
|-------|---------|
| **Instance** (your `applied-here.md`, product code, scores) | Update freely as *your* company learns (public-safe; no PII) |
| **Template** (files under `company-os/`) | **Do not change** unless the maintainer **explicitly approves** a portable edit |

### When a change may enter the template

1. **Slow** — many product iterations before one template change  
2. **Methodical** — name the pattern, why it is domain-agnostic, how mentees might misuse it  
3. **Thoughtful** — principle + checklist over markets, stacks, or one-off workflows  
4. **Approval-gated** — short delta (what / why / where); wait for explicit approval  
5. **Instance-first** — keep company-specific application in that company’s repo  
6. **Additive, rarely breaking** — founders adopt this for months. New packs sit beside existing ones. Do not rename clocks, restack the loop, or drop a gate without a named version note. Optional until useful.

### Anti-patterns

- Auto-promoting every product win into the OS  
- Copying a beachhead market, MCP stack, or pricing into the blueprint “because we use them”  
- Silent template edits inside product PRs without template approval  
- Moving sand: a rewrite that makes last month’s snapshot unreadable  

---

## Versioning

| Doc | Current |
|-----|---------|
| Operating system blueprint | **v2.8.6** |
| Live runtime | **v2.8.6** |
| Optional local MCP (path 3) | **v0.2** — adapter only; not a second OS |

### Recent portable additions

**v2.8.6 — marketing volume cannot promote**  
House rule. Full text: [operating-system.md](company-os/operating-system.md#house-rule-marketing-volume-cannot-promote). Writing: [Say it once. Link. No filler.](company-os/operating-system.md#how-this-os-may-change-stability-contract)

**v2.8.5 — several ideas are allowed**  
Each idea is its own thesis, instance, and scorecard. Do not hide a second idea to look focused. Rank and kill per board.

**v2.8.4 — additive weekday packs + stability contract**  
Nothing established was removed. Founder-day and skill-capture sit beside existing rituals and are skippable until real conversations exist. Virtual-office cards stay; the partner may call jobs for a card. Day tools may feed the snapshot; git remains memory. After proof: overnight drafts still unsent; if the channel is public writing, one lived insight beats a content calendar. [Additive diagram](docs/diagrams/os-v2.8.4-before-after.html).

**v2.8.3 — demo-only role-play is the weak case**  
Do not seed a persona from a demographic one-liner. Seed from traces. Sharpening of thesis-only-is-weaker.

**v2.8.2 — honesty pass**  
House rules labeled (observed wins; spoken yes cannot promote). Dollar/Likert qualified. Load-bearing cites: Bisbee 2024, Brand 2026 §3.3.

**v2.8 — Ready for human eyes (ship gate)**  
Fail-closed cold URL + happy path before mentor/user product-test asks. Not demand or PMF.

**v2.7 — growth pack (after proof)**  
Entry criteria, single-channel hypothesis, founder gate on channels.

**v2.6 — control hygiene**  
Autonomy postures (Strict / Auto / Dangerous), standing deny list, learning rituals.

**v2.5 — next pack after synthetic ranking**  
Light synthetic product sandbox + real interest tests before heavy build.

---

## Related

- Insights (plain-language guides): [pirin.ai/insights](https://pirin.ai/insights) — search “Bootstrap OS”  
- Hands-on install: [Install Bootstrap OS intensive](https://pirin.ai/install-os)  
- Public live instances (illustration only): see [`examples/`](examples/)
- Optional local MCP (path 3): [`mcp/README.md`](mcp/README.md)
- Starter legal templates (hyperlink only): [operating-system.md](company-os/operating-system.md#starter-legal-templates)

---

*You supply the insight. AI supplies the speed.*
