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
| **HTTP hosted-read** | `node test/http-mcp.client.mjs` | Streamable HTTP serves OS info/docs without a local clone; write tools absent |
| **Mentee visitor matrix** | `test/mentee-visitor-matrix.test.mjs` | Claimed mentee-agent file surfaces (skills, README, marketplace.json) |
| **Hosted identity + RLS** | `identity.test.mjs` + `identity-rls.test.mjs` + `identity-pglite.test.mjs` | Public OS stays open; gated tools 401 + exact WWW-Authenticate; PGlite FORCE RLS (never the live project) |
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
7. OS 2.8.9 house rules: stated / synthetic / observed (observed wins); spoken yes cannot promote; no demographic one-liner seed; no Likert / naked dollar WTP; several ideas allowed (rank and kill per board); marketing volume cannot promote; there is no optimal price until people have paid and stayed; do not automate a step that should not exist.
8. Same state furniture: instance gets `company-state.json` + `where-are-we.py` (and schema). Hosted read adapter is preview only — no founder state on a shared server.

## Manual (before ready-for-review)

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| M1a | **Automated** stdio protocol smoke in CI | [x] `test/stdio-mcp.client.mjs` | CI job |
| M1b | Human client (Cursor/Claude/Grok) using `config/mcp.stdio.example.json` | [x] Grok CLI 2026-08-16 CT, sandbox only | [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md) sign-off. Not Cursor GUI. M2 still required. |
| M2 | Non-maintainer cold path | ☐ | Runbook [`docs/COLD_PATH.md`](docs/COLD_PATH.md) + sign-off form |
| M3 | Private dogfood weekly snapshot + stage-7 | [x] 2026-08-16 Pirin instance (one week, not four) | Private files, not this template. M2 still open. |
| M4 | PR description test plan boxes checked with evidence | ☐ | PR body |
| M5 | Human-eyes for MCP still labeled honestly (`unknown` until M2) | ☐ | honest status |

## SRE / ops notes

- **Runtime:** Node ≥20. Stdio is the write path. `npm run start:http` is a preview read adapter (no company-state).
- **State:** founder-owned disk under `BOOTSTRAP_DATA_ROOT` (default `~/.bootstrap-os`).
- **Failure modes:** missing state file, unknown companyId, template demo mode when no instance — tools return structured errors, not silent success.
- **Secrets:** do not put API keys in company state; traces may be shared carefully (no PII). Identity tests use PGlite. Env pin is parked. Never service role.
- **Rollback:** Vercel → Deployments → Redeploy / previous production on `bootstrap-os-mcp`. Path 1 (point an AI) remains the default forever; disable MCP client config to fall back. Hosted read adapter is preview only. Logs: Vercel project logs. Liveness: `GET /health`.
- **Runbooks:** [`docs/COLD_PATH.md`](docs/COLD_PATH.md), [`docs/CLIENT_CONNECT.md`](docs/CLIENT_CONNECT.md)

## Exit criteria for this PR

- [x] Automated CI workflow present
- [x] Unit + smoke + **stdio client** coverage for hard rules
- [x] Cold-path + client-connect runbooks published
- [x] Manual M1b (Grok CLI, sandbox) + first-week M3 (Pirin snapshot). M2 is **post-merge** on `main`
- [x] Maintainer decision: merge as **maintainers-only alpha**. Mentees use `main` only. Do not hand them this PR.
