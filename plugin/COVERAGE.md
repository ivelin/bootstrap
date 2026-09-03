# Plugin 0.1.1 — coverage story (this PR, not a product)

Process bar stays on **Vercel’s current** Git integration, preview, env, and tests. No second CI host. Public OS tools: no login. Optional gated identity (whoami + labels) uses the existing pirin.ai Supabase — not a new Neon, not company-state. One connector: `https://bootstrap-os-mcp.vercel.app/mcp`.

This is a **preview package**. Not mentee-ready hosted boards. Path 1 stays the front door.

## Locked (CI / file)

| Lock | Where | What it proves |
|------|--------|----------------|
| Team listing → `plugin/` | `.cursor-plugin/marketplace.json` + Day-0 + MCP unit | One plugin. Import from Repo file shape only. Not a public catalog submit. |
| Connector URL | `plugin/mcp.json` | Only `https://bootstrap-os-mcp.vercel.app/mcp`. No Gmail/Stripe/other. |
| `${BOOTSTRAP_MCP_URL}` default | `plugin/.cursor-plugin/plugin.json` | Optional override defaults to that host. |
| Plugin 0.1.1 + thin skills | `plugin/plugin.json`, `skills/*/SKILL.md` | Hyperlinks to the published OS. No constitution copy. |
| Standing rule | `plugin/skills/query-os-first/SKILL.md` | 0-1 / GTM / spoken yes / empty-context / optimal price / automate the playbook / new landing page as bottleneck. Query this plugin first. Do not invent stage, a price, or an LTV number. Exit without fences+proof — refuse, two clocks. Cite OS. |
| After-proof efficiency page | `company-os/after-proof-efficiency.md` | Dated 2026-08-24. Five instruments. Open only if fences + proof + they asked. Not a house rule. Not a version bump. |
| After-proof efficiency gate | `plugin/skills/after-proof-efficiency/SKILL.md` + `mcp/src/after-proof-efficiency.ts` | Plugin opens the page only if ALL three. Otherwise two clocks. |
| OS 2.8.8 house rule (once) | `company-os/operating-system.md` | Full text of *there is no optimal price until people have paid and stayed*. Pointers only elsewhere. |
| OS 2.8.9 house rule (once) | `company-os/operating-system.md` | Full text of *do not automate a step that should not exist*. One bottleneck this week. Pointers only elsewhere. |
| Day 0 question (once) | `company-os/operating-system.md` | Full text of *lifestyle or swinging for the fences*. First-hour / Path 1 keep a short pin + link. |
| After First Hour standing rules (once) | `company-os/first-hour.md` | Full line: query hosted MCP `https://bootstrap-os-mcp.vercel.app/mcp`. Do not upload mentee work to Ivelin's GitHub. Path 1 stays `https://github.com/ivelin/bootstrap`. Skills / plugin README pin + link only. |
| Hosted-read surface (local) | `mcp` unit + HTTP smoke | `/health` → `ok`. Public read tools. Gated whoami/labels 401 + WWW-Authenticate. No company-state. `marketplace: false`. |
| Optional identity + RLS | `identity.test.mjs` + `identity-rls.test.mjs` + `identity-pglite.test.mjs` | 401 + exact pirin.ai challenge. PGlite FORCE RLS (never the live project). Ivelin fixture labels. |
| Skill OS links | plugin-hyperlinks unit | Skills only hyperlink the published OS. |
| Day-0 + MCP CI | `./scripts/ci.sh`, `cd mcp && npm run ci` | Same workflows as today (GitHub Actions + Vercel). |

## Not locked (do not claim)

