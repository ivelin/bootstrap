# E2E role-play matrix + draft prod synthetic SRE

Say it **once** here. Other files link. First-user SQL stays in [`HOSTED_IDENTITY.md`](HOSTED_IDENTITY.md#first-user-rebuild-from-github). Invite/accept contract stays in [`INVITE.md`](INVITE.md). HTTP challenge strings stay in HOSTED_IDENTITY.

This is **test/docs infrastructure**. PGlite / unit only. Dev and test never touch prod. PR cloud agents do **not** migrate, seed, or live-probe `supabase-pirin-ai`.

## Role-play matrix (CI now vs pending)

Critical paths run in CI on **PGlite** before any prod synthetic. Evidence: `mcp/test/e2e-roleplay-matrix.test.mjs` (also wired into `npm run test:unit` / `npm run ci`).

| ID | Role-play | Path | CI now |
|----|-----------|------|--------|
| R1 | PM empty / uninvited context | No Bearer → handshake + gated `bootstrap_whoami` HTTP **401** (`missing_or_short_token`) | Yes |
| R2 | PM valid JWT, no mentee row | Gated whoami HTTP **401**, `reason: not_invited`. Not open login. | Yes |
| R3 | CTO first-user rebuild | SQL insert (email lowercased) + optional label → invited whoami **PASS**. Prefer `zk0` as the outsider-identical dogfood label. | Yes (fixture) |
| R4 | Wrong token | Non-JWT / unusable Bearer → gated **401** (`not_a_pirin_access_token` or `invalid_or_revoked_token`). No label leak. | Yes |
| R5 | Expired token | JWT `exp` in the past → gated **401** `invalid_or_revoked_token`. Fixture-allowed only — this host does not verify JWKS. | Yes |
| R6 | Cross-company labels | Fixture A sees `alpha` only; B sees `bravo` only; Ivelin sees `pirin` / `zk0` / `totbox`. | Yes |
| P1 | `invite_member` | Allowlisted inviter (Ivelin) invites Bill to a label they hold (`zk0`). Accept card (DraftExternalMessage). Uninvited cannot invite. Cross-company label refused. | Yes |
| P2 | `accept_invite` | Bill accepts → allowlist + `zk0`. Wrong email, expired, replay, bad token fail closed. | Yes |
| P3 | Mail round-trip | Invite body / mailer / QR / SMS | **Pending**. Follow-on. Not this PR. |

Rebuild-from-GitHub first user is still a **direct SQL insert** (Cos / empty project — never a PR agent). Link only: [First user (rebuild from GitHub)](HOSTED_IDENTITY.md#first-user-rebuild-from-github). Later mentees: [INVITE.md](INVITE.md).

## Draft prod synthetic SRE (Cos only — not PR CI)

Do **not** run these from a PR cloud agent. Optional maintainer probe of **read-only** production surfaces: `GET /health`, cookie-less handshake. Invited whoami needs a real pirin.ai token Cos already holds — never mint, never paste `bos_`, never apply fixture SQL to prod.

| Check | Prod pin `https://mcp.bootstrap.pirin.ai` | Pass |
|-------|------------------------------------------|------|
| Liveness | `GET /health` | `200` body `ok` |
| Handshake | Cookie-less `initialize` / GET SSE / `tools/list` | HTTP **401** + `WWW-Authenticate` (same string as [`HOSTED_IDENTITY.md`](HOSTED_IDENTITY.md#http-contract)) |
| Whoami uninvited | Bearer with a valid pirin.ai JWT **not** on `bootstrap_mcp_mentees` | HTTP **401**, `reason: not_invited` |
| Whoami invited | Bearer Cos already has (Ivelin / zk0 dogfood) | `authenticated: true`, labels include `zk0`. Labels only — not boards. |
| Whoami empty | No `Authorization` | HTTP **401** (same challenge) |
| Deploy Host | `https://bootstrap-os-mcp.vercel.app` | Same handshake **401**. Not a Path 1 pin. Not a silent 200. |
| Rollback | Vercel project `bootstrap-os-mcp` → Deployments → Redeploy / previous production | Path 1 (GitHub) stays the front door |

`mcp/test/preview-live.mjs` is the optional handshake/`/health` probe. It is **not** in `npm run ci`. It must **not** call invited whoami, mutate prod, or apply migrations.

## Out

No live prod mutate. No migrate / seed / live-probe of `supabase-pirin-ai` from this repo’s PR agents. No login UI. No invite mailer. No mentee roster. No second host.
