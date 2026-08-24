# Bootstrap OS plugin (preview 0.1.1)

Preview package. Skills hyperlink the published OS. **Not** mentee-ready hosted boards. **Not** a public Cursor marketplace listing — we have not submitted. **Not** a second front door.

Path 1 stays default: point an AI at https://github.com/ivelin/bootstrap

## Standing rule

Mentee CoS and specialists query this plugin first when the ask is where a project sits on 0-1, whether something can promote, or whether a spoken yes is enough. Cite the published OS by link. Do not speak as Ivelin. Do not host mentee boards. See [`query-os-first`](skills/query-os-first/SKILL.md).

## How to install (no public catalog)

Do not `/add-plugin` a GitHub URL expecting the public catalog. We have not submitted.

**(a) Team / dashboard Import from Repo**

Cursor Dashboard → Plugins → Team Marketplaces → Import from Repo → `https://github.com/ivelin/bootstrap`

The repo-root [`.cursor-plugin/marketplace.json`](../.cursor-plugin/marketplace.json) lists this one plugin at `plugin/`. That is a team import, not a public catalog submit.

**(b) Add the remote MCP**

`https://bootstrap-os-mcp.vercel.app/mcp`

Optional `${BOOTSTRAP_MCP_URL}` override; it defaults to that host. Read tools only. Do not use `mcp.pirin.ai`.

**(c) Local copy**

Copy this `plugin/` folder to `~/.cursor/plugins/local/bootstrap-os`. Restart Cursor (or Developer: Reload Window).

## What stays in this folder

Portable Agent Plugin: `plugin.json` + `mcp.json` + `skills/`. Cursor may also read `.cursor-plugin/plugin.json`.

## Skills

Thin when-to-use + links to the published OS. They do not copy the constitution.

| Skill | Points at |
|-------|-----------|
| `query-os-first` | Standing rule — 0-1 placement / promote / spoken yes |
| `path-1-default` | https://github.com/ivelin/bootstrap |
| `house-rule-pins` | OS 2.8.6 / 2.8.7 / spoken-yes / several ideas |
| `first-hour` | `company-os/first-hour.md` |

## Hosted MCP URL

`mcp.json` pins the preview Streamable HTTP host `https://bootstrap-os-mcp.vercel.app/mcp`. `${BOOTSTRAP_MCP_URL}` may override (default is that host). Not mentee-ready boards. Not a public catalog. Do not use `mcp.pirin.ai`.

Read tools only: OS info, docs, house-rule pins. Founder `company-state` stays path 3 local stdio.

Deploy recipe (new Vercel project `bootstrap-os-mcp` only):

```bash
cd mcp
npx vercel --prod --yes --scope ivelins-projects-9f9b7132
```

Create project `bootstrap-os-mcp` in that team. Never `v0-pirin-ai-founder-studio`.
