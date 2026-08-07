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

## 0. What Bootstrap OS is — and is not

**Conviction:** Non-technical 0→1 founders thrash on harnesses, memory tools, and hosting because nothing durable owns **judgment + status + evidence**. Bootstrap OS is that layer. Everything else is optional furniture.

**Evidence base (mixed, labeled):** mentor-observed FI patterns (high volume OH demand for “bootstrap with AI agents”); public positioning tested on X/LinkedIn; one multi-touch founder arc (thesis pressure → tool setup → real pilot feedback); peer confirmation of “disorganized chats + vibe prototypes”; **not** a large corpus of unsolicited “this OS fixed me” mail. Synthetic/design conviction fills gaps only where field repeatedly rhymes — and stays killable.

### Bootstrap OS (the product of record)

| | **IS** | **IS NOT** |
|--|--------|------------|
| **Job** | Portable **company control plane** for solo/near-solo 0→1: two clocks, founder gates, honest evidence labels, Ready for human eyes | A coding agent, IDE, cloud host, or “build my MVP for me” studio feature set |
| **Source of truth** | Markdown process pack (`company-os/`) + **founder’s instance** state (thesis, scores, phase, traces) | Chat history, auto-memory, skill marketplaces, or vendor project rooms |
| **Primary user** | Non-technical or light-technical founders who must decide Advance / Iterate / Hold / Kill | Funded multi-team orgs needing multiplayer agent admin (that’s 1–n harness territory, e.g. QM-class) |
| **Core loop** | Prove the business (slow) while learning weekly (fast); stage 7 write-back | Infinite prototype generation without gates |
| **Success** | Founder answers “Where are we?” in <2 minutes from written state; can switch tools without losing the board | Stars, waitlists, or “we installed twelve agents” |
| **Teaching** | 90‑min install + OH ritual; FI-style accountability | A certification empire or content farm without dogfood |
| **Default delivery** | **Markdown only** — zero Node required | Something you must “sign up” to think |

### MCP (optional adapter — not the OS)

| | **IS** | **IS NOT** |
|--|--------|------------|
| **Job** | Thin **tool interface** to the same process + instance state: where-are-we, gated updates, human-eyes policy, later sparse ledger/export | A new company operating system, memory product, or harness |
| **Value** | Enforces P1–P4 (and later P5) across Cursor/Claude/Grok/etc. without re-pasting novels | Required for mentees; replacement for reading the blueprint |
| **State** | Reads/writes **founder-owned** files (or future private store); template `company-os/` stays read-only | Multi-tenant social graph or public leaderboard backend |
| **Local v0.1** | Stdio server in-repo; process tools + thin `company-state.json` | Hosted SaaS, auth product, or investor network |
| **Hosted (maybe later)** | Same tool names; private by default; share **export/read** if proven | Day-one dependency; ranking; auto-ingest of all chats |
| **Noise policy** | Explicit tools only (milestone/decision/gate) | Auto skill creation, ambient memory, “agent built 40 skills today” |

### One stack picture

```text
  [ Any harness: Claude / Cursor / Grok / OpenClaw / … ]     ← changes often
              │
              │  optional MCP tools (same names local or future hosted)
              ▼
  [ Bootstrap OS control plane: gates + state + sparse evidence ]  ← stable
              │
              ▼
  [ Founder instance files / ledger / export ]                 ← founder owns
```

**Stack. Don’t swap the control plane.** Swap harnesses only after weekly snapshot + stage 7.

### Boundary vs adjacent things founders confuse us with

| Adjacent thing | Relationship |
|----------------|--------------|
| **Vibe/coding agents** (Grok Build, Cursor, Lovable, …) | Build surface. OS decides *whether/when* to ship and ask humans. |
| **Agent harnesses** (OpenClaw, Hermes, YC QM, …) | Runtime/orchestration. OS is judgment + memory spine; QM-like tools are 1–n, not day-one solo. |
| **Chat project “rooms” / memory tools** | Session context. Useful; **not** company evidence unless promoted into ledger deliberately. |
| **Pirin intensive / OH** | Human distribution and coaching of the OS — not a substitute for the portable pack. |
| **Investor data room products** | Export may *feed* diligence later; OS is not DocSend/cap-table. |

### Non-negotiables (high conviction)

1. Markdown remains sufficient to run the OS.  
2. AI never advances journey phase without founder approval.  
3. Human-eyes green ≠ demand, PMF, or willingness to pay.  
4. No leaderboard, no auto-memory as product core.  
5. Dogfood with the same gates we demand of founders.  
6. Ship only work that strengthens **P1–P6** (§2a).


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
We pursue only P1–P6 (control plane, gates, human-eyes, harness-agnostic state, sparse evidence, teachable install). Optional MCP is a delivery path for P1–P4/P5 — not a goal in itself. Hosted/social stay out until evidence appears.