| Gap | Why |
|-----|-----|
| Cursor dashboard **Import from Repo** actually installing | Team-plan GUI. File listing is locked; the click is not. |
| `~/.cursor/plugins/local/bootstrap-os` loading in a real Cursor window | Local copy path is documented; GUI load is not in CI. |
| Public Cursor catalog / `/add-plugin` GitHub URL | We have **not** submitted. Do not expect it. |
| Git-branch Vercel preview as the production pin | Production pin stays `https://bootstrap-os-mcp.vercel.app/mcp` on `main`. Do not promote this branch to that hostname. |
| Production `bootstrap_os_info.pluginPreview.version` already `0.1.1` | Draft PR. Prod still serves the last production deploy until merge + Vercel production. |
| Mentee-ready hosted boards / founder `company-state` on the host | Out. Path 3 local stdio only. |
| Non-maintainer MCP cold path (M2) | Still open. Human-eyes for hosted boards stays **unknown**. |
| A human actually signed in as Ivelin and called whoami on the live pin | File/fixture lock only. Do not claim a paste that is not in this PR. |
| pirin.ai `/bootstrap-os/login` | Contract in `mcp/docs/HOSTED_IDENTITY.md`. Login + OAuth + protected-resource metadata live on pirin.ai (Web Builder). This host returns 401 + `WWW-Authenticate`. Not this repo. Do not add a login UI here. |
| Extra connectors / mentee roster / usage analytics as proof | Out. |
| A founder actually answering lifestyle vs fences, or setting a first price | File pins are locked. The conversation is not. |
| Production `bootstrap_os_info.osVersion` already `2.8.9` | Draft PR. Prod still serves the last production deploy until merge + Vercel production. |
| CAC / LTV / day-31 / day-90 / NRR / magic-number numbers on Path 1 | Must stay absent. CI locks the absence. |
| Old SaaS playbook tables as the aim | Must stay absent on Path 1 / Day 0. Stale (LTV:CAC 3x, T2D3) lives on the dated page only. |

## Visitor matrix (merge-gate CoS smell-test)

Seven cases. Skills/README make the four **agent** behaviors inevitable. Skip GUI claims we do not make.

| # | Visitor | Surface | Done means | Evidence |
|---|---------|---------|------------|----------|
| H1 | Installing founder | `first-hour` + README (a)(b)(c) | First hour + plugin + `…vercel.app/mcp` only. No auth/DB. | File lock |
| H2 | Mentee CoS, where on 0-1 | `query-os-first` | Query this plugin first. Cite OS journey 1–9. | File lock + GitHub 200 |
| H3 | Specialist, conversation = GTM? | `query-os-first` + `house-rule-pins` | Spoken yes cannot promote. Refuse. Cite OS. | File lock + GitHub 200 |
| A1 | Agent install-first | `first-hour` | Plugin + this connector only. | File lock |
| A2 | Agent 0-1 placement | `query-os-first` | Query-OS-first. | File lock |
| A3 | Agent empty-context | `query-os-first` | No founder update → do not invent their stage. unknown / none yet. | File lock + `emptyContextMayInventStage()===false` |
| A4 | Agent spoken-yes as GTM | `query-os-first` + pins | Verbal maybe is not GTM. Refuse. Cite OS. | File lock + `spokenYesMayPromote()===false` |

HTTP pin (`/`, `/health`, `/mcp`) stays a live check. **Not on this matrix:** Cursor GUI, a human Ivelin whoami paste, `mcp.pirin.ai`. PR #17 public preview (no Vercel SSO) is for the 401 / pirin.ai login loop only — not the production pin.

## Optional identity visitor matrix (labels only)

Does **not** replace the seven-case matrix. Login is optional. Install-first still says no auth.

| # | Visitor | Surface | Done means | Evidence |
|---|---------|---------|------------|----------|
| I1 | Installing founder / install-first agent | `first-hour` + public `/mcp` | Still no login required. Published OS tools work. | File lock + hosted-handler |
| I2 | Empty-context agent | `bootstrap_whoami` with no header | HTTP 401 + WWW-Authenticate to pirin.ai. Does not invent their stage. | `identity.test.mjs` |
| I3 | Logged-in Ivelin fixture | gated whoami + labels | Sees `pirin`, `zk0`, `totbox`. Not boards. | Fixture lock — not a human paste |
| I4 | Other mentee token | same tools | Cannot see Ivelin labels. | `identity.test.mjs` + RLS USING clauses |

## After First Hour visitor matrix

Not extra Day 0 homework. Day 0 stays thesis / ≥3 groups / one snapshot (~60 minutes).

| # | Visitor | Surface | Done means | Evidence |
|---|---------|---------|------------|----------|
| H1 | Installing founder | `first-hour` + standing rules | Day 0 is thesis / ≥3 / snapshot. Standing rules are after the hour. | File lock |
| H2 | After First Hour, what next | `first-hour.md` standing rules | Query published OS / hosted MCP pin. | File lock |
| A1 | Agent asked to push mentee files to ivelin/bootstrap | `query-os-first` + first-hour pin | Refuse. Cite OS/MCP pin. Path 1 stays the GitHub front door. | File lock |

