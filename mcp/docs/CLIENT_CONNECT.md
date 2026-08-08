# M1 — MCP client connect checklist

Automated companion: `npm run test:stdio` (spawns server + official SDK client over stdio).

## Human checklist

1. [ ] `cd mcp && npm ci && npm run build`
2. [ ] Absolute paths in client config (`config/mcp.stdio.example.json`)
3. [ ] Client restarted; server `bootstrap-os` shows connected
4. [ ] Tool list includes `bootstrap_where_are_we` and multi-company tools
5. [ ] Init `sandbox-demo` → state file on disk under `BOOTSTRAP_DATA_ROOT`
6. [ ] Unapproved phase change rejected
7. [ ] `bootstrap_refuse_external_ask_if_not_green` → `allow: false` when eyes ≠ green
8. [ ] Second company does not inherit first company's phase

Attach evidence on the PR (logs or screenshots). Keep human-eyes for MCP itself at **unknown** until cold path M2 is signed by a non-author.