---

## 2. High-impact scope only

### In (prove these) — maps to §2a

| Capability | Pursue # | Success evidence (not narrative) |
|------------|----------|----------------------------------|
| **Markdown OS** | P1, P6 | Install templates; answer “Where are we?” without Node |
| **Gates as tools (MCP optional)** | P2, P3, P4 | Phase advance blocked without founder flag; external ask blocked if human-eyes ≠ green |
| **Sparse evidence ledger + export** | P5 | Explicit milestones only; mentor brief in under 5 min |
| **Harness-agnostic state** | P4 | Same control plane after tool switch |

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

## 2a. Pursue — strong evidence only

These are the **only** benefits we actively invest in. Each row must keep a live evidence link. If evidence dies, demote to Hold/Kill.

| # | Benefit (what founders get) | Why pursue | Strongest evidence we have | How we prove it next | Phase |
|---|----------------------------|------------|----------------------------|----------------------|-------|
| **P1** | **Honest control plane** — answer “Where are we?” in under 2 minutes (phase + loop + posture + human-eyes + open questions) | Stops chat-log theater; baseline of any real OS | Public teaching claim + FI OH demand for bootstrap/status guidance; success metric already in §6 | OH capture: y/n could answer from *written state* pre/post | **A** (markdown) always; **B** tools optional |
| **P2** | **Founder gates on strategy** — Advance / Iterate / Hold / Kill; AI cannot advance phase alone | Non-tech founders need judgment scaffolding when experiments are cheap | Mentor-forced thesis rethink → better path (MicDots email); multi-idea only with boards+gates (dogfood claim) | Decision traces on thesis/phase changes in dogfood + mentee instances | **A** rules; **B** `founderApprovedPhaseChange` |
| **P3** | **Ready for human eyes** — cold happy path before “please try my link” | Stops burned early-adopter favors; keeps founder on vision | Repeated mentor/public gut-punch narrative; checklist already in OS v2.8 | Refuse external-ask tool + cold-path notes; mentee demos that don’t fail strangers | **A** checklist; **B** status + policy tools |
| **P4** | **Harness-agnostic partner** — same scoreboard when Cursor/Claude/Grok/OpenClaw change | Field thrash is real; wrappers pollute sessions | FI “bootstrap with agents” demand without single-stack loyalty; builder friction with harness pollution (X) | Same state file works after tool switch in dogfood + 1 mentee | **A** files; **B** MCP as adapter not runtime |
| **P5** | **Sparse evidence memory** — explicit milestones, labeled claims, thesis-change traces (not auto-chat memory) | Claude rooms help setup; *learning* still dies without write-back | MicDots: rooms + pilot feedback still needed a spine for “what changed and why” | Phase C ledger: 1–3 entries/week dogfood; OH export usable in under 5 min | **C** (after B or parallel markdown ledger) |
| **P6** | **Teachable 0–1 install** — 90‑min get-running + OH script, not a platform tour | Distribution and trust via FI/workshops | Luma Bootstrap OS series; packed FI OH calendar Jul–Aug 2026 | Run 90‑min on markdown-only; measure P1 success rate | **A** (+ intensive); no MCP required |

### Explicitly not elevated (evidence too weak or counter)

| Benefit idea | Verdict |
|--------------|---------|
| Local MCP as *required* install for non-tech | Demand not found — **optional only** |
| Hosted MCP / social leaderboard / investor discovery | Not found — **Out** |
| Auto skill/memory ingestion | Contradicts P4–P5 — **Out** |
| Day-one multiplayer harness (QM-class) | Wrong segment — **Out** for Bootstrap |

### Investment rule

> Ship work only if it strengthens **P1–P6**.  
> Phase B MCP is justified solely as a better delivery of **P1–P4** (and later **P5**), not as a product category of its own.


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

- [ ] **P1/P6:** Run next FI/workshop with markdown-only install; record 2‑min “Where are we?” y/n  
- [ ] **P2/P5:** Dogfood instance outside template; log thesis/phase decisions as traces  
- [ ] **P3:** Cold-path notes for human-eyes (product demos mentees share)  
- [ ] **P4:** Confirm state survives one intentional harness switch in dogfood  
- [ ] **B as delivery of P1–P4:** Merge Phase B only after cold-path notes or “maintainers-only alpha”  
- [ ] **P5 schema:** event types only (`milestone`, `decision`, `evidence`, `gate`, `score_snapshot`)  
- [ ] Start OH capture rows (confusion type + P1 y/n)  
- [ ] Refuse work that does not map to **P1–P6**  
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
