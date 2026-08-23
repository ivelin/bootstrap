# Bootstrap OS plugin (preview 0.1.0)

Portable Agent Plugin: `plugin.json` + `mcp.json` + `skills/`. Cursor may also read `.cursor-plugin/plugin.json`.

**Not** a marketplace listing. **Not** a second front door. **Not** mentee-ready hosted boards.

Path 1 stays default: point an AI at https://github.com/ivelin/bootstrap

## Skills

Thin when-to-use + links to the published OS. They do not copy the constitution.

| Skill | Points at |
|-------|-----------|
| `path-1-default` | https://github.com/ivelin/bootstrap |
| `house-rule-pins` | OS 2.8.6 / 2.8.7 / spoken-yes / several ideas |
| `first-hour` | `company-os/first-hour.md` |

## Hosted MCP URL

`mcp.json` pins the preview Streamable HTTP host `https://bootstrap-os-mcp.vercel.app/mcp`. `${BOOTSTRAP_MCP_URL}` may override. Not mentee-ready boards. Not a marketplace. Do not use `mcp.pirin.ai`.

Read tools only: OS info, docs, house-rule pins. Founder `company-state` stays path 3 local stdio.

Deploy recipe (new Vercel project `bootstrap-os-mcp` only):

```bash
cd mcp
npx vercel --prod --yes --scope ivelins-projects-9f9b7132
```

Create project `bootstrap-os-mcp` in that team. Never `v0-pirin-ai-founder-studio`.
