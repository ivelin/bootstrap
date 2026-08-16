# MCP QA / merge gates

**Rule:** Do not merge to `main` until every gate below is green. Draft PRs may land incomplete code on feature branches only.

## Automated (CI must pass)

| Gate | Command / job | Pass criteria |
|------|----------------|---------------|
| Typecheck | `npm run typecheck` | zero errors |
| Build | `npm run build` | `dist/` emits index + policy + companies |
| Unit tests | `npm run test:unit` | phase gate, isolation, policy, markdown path |
| Cold-path smoke | `node test/cold-path.smoke.mjs` | multi-company + refuse external ask + no template writes |
| **Stdio MCP client (M1 protocol)** | `node test/stdio-mcp.client.mjs` | official SDK client over stdio: tools, init, phase gate, refuse |
| Markdown path | CI job `markdown-path` | portable docs + state JSON valid without MCP |

Local full CI mirror:

```bash
cd mcp && npm ci && npm run ci
```

## Hard product rules (asserted in tests)

1. Journey phase does **not** advance without `founderApprovedPhaseChange` / `allowPhaseAdvance`.
2. `evaluateExternalAsk` denies when human-eyes ≠ green (unless founder override).
3. Multi-company state is isolated by `companyId` under `BOOTSTRAP_DATA_ROOT`.
4. MCP never mutates files under `company-os/`.
5. Markdown path (point-an-AI / optional install) works with **zero** MCP usage.
6. Stdio MCP protocol serves the full tool surface to a real client.
7. OS 2.8.3 house rules: stated / synthetic / observed (observed wins); spoken yes cannot promote; no demographic one-liner seed; no Likert / naked dollar WTP.
8. Same state furniture: instance gets `company-state.json` + `where-are-we.py` (and schema). Hosted MCP does not exist.

## Manual (before ready-for-review)

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| M1a | **Automated** stdio protocol smoke in CI | [x] `test/stdio-mcp.client.mjs` | CI job |
| M1b | Human client (Cursor/Claude/Grok) using `config/mcp.stdio.example.json` | ☐ | See [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md) |
| M2 | Non-maintainer cold path | ☐ | Runbook [`docs/COLD_PATH.md`](docs/COLD_PATH.md) + sign-off form |
| M3 | Private dogfood weekly snapshot + stage-7 | ☐ | ROADMAP §5a |
| M4 | PR description test plan boxes checked with evidence | ☐ | PR body |
| M5 | Human-eyes for MCP still labeled honestly (`unknown` until M2) | ☐ | honest status |

## SRE / ops notes

- **Runtime:** Node ≥20, stdio MCP only (no network server in v0.2).
- **State:** founder-owned disk under `BOOTSTRAP_DATA_ROOT` (default `~/.bootstrap-os`).
- **Failure modes:** missing state file, unknown companyId, template demo mode when no instance — tools return structured errors, not silent success.
- **Secrets:** do not put API keys in company state; traces may be shared carefully (no PII).
- **Rollback:** path 1 (point an AI) remains the default forever; disable MCP client config to fall back. Hosted MCP does not exist.
- **Runbooks:** [`docs/COLD_PATH.md`](docs/COLD_PATH.md), [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md)

## Exit criteria for this PR

- [x] Automated CI workflow present
- [x] Unit + smoke + **stdio client** coverage for hard rules
- [x] Cold-path + client-connect runbooks published
- [ ] Manual M1b + M2 + M3 complete
- [ ] Maintainer decision: merge as **maintainers-only alpha** or hold until dogfood snapshot

Until M1b–M3 pass, keep PR **draft**.
