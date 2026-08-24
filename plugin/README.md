# Bootstrap OS plugin (preview 0.1.1)

Preview package. Skills hyperlink the published OS. **Not** mentee-ready hosted boards. **Not** a public Cursor marketplace listing — we have not submitted. **Not** a second front door.

Path 1 stays default: point an AI at https://github.com/ivelin/bootstrap

Coverage (what CI locks vs what it does not): [`COVERAGE.md`](COVERAGE.md). Visitor matrix is only for surfaces a mentee agent is told to see. Git-branch Vercel preview is SSO-gated — use the public pin.

## Standing rule

Mentee CoS and specialists query this plugin first when the ask is where current work sits on 0-1, whether a conversation is GTM/traction, whether a spoken yes is enough, whether a price is optimal, whether a handful survey is WTP, or whether to model LTV/CAC at 0-1. Empty context with no founder update — do not invent their stage, a price, or an LTV number. Exit without fences+proof — refuse, two clocks. A verbal maybe is not GTM — refuse and cite the OS. Do not speak as Ivelin. Do not host mentee boards. See [`query-os-first`](skills/query-os-first/SKILL.md). After-proof efficiency page: [`after-proof-efficiency`](skills/after-proof-efficiency/SKILL.md) — open only if fences + proof + they asked.

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

## After-proof efficiency visitor matrix

Not a mentee dashboard. Not Path 1. Open the page only when the three gates hold.

**Human**

1. Fences + proof + asks efficiency or an exit — sees [`after-proof-efficiency`](skills/after-proof-efficiency/SKILL.md) → the page.
2. Lifestyle founder — must not be sent this page.
3. 0-1 / no proof — two clocks only. No numbers.
4. Someone citing LTV:CAC 3x or T2D3 as the aim — stale. Cite the page.

**Agent**

1. Empty context — do not invent stage, price, or these metrics.
2. Asked about exit without fences+proof — refuse, two clocks.
3. Path 1 / Day 0 — no CAC / NRR / magic-number numbers.
4. Source older than a year — mark dead or cut.

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
| `query-os-first` | 0-1 / GTM / spoken yes / empty-context (do not invent stage, price, or LTV) / optimal price / exit without fences+proof |
| `path-1-default` | https://github.com/ivelin/bootstrap · Day 0 lifestyle or fences |
| `house-rule-pins` | Spoken yes is not GTM; 2.8.6 / 2.8.7 / 2.8.8; LTV:CAC 3x / T2D3 stale |
| `first-hour` | Day 0 + install-first (plugin + this connector only) · lifestyle or fences |
| `after-proof-efficiency` | Open only if fences + proof + they asked. Otherwise two clocks. |

## Hosted MCP URL

`mcp.json` pins the preview Streamable HTTP host `https://bootstrap-os-mcp.vercel.app/mcp`. `${BOOTSTRAP_MCP_URL}` may override (default is that host). Not mentee-ready boards. Not a public catalog. Do not use `mcp.pirin.ai`.

Read tools only: OS info, docs, house-rule pins. Founder `company-state` stays path 3 local stdio.

Deploy recipe (new Vercel project `bootstrap-os-mcp` only):

```bash
cd mcp
npx vercel --prod --yes --scope ivelins-projects-9f9b7132
```

Create project `bootstrap-os-mcp` in that team. Never `v0-pirin-ai-founder-studio`.
