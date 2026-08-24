# Bootstrap OS plugin (preview 0.1.1)

Preview package. Skills hyperlink the published OS. **Not** mentee-ready hosted boards. **Not** a public Cursor marketplace listing — we have not submitted. **Not** a second front door.

Path 1 stays default: point an AI at https://github.com/ivelin/bootstrap

Coverage (what CI locks vs what it does not): [`COVERAGE.md`](COVERAGE.md). Visitor matrix is only for surfaces a mentee agent is told to see. Git-branch Vercel preview is SSO-gated — use the public pin.

## Standing rule

Mentee CoS and specialists query this plugin first when the ask is where current work sits on 0-1, whether a conversation is GTM/traction, or whether a spoken yes is enough. Empty context with no founder update — do not invent their stage. A verbal maybe is not GTM — refuse and cite the OS. Do not speak as Ivelin. Do not host mentee boards. See [`query-os-first`](skills/query-os-first/SKILL.md).

## Merge-gate visitor matrix (CoS smell-test)

Seven cases this package must support. Thin links, not essays. No auth. No database. No public catalog.

**Human**

1. Installing founder, first hour, plugin + MCP connector — [`first-hour`](skills/first-hour/SKILL.md) + this README (a)(b)(c). Connector only `https://bootstrap-os-mcp.vercel.app/mcp`.
2. Mentee CoS asking where current work sits on 0-1 — [`query-os-first`](skills/query-os-first/SKILL.md).
3. Specialist asking whether a customer conversation counts as GTM/traction — [`query-os-first`](skills/query-os-first/SKILL.md) + [`house-rule-pins`](skills/house-rule-pins/SKILL.md). Spoken yes cannot promote.

**Agent** (these four must be inevitable)

1. Install-first, plugin + connector only — [`first-hour`](skills/first-hour/SKILL.md). No other connectors.
2. Query-OS-first on a 0-1 placement ask — [`query-os-first`](skills/query-os-first/SKILL.md).
3. Empty-context, no founder update — do not invent their stage. Write unknown / none yet. Same skill.
4. Spoken-yes / verbal maybe treated as GTM — refuse and cite the OS. Same skill + house-rule pins.

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

## Feedback

This is an escalation to Ivelin, not a public suggestion box. If a rule is unclear or a milestone feels wrong, send the published OS URL, what you tried, and why it failed — email ivelin@pirin.ai or open a public GitHub issue on ivelin/bootstrap. Either path is fine. No mentee names, no customer names or lists, no personal, family, or business PII, no secret sauce. Cos brings it to him. Feedback does not auto-change house rules.

## What stays in this folder

Portable Agent Plugin: `plugin.json` + `mcp.json` + `skills/`. Cursor may also read `.cursor-plugin/plugin.json`.

## Skills

Thin when-to-use + links to the published OS. They do not copy the constitution.

| Skill | Points at |
|-------|-----------|
| `query-os-first` | 0-1 / GTM / spoken yes / empty-context (do not invent stage) |
| `path-1-default` | https://github.com/ivelin/bootstrap |
| `house-rule-pins` | Spoken yes is not GTM; 2.8.6 / 2.8.7 |
| `first-hour` | Day 0 + install-first (plugin + this connector only) |

## Hosted MCP URL

`mcp.json` pins the preview Streamable HTTP host `https://bootstrap-os-mcp.vercel.app/mcp`. `${BOOTSTRAP_MCP_URL}` may override (default is that host). Not mentee-ready boards. Not a public catalog. Do not use `mcp.pirin.ai`.

Read tools only: OS info, docs, house-rule pins. Founder `company-state` stays path 3 local stdio.

Deploy recipe (new Vercel project `bootstrap-os-mcp` only):

```bash
cd mcp
npx vercel --prod --yes --scope ivelins-projects-9f9b7132
```

Create project `bootstrap-os-mcp` in that team. Never `v0-pirin-ai-founder-studio`.
