# Plugin 0.1.1 — coverage story (this PR, not a product)

Process bar stays on **Vercel’s current** Git integration, preview, env, and tests. No second CI host. No database. No auth build. One connector: `https://bootstrap-os-mcp.vercel.app/mcp`.

This is a **preview package**. Not mentee-ready hosted boards. Path 1 stays the front door.

## Locked (CI / file / live pin)

| Lock | Where | What it proves |
|------|--------|----------------|
| Team listing → `plugin/` | `.cursor-plugin/marketplace.json` + Day-0 + MCP unit | One plugin. Import from Repo file shape only. Not a public catalog submit. |
| Connector URL | `plugin/mcp.json` | Only `https://bootstrap-os-mcp.vercel.app/mcp`. No Gmail/Stripe/other. |
| `${BOOTSTRAP_MCP_URL}` default | `plugin/.cursor-plugin/plugin.json` | Optional override defaults to that host. |
| Plugin 0.1.1 + thin skills | `plugin/plugin.json`, `skills/*/SKILL.md` | Hyperlinks to the published OS. No constitution copy. |
| Standing rule | `plugin/skills/query-os-first/SKILL.md` | 0-1 / GTM / spoken yes / empty-context / optimal price. Query this plugin first. Do not invent stage, a price, or an LTV number. Cite OS. |
| OS 2.8.8 house rule (once) | `company-os/operating-system.md` | Full text of *there is no optimal price until people have paid and stayed*. Pointers only elsewhere. |
| Day 0 question (once) | `company-os/operating-system.md` | Full text of *lifestyle or swinging for the fences*. First-hour / Path 1 keep a short pin + link. |
| Hosted-read surface (local) | `mcp` unit + HTTP smoke | `/health` → `ok`. Read tools only. No company-state. `marketplace: false`. |
| Hosted-read surface (live pin) | `mcp/test/preview-live.mjs` | Anonymous visitor on `*.vercel.app` `/`, `/health`, `/mcp`. Honesty text. No write tools. |
| Skill OS links | preview-live | Each `https://github.com/ivelin/bootstrap` link in skills returns HTTP 200. |
| Day-0 + MCP CI | `./scripts/ci.sh`, `cd mcp && npm run ci` | Same workflows as today (GitHub Actions + Vercel). |

## Not locked (do not claim)

| Gap | Why |
|-----|-----|
| Cursor dashboard **Import from Repo** actually installing | Team-plan GUI. File listing is locked; the click is not. |
| `~/.cursor/plugins/local/bootstrap-os` loading in a real Cursor window | Local copy path is documented; GUI load is not in CI. |
| Public Cursor catalog / `/add-plugin` GitHub URL | We have **not** submitted. Do not expect it. |
| Git-branch Vercel preview as a mentee URL | Preview is **SSO-gated**. Mentee agents are told the public pin, not the `*-git-*` preview host. |
| Production `bootstrap_os_info.pluginPreview.version` already `0.1.1` | Draft PR. Prod still serves the last production deploy until merge + Vercel production. |
| Mentee-ready hosted boards / founder `company-state` on the host | Out. Path 3 local stdio only. |
| Non-maintainer MCP cold path (M2) | Still open. Human-eyes for hosted boards stays **unknown**. |
| Database, auth, extra connectors | Not started. Do not start. |
| A founder actually answering lifestyle vs fences, or setting a first price | File pins are locked. The conversation is not. |
| VC scoreboard / top-shelf exit page | Out of this PR. After proof only (growth pack / phases 8–9). |
| Production `bootstrap_os_info.osVersion` already `2.8.8` | Draft PR. Prod still serves the last production deploy until merge + Vercel production. |
| CAC / LTV / day-31 / day-90 targets on Path 1 | Must stay absent. CI locks the absence, not a target. |
| Old SaaS playbook tables as the aim | Must stay absent. No invented replacement targets. A later page that cites numbers must use dated current-year AI sources. |

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

HTTP pin (`/`, `/health`, `/mcp`) stays a live check. **Not on this matrix:** Vercel SSO preview, Cursor GUI, pirin.ai, `mcp.pirin.ai`.

## Preview checks

Stay on Vercel Git:

1. PR check **Vercel** → Ready (this branch).
2. Public pin `https://bootstrap-os-mcp.vercel.app` — `/`, `/health`, `/mcp` (anonymous).
3. Git preview URL exists for maintainers; **SSO redirect** means it is not a mentee visitor.

## Env (no new secrets)

Hosted-read already sets `BOOTSTRAP_MCP_SURFACE=hosted-read` and defaults docs to the published repo. Optional `${BOOTSTRAP_MCP_URL}` override only. No mentee company-state env. No DB URL. No auth keys.

## SRE already in play

| Control | How |
|---------|-----|
| Liveness | `GET /health` → `ok` |
| Logs | Vercel project `bootstrap-os-mcp` → Logs |
| Rollback | Vercel → Deployments → Redeploy / promote previous production. Do not invent a second host. |
| Fallback | Path 1: point an AI at https://github.com/ivelin/bootstrap |

## Honesty

Green CI on this PR is **packaging + preview-host honesty**, not demand, not PMF, not mentee-ready boards.