## Do not automate visitor matrix

Not Day 0 homework. Day 0 stays thesis / ≥3 groups / one snapshot. Pass only if they delete or name the person first — not if they hire agents. Name the one bottleneck this week and work that. Several ideas may attack that same bottleneck.

| # | Visitor | Surface | Done means | Evidence |
|---|---------|---------|------------|----------|
| H1 | Installing founder | `first-hour` + standing rules | Day 0 is thesis / ≥3 / snapshot. This rule is not a Day 0 checkbox. | File lock |
| H2 | Mentee told to “automate the playbook” | `query-os-first` + `house-rule-pins` | Refuse. Name the person or delete the step. Cite OS. | File lock + `playbookMayBeAutomatedWithoutNamedOwner()===false` |
| H3 | Specialist, agent team to skip a step with no named owner | same skills | Refuse. An agent team is automation. Delete or name first. | File lock + `agentTeamMaySkipUnownedStep()===false` |
| H4 | New landing page as the bottleneck; no one has talked to customers | `query-os-first` + `house-rule-pins` | Refuse. Fun side quest. Written founder override only. | File lock + `newLandingPageMayBeBottleneckWhenNoOneHasTalkedToCustomers()===false` |

## After-proof efficiency visitor matrix

Eight cases this page must support. Thin links, not essays. No auth. No database. No public catalog.

| # | Visitor | Surface | Done means | Evidence |
|---|---------|---------|------------|----------|
| H1 | Fences + proof + asks efficiency/exit | `after-proof-efficiency` skill → page | Sees the dated page | File lock + `afterProofEfficiencyPageMayOpen` true |
| H2 | Lifestyle founder | same skill | Must not be sent this page | File lock + gate false |
| H3 | 0-1 / no proof | `query-os-first` + Path 1 / first-hour | Two clocks only. No numbers | File lock + Path 1 absence |
| H4 | Cites LTV:CAC 3x or T2D3 as the aim | `house-rule-pins` + page | Stale. Cite the page | File lock |
| A1 | Agent empty-context | `query-os-first` + MCP gate | Do not invent stage, price, or these metrics | File lock + `emptyContextMayInventEfficiencyMetrics()===false` |
| A2 | Agent exit without fences+proof | `query-os-first` | Refuse. Two clocks | File lock + gate false |
| A3 | Agent Path 1 / Day 0 | `path-1-default` + `first-hour` | No CAC / NRR / magic-number numbers | File lock |
| A4 | Source older than a year | the page | Mark dead or cut | File lock |

## Preview checks

Stay on Vercel Git:

1. PR check **Vercel** → Ready (this branch).
2. Production pin `https://bootstrap-os-mcp.vercel.app` — `/`, `/health`, `/mcp` (anonymous, `main` only).
3. PR #17 public preview (Vercel Authentication off): `https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp`. Cookie-less initialize / GET SSE / tools/list are MCP 401 + WWW-Authenticate to the #143-style well-known — not Vercel `{protection}`. Production pin initialize / tools/list stay HTTP 200. Gated whoami/labels 401 with WWW-Authenticate to live `https://pirin.ai/.well-known/oauth-protected-resource`.

## Env

Hosted-read already sets `BOOTSTRAP_MCP_SURFACE=hosted-read` and defaults docs to the published repo. Optional `${BOOTSTRAP_MCP_URL}` override only. No mentee company-state env.

Gated whoami env is live on `bootstrap-os-mcp` (do not print values). PR CI uses PGlite. Do not live-probe the production pin from a PR agent.

## SRE already in play

| Control | How |
|---------|-----|
| Liveness | `GET /health` → `ok` |
| Logs | Vercel project `bootstrap-os-mcp` → Logs |
| Rollback | Vercel → Deployments → Redeploy / promote previous production. Do not invent a second host. |
| Fallback | Path 1: point an AI at https://github.com/ivelin/bootstrap |

## Honesty

Green CI on this PR is **packaging + preview-host honesty**, not demand, not PMF, not mentee-ready boards.
