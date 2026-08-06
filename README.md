# Bootstrap OS

**Portable Company Operating System for solo founders in the 0→1 journey.**

Use this repo as the **source of truth** for process and control. Point your AI agents here, install a blank instance in *your* product repo, and fill only *your* thesis, customer groups, scores, and open questions.

| | |
|--|--|
| **Version** | Blueprint + live runtime **v2.8** |
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
  reward/risk + virtual office           optional: agent frameworks or scripts
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
| [`templates/`](templates/) | Blank files to copy into *your* company repo when you instantiate |
| [`examples/`](examples/) | Pointers to public live instances (illustration only) |

This repo is **template only**. Filled company state never lives here.

---

## Install in your company (5 steps)

1. **Read** [`company-os/operating-system.md`](company-os/operating-system.md), then [`company-os/live-runtime.md`](company-os/live-runtime.md).
2. **Copy templates** into your product repo (suggested layout):

   ```text
   your-company/
     docs/company-os/
       applied-here.md          ← from templates/applied-here.md
       instance/
         README.md
         thesis.md
         scores.md
     company/
       README.md
       state/company-state.json ← from templates/company/state/company-state.json
     AGENTS.md                  ← merge company-os/ai-instructions.md
   ```

3. **Paste** hard rules from [`company-os/ai-instructions.md`](company-os/ai-instructions.md) into your main AI instructions (root `AGENTS.md` recommended).
4. **Fill** thesis, ≥3 ICP candidates, journey phase, loop stage, open questions — *your* company only.
5. **Before** any mentor/user “try my link” ask, run the [`ready-for-human-eyes`](company-os/ready-for-human-eyes.md) checklist.

Start with markdown + a weekly “Where are we?” ritual. Add agent frameworks only when they reduce pain.

### Point agents at this pack

```text
Take the Bootstrap OS from https://github.com/ivelin/bootstrap
(company-os/operating-system.md + live-runtime.md + ai-instructions.md).
Apply process and control to MY startup only.
Do not import any other company's product thesis or market.
```

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

### Anti-patterns

- Auto-promoting every product win into the OS  
- Copying a beachhead market, MCP stack, or pricing into the blueprint “because we use them”  
- Silent template edits inside product PRs without template approval  

---

## Versioning

| Doc | Current |
|-----|---------|
| Operating system blueprint | **v2.8** |
| Live runtime | **v2.8** |

### Recent portable additions

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

---

*You supply the insight. AI supplies the speed.*
