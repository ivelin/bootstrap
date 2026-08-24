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
| Standing rule | `plugin/skills/query-os-first/SKILL.md` | 0-1 / promote / spoken yes → query this plugin first. Cite OS. Do not speak as Ivelin. Do not host boards. |
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

## Visitor matrix (mentee-agent surfaces only)

Walk every surface this package **claims** a mentee CoS or specialist will see. Skip GUI claims we do not make.

| Visitor | Surface | Done means | Evidence |
|---------|---------|------------|----------|
| Cold mentee CoS | `query-os-first` | 0-1 / promote / spoken yes → plugin first; OS links; no Ivelin voice; no boards | File lock + GitHub 200 |
| Specialist (promote?) | `house-rule-pins` + `query-os-first` | Pins link OS 2.8.6 / 2.8.7 / spoken-yes | File lock + GitHub 200 |
| Day-0 founder | `path-1-default` + `first-hour` | Path 1 is the front door; first-hour is a link | File lock + GitHub 200 |
| Install reader | `plugin/README.md` | (a) Import from Repo (b) remote MCP pin (c) local copy. No `/add-plugin` catalog. | File lock |
| Team listing reader | `.cursor-plugin/marketplace.json` | One plugin, `source: plugin` | File lock |
| Anonymous HTTP | `GET https://bootstrap-os-mcp.vercel.app/` | Plain honesty. Not a board UI. | Live preview-live |
| Anonymous HTTP | `GET …/health` | `ok` | Live preview-live |
| MCP mentee agent | `POST …/mcp` | Hosted-read tools. No init/update/where-are-we. `marketplace: false`. Company-state not hosted. | Live preview-live |

**Not on this matrix (not claimed as mentee-visible):** Vercel SSO preview, Cursor GUI, pirin.ai, `mcp.pirin.ai`.

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
