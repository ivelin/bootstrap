# MCP QA / merge gates

**Rule:** Do not merge to `main` until every gate below is green. Draft PRs may land incomplete code on feature branches only.

## Automated (CI must pass)

| Gate | Command / job | Pass criteria |
|------|----------------|---------------|
| Typecheck | `npm run typecheck` | zero errors |
| Build | `npm run build` | `dist/` emits index + policy + companies |
| Unit tests | `npm run test:unit` | phase gate, isolation, policy, markdown path |
| Cold-path smoke | `node test/cold-path.smoke.mjs` | multi-company + refuse external ask + no template writes |
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
5. Markdown install path works with **zero** MCP usage.

## Manual (before ready-for-review)

| # | Check | Owner sign-off |
|---|--------|----------------|
| M1 | Connect Cursor/Claude/Grok with `config/mcp.stdio.example.json` against a real data root | ☐ |
| M2 | Cold path on a non-maintainer machine: clone → `npm ci && npm run build` → init company → `where_are_we` | ☐ |
| M3 | Private dogfood instance has weekly snapshot + stage-7 note (see root `ROADMAP.md` §5a) | ☐ |
| M4 | PR description test plan boxes all checked with evidence links | ☐ |
| M5 | Human-eyes for MCP still labeled honestly (`unknown` until M2) | ☐ |

## SRE / ops notes

- **Runtime:** Node ≥20, stdio MCP only (no network server in v0.2).
- **State:** founder-owned disk under `BOOTSTRAP_DATA_ROOT` (default `~/.bootstrap-os`).
- **Failure modes:** missing state file, unknown companyId, template demo mode when no instance — tools return structured errors, not silent success.
- **Secrets:** do not put API keys in company state; traces may be shared carefully (no PII).
- **Rollback:** markdown path remains default forever; disable MCP client config to fall back.

## Exit criteria for this PR

- [x] Automated CI workflow present
- [x] Unit + smoke coverage for hard rules
- [ ] Manual M1–M3 complete
- [ ] Maintainer decision: merge as **maintainers-only alpha** or hold until dogfood snapshot

Until M1–M3 pass, keep PR **draft**.
