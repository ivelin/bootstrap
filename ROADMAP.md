# Bootstrap OS — maintainer roadmap

**Audience:** Maintainers (Pirin / template owners) and serious contributors.  
**Doctrine:** Same rigor we demand of founders. Dogfood or it is not real.  
**Not:** A feature wishlist. Kitchen-sink ideas die here first.

| | |
|--|--|
| **Product** | Portable Company OS (markdown) + optional thin MCP |
| **Primary customer group (working)** | Solo / near-solo non-technical founders in 0→1 who thrash between AI harnesses |
| **Job** | Stable **control plane** (two clocks, gates, sparse evidence) that survives tool switches |
| **Non-job** | Harness, hosting platform, memory product, skill marketplace, investor network |

---

## 1. Where we stand (control plane — dogfood)

Update this block when reality changes. Do not invent progress.

| Field | Current (honest) |
|-------|------------------|
| **Journey phase** | ~5–6 — tiny system designed; local MCP thin slice in flight ([PR #1](https://github.com/ivelin/bootstrap/pull/1)) |
| **Loop stage** | 3–4 — build + cold checks on MCP path; markdown path already “shippable” as docs |
| **Autonomy posture** | **Strict** — no auto phase advances; no silent hosted launch |
| **Ready for human eyes** | **unknown** for MCP until cold install by a non-maintainer works end-to-end |
| **Gate** | Do not market MCP as required. Do not ship hosted until local export + dogfood ledger exist or are explicitly killed |
| **Open questions** | Will non-technical mentees use local MCP, or only markdown + later hosted read path? Does ledger reduce thrash in a real FI cohort? Can “Claude rooms / project setup” collapse into a 90‑min Bootstrap install without tool thrash? |
| **Last roadmap review** | 2026-08-07 (evidence scan: Gmail FI/mentees, X, public LinkedIn) |

**Where are we in one sentence:**  
Process pack is portable and real; optional local MCP (gates + thin state) is the next thin slice; evidence ledger + export are the next *high-impact* slice; hosted and social features are not on the critical path.

---

## 2. High-impact scope only

### In (prove these)

| Capability | Why it is high impact | Success evidence (not narrative) |
|------------|----------------------|----------------------------------|
| **Markdown OS** | Zero-deps process; offline; ownership | Founder can install templates + answer “Where are we?” without Node |
| **Gates as tools (MCP)** | Policy survives harness hopping | Phase advance blocked without founder flag; external ask blocked if human-eyes ≠ green |
| **Sparse evidence ledger** | Memory without chat noise | Only explicit milestones / decisions / labeled evidence / gate results |
| **Export pack** | Diligence / mentor OH prep without scramble | One command or folder: timeline + decisions + scores + human-eyes |
| **Harness-agnostic state** | Stops tool thrash | Same control plane after switching Cursor ↔ Claude ↔ Grok ↔ local agent |

### Out (explicit kill / defer)

| Idea | Why out |
|------|---------|
| Public founder leaderboard | Vanity; games process |
| Investor discovery via MCP | Unlikely channel; dilutes job |
| Auto-ingest chat / auto skill farms | Becomes the noise we exist to avoid |
| Cap table / full data-room SaaS | Wrong product boundary |
| Hosting/runtime opinions (beyond human-eyes URL) | Not the job |
| Investor-readiness score theater | Harms trust |
| Requiring MCP for install | Breaks non-technical floor |
| Multiplayer company harness (QM-class) as day-one | Wrong segment (1–n, not 0–1) |

---

## 3. Delivery modes (stable contract)

| Mode | Status | Rule |
|------|--------|------|
| **1. Markdown only** | **Default forever** | Must work with zero MCP |
| **2. Local MCP** | **v0.1 in PR** | Optional; state on founder disk |
| **3. Hosted MCP** | **Later / maybe** | Only if auth + **read-only share of export** is proven needed; same tool names; private default |

MCP is **compass + logbook**, not a third harness.

---

## 4. Phased plan (founder gates)

Each phase needs **Advance / Iterate / Hold / Kill** with evidence. No phase auto-advance.

### Phase A — Portable process (baseline)

| | |
|--|--|
| **Done means** | `company-os/` + `templates/` installable; AI instructions pasteable; Ready for human eyes checklist exists |
| **Evidence** | Public repo; workshops/OH can teach without MCP |
| **Status** | **Advance candidate** — treat as shipped process baseline (v2.8 docs) |
| **From field** | FI demand for “Bootstrap with AI Agents” OH; Luma series (90‑min → reliable → scale). Teach Phase A first. |

### Phase B — Thin local MCP (gates + state) — *current thin slice*

| | |
|--|--|
| **Ship** | [PR #1](https://github.com/ivelin/bootstrap/pull/1): stdio MCP, policy tools, thin `company-state.json`, no template writes |
| **Done means** | Non-maintainer cold path: clone → `mcp` build → point at *instance* state → `bootstrap_where_are_we` + blocked phase advance without approval |
| **Dogfood** | Pirin / Bootstrap maintainer instance uses MCP weekly for “Where are we?” on *this* product |
| **Kill if** | Cold install fails repeatedly for target mentees *and* markdown-only already covers them → keep markdown, archive MCP |
| **Status** | **In build** — human-eyes unknown until cold path green |
| **From field** | No email/X proof yet that non-tech FI founders want local Node MCP. Do not market B as required. |

### Phase C — Evidence ledger + export (next high impact)

| | |
|--|--|
| **Ship** | Append-only ledger (milestones, decisions, evidence labels, gate events); `list_timeline`; `export_data_room` |
| **Done means** | Weekly stage-7 writes 1–3 ledger entries; export usable for mentor OH brief without chat dig |
| **Dogfood** | 4 consecutive weekly snapshots for Bootstrap OS itself live only in ledger + state |
| **Kill if** | Ledger unused after 4 dogfood weeks → do not build hosted on top of fiction |
| **Status** | **Next** after Phase B human-eyes green or explicit iterate |
| **From field** | Thesis change → pilot evidence (MicDots class); multi-company dogfood claim needs per-company boards |

### Phase D — Hosted read path (optional)

| | |
|--|--|
| **Ship only if** | Phase C dogfood green **and** real demand for shareable read-only export |
| **Done means** | Same tools/names; founder owns revoke; no public ranking |
| **Kill if** | Local export + Drive/git share is enough for dogfood cohort |
| **Status** | **Hold** — not started |

---

## 5. Dogfood protocol (mandatory)

We run Bootstrap OS **on Bootstrap OS / Pirin delivery of it**.

### Weekly (learning ritual)

1. **Control-plane snapshot** — update §1 table (phase, stage, human-eyes, open questions).  
2. **Stage 7** — what did we learn; what was killed; one decision trace.  
3. **Evidence only** — if it is not in state/ledger/export, it did not happen.  
4. **Harness rule** — may switch AI tools only after snapshot + stage 7 for the week.

### After each Bootstrap-related office hour (new)

One ledger row (when Phase C exists; until then a short note in dogfood instance):

| Field | Capture |
|-------|---------|
| Founder / company (private) | id only in private instance |
| Confusion type | harness thrash / process / product / human-eyes / other |
| State file existed? | y/n |
| Could answer “Where are we?” in 2 min? | y/n |
| Action assigned | one concrete next gate |

That converts mentor-observed patterns into **company signals**.

### Ready for human eyes (this product)

Before asking mentees to “try the MCP”: cold path on non-maintainer machine; instance root ≠ template; documented five-minute failure modes.  
Green human-eyes ≠ demand for MCP. Markdown remains the floor.

### Anti-patterns (dogfood)

| Anti-pattern | Response |
|--------------|----------|
| Roadmap grows features without kill criteria | Delete or move to Out |
| “We’ll need leaderboard later” | No — re-open only with real evidence |
| Dogfood only in chat | Fail week — no Advance |
| Shipping hosted to avoid fixing local cold path | Hold hosted; fix B |
| Treating OH booking volume as PMF for MCP | Bookings = demand for *guidance*, not for Node MCP |

---

## 6. Success / kill for the *product* (not vanity)

| Signal | Counts as evidence | Does not count |
|--------|--------------------|----------------|
| Mentee answers “Where are we?” in under 2 minutes from OS state | Company signal | Stars alone |
| Switch harness without losing phase/loop/evidence | Company signal | “People liked the demo” |
| Mentor brief from export without Slack archaeology | Company signal | Waitlist for hosted |
| Four weeks dogfood ledger discipline | Company signal | Internal enthusiasm |
| FI OH pre/post 2‑minute status (repeated) | Company signal | Luma “event is live” mail |

**Kill Bootstrap-as-product experiments** (not the helpful markdown pack) if after a real cohort: no one uses gates or ledger and thrash continues unchanged. Keep portable docs; stop investing in MCP surface.

---

## 7. Near-term checklist

- [ ] Merge Phase B only after cold-path notes exist (or explicit “maintainers-only alpha”)  
- [ ] Pirin dogfood: filled instance **outside** this template repo (per template policy)  
- [ ] Phase C schema design: event types only (`milestone`, `decision`, `evidence`, `gate`, `score_snapshot`) — no kitchen sink  
- [ ] Start OH capture rows (even in markdown) for next FI sessions  
- [ ] Refuse PRs that add Out-list features without Advance evidence  
- [ ] Next roadmap review: after Phase B human-eyes check or ≤ 14 days  

---

## 8. External evidence log (2026-08-07 scan)

**Method:** Gmail (FI/founder threads + office-hour traffic), X posts/replies, public LinkedIn.  
**Honesty:** Direct written founder product feedback is thinner than office-hour *demand* and mentor synthesis. Labels follow OS evidence rules.

### 8.1 Direct founder / mentee signals

| Signal | Source | Label | Roadmap implication |
|--------|--------|-------|---------------------|
| Founder thanked mentor pressure that forced **thesis rethink**, then advanced **pilot with real client stakeholders** | Email: Donna Vincent Roa / MicDots (Jul–Aug 2026); OH “Help bootstrap with AI agents” | **Company signal** (one founder, multi-touch) | Thesis/gate discipline + evidence beats tool tips. Ledger must record *why thesis changed*. |
| Same founder set up **Claude rooms as recommended**; multi-front progress; needs crisp **one-liner** for investor/mentor audiences | Email Aug 5–6 2026 | **Company signal** | Founders follow concrete setup steps — but rooms are *harness*, not OS. Keep OS **above** Claude/Cursor. |
| Heavy FI **OH demand** for “Bootstrap with AI Agents” (group AMA + 1:1s: Donna, Sylvie, Lu, Kelly, Sion; later Mustafa, Alejo, Imran, etc.) | FI Events mail Jul–Aug 2026 | **Company signal** (guidance demand) | Invest in Phase A teaching + OH script. Do **not** equate bookings with MCP PMF. |
| Ops: missed slots / calendar confusion | Email (Sylvie waiting room; Alejo missed calendar save) | **Company signal** (process, not product) | Do not “fix” with software theater. |
| Google review ping for Pirin.ai (Chef Kelly) | GBP Aug 6 2026 | **Weak** until full text captured | Log review text into private dogfood instance when available. |

### 8.2 Public founder-adjacent response

| Signal | Source | Label | Roadmap implication |
|--------|--------|-------|---------------------|
| Solo “day-one founder OS” misread of YC QM is “more interesting”; worries enterprise-shaped for one person | X: @n0ur_salama (2026-08-04) | Market attention | Positioning confirmed: **0–1 judgment OS ≠ multiplayer harness**. |
| Non-tech solos “lost in disorganized chats and vibe coded prototypes”; peer Soleur exploring same gap | X thread with @deruelle | Shared diagnosis | Job = organize judgment + state, not more prototype speed alone. |
| FI pattern: “find technical cofounder for MVP”; vibe stalls ~final 20%; need guidance + milestones | Public LinkedIn Pirin/FI posts | Mentor-observed pattern | Stay on milestones, human-eyes, ownership — not agency replacement. |

### 8.3 Mentor synthesis already in market (test as hypotheses)

| Public claim | Test |
|--------------|------|
| No “Where are we?” in 2 minutes → no OS | Measure in OH from written state |
| Burned favor when demo fails for stranger | Human-eyes gate + refuse external ask |
| Harness wrappers pollute builder sessions | Stay harness-agnostic |
| Multi-idea only with boards + gates | Per-company state ids; no leaderboard |
| 90‑min Bootstrap workshops | Distribution for Phase A only until MCP cold path green |

### 8.4 Not found (keep honest)

| Looked for | Result |
|------------|--------|
| Unsolicited “Bootstrap OS fixed my thrash” email volume | **Not found** |
| Detailed public LinkedIn comment critique | **Mostly empty / auth-walled** in fetch |
| Demand for leaderboards / investor MCP discovery | **Not found** |
| Non-tech demand for local Node MCP | **Not found** (demand = bootstrap *with agents* guidance) |

### 8.5 High-impact deltas only

| Raise | Still refuse |
|-------|----------------|
| Phase A teaching + OH “Where are we?” measurement | Harness-as-product |
| Human-eyes narrative (burned favors) | Full QA suite product |
| Thesis/decision traces (MicDots-class) | Auto-ingest Claude rooms |
| Positioning vs QM/OpenClaw | Day-one multiplayer admin brain |
| Ledger prioritized for **mentor-exportable** weekly brief | Public ranking |

---

## 9. Related

- Process pack: [`company-os/`](company-os/)  
- Optional MCP: [`mcp/README.md`](mcp/README.md)  
- Template policy: [README](README.md#template-change-policy)  
- PR (local MCP): https://github.com/ivelin/bootstrap/pull/1  

---

*You supply the insight. AI supplies the speed. Roadmap supplies kill criteria — or it is theater.*
