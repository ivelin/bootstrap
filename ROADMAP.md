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
| **Open questions** | Will non-technical mentees use local MCP, or only markdown + later hosted read path? Does ledger reduce thrash in a real FI/mentorship cohort? |
| **Last roadmap review** | 2026-08-07 |

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
| **Export pack** | Diligence / advisor brief without scramble | One command or scripted folder: timeline + decisions + scores + human-eyes |
| **Harness-agnostic state** | Stops tool thrash | Same control plane after switching Cursor ↔ Claude ↔ Grok ↔ local agent |

### Out (explicit kill / defer — do not build “just in case”)

| Idea | Why out |
|------|---------|
| Public founder leaderboard | Vanity; games process |
| Investor discovery via MCP | Unlikely channel; dilutes job |
| Auto-ingest chat / auto skill farms | Becomes the noise we exist to avoid |
| Cap table / full data-room SaaS | Wrong product boundary |
| Hosting/runtime opinions (beyond human-eyes URL) | Not the job |
| Investor-readiness score theater | Harms trust |
| Requiring MCP for install | Breaks non-technical floor |

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
| **Evidence** | Public repo; intensive/workshops can teach without MCP |
| **Status** | **Advance candidate** — treat as shipped process baseline (v2.8 docs) |

### Phase B — Thin local MCP (gates + state) — *current thin slice*

| | |
|--|--|
| **Ship** | [PR #1](https://github.com/ivelin/bootstrap/pull/1): stdio MCP, policy tools, thin `company-state.json`, no template writes |
| **Done means** | Non-maintainer cold path: clone → `mcp` build → point at *instance* state → `bootstrap_where_are_we` + blocked phase advance without approval |
| **Dogfood** | Pirin / Bootstrap maintainer instance uses MCP weekly for “Where are we?” on *this* product |
| **Kill if** | Cold install fails repeatedly for target mentees *and* markdown-only already covers them → keep markdown, archive MCP |
| **Status** | **In build** — human-eyes unknown until cold path green |

### Phase C — Evidence ledger + export (next high impact)

| | |
|--|--|
| **Ship** | Append-only ledger (milestones, decisions, evidence labels, gate events); `list_timeline`; `export_data_room` (markdown/zip) |
| **Done means** | Weekly stage-7 writes 1–3 ledger entries; export usable for advisor/mentor brief without chat dig |
| **Dogfood** | 4 consecutive weekly snapshots for Bootstrap OS itself live only in ledger + state (not “we talked about it”) |
| **Kill if** | Ledger unused after 4 dogfood weeks → do not build hosted on top of fiction |
| **Status** | **Next** after Phase B human-eyes green or explicit iterate |

### Phase D — Hosted read path (optional)

| | |
|--|--|
| **Ship only if** | Phase C dogfood green **and** real demand for shareable read-only export (mentors/investors/cofounders) |
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

### Ready for human eyes (this product)

Before asking mentees/founders to “try the MCP”:

- Cold path on a machine that is not the maintainer’s daily setup  
- Instance root ≠ template root  
- Documented five-minute failure modes  

Green human-eyes ≠ demand for MCP. Markdown remains the floor.

### Anti-patterns (dogfood)

| Anti-pattern | Response |
|--------------|----------|
| Roadmap grows features without kill criteria | Delete or move to Out |
| “We’ll need leaderboard later” | No — re-open only with real evidence |
| Dogfood only in chat | Fail week — no Advance |
| Shipping hosted to avoid fixing local cold path | Hold hosted; fix B |

---

## 6. Success / kill for the *product* (not vanity)

| Signal | Counts as evidence | Does not count |
|--------|--------------------|----------------|
| Mentee answers “Where are we?” in <2 minutes from OS state | Company signal | Stars alone |
| Switch harness without losing phase/loop/evidence | Company signal | “People liked the demo” |
| Mentor brief from export without Slack archaeology | Company signal | Waitlist for hosted |
| Four weeks dogfood ledger discipline | Company signal | Internal enthusiasm |

**Kill Bootstrap-as-product experiments** (not the helpful markdown pack) if after a real cohort: no one uses gates or ledger and thrash continues unchanged. Keep portable docs; stop investing in MCP surface.

---

## 7. Near-term checklist

- [ ] Merge Phase B only after cold-path notes exist (or explicit “maintainers-only alpha”)  
- [ ] Pirin dogfood: filled instance **outside** this template repo (per template policy)  
- [ ] Phase C schema design: event types only (`milestone`, `decision`, `evidence`, `gate`, `score_snapshot`) — no kitchen sink  
- [ ] Refuse PRs that add Out-list features without Advance evidence  
- [ ] Next roadmap review: after Phase B human-eyes check or ≤ 14 days  

---

## 8. Related

- Process pack: [`company-os/`](company-os/)  
- Optional MCP: [`mcp/README.md`](mcp/README.md)  
- Template policy: [README](README.md#template-change-policy)  
- PR (local MCP): https://github.com/ivelin/bootstrap/pull/1  

---

*You supply the insight. AI supplies the speed. Roadmap supplies kill criteria — or it is theater.*
