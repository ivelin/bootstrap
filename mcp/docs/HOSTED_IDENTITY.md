# Hosted MCP identity (resource server)

This host is the **resource server only**. Public OS tools stay **unauthenticated**. Gated tools require a **pirin.ai access token**.

Path 1 (point an AI at GitHub) stays enough. Path 3 local stdio stays the write path.

## Founder lock

| | |
|--|--|
| Login / OAuth / metadata | **pirin.ai only** — Web Builder owns `/bootstrap-os/login` and `/.well-known/oauth-protected-resource` |
| This repo | MCP resource server. Do **not** add a login UI. No second authorization server. |
| Copy-paste `bos_` mint | **Not the product.** Do not tell mentees to mint a string and paste it. |
| Prod database | Cloud agents on PRs do **not** migrate, seed, or live-probe the live pirin.ai Supabase. Local / preview / branch / CI use **PGlite** (or an isolated branch DB). Never prod. |
| Env pin | **Parked.** Do not set Vercel env from this PR. Production pin stays on `main`. Do not merge. |

## HTTP contract

Public tools (`bootstrap_os_info`, docs, house-rule pins), `initialize`, and `tools/list` stay **200** with no `Authorization` header.

Unauthenticated or invalid-token calls to `bootstrap_whoami` or `bootstrap_list_company_labels` (and any later gated tool) return **HTTP 401** with this exact header:

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://pirin.ai/.well-known/oauth-protected-resource", scope="bootstrap-os"
```

Metadata URL (Web Builder must publish RFC 9728 here):

`https://pirin.ai/.well-known/oauth-protected-resource`

Suggested document:

```json
{
  "resource": "https://bootstrap-os-mcp.vercel.app/mcp",
  "authorization_servers": ["https://pirin.ai"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

Login UI: `https://pirin.ai/bootstrap-os/login`. This repo does not host it.

A valid call sends the **pirin.ai-issued access token**:

```http
Authorization: Bearer <pirin.ai access_token>
```

This host validates that JWT (when env is later pinned) via `/auth/v1/user` + `bootstrap_mcp_my_labels()`. Until then, gated tools still 401; public tools still work.

## Tests (PGlite / isolated)

| | |
|--|--|
| HTTP 401 + exact `WWW-Authenticate` | `mcp/test/identity.test.mjs` |
| FORCE RLS, one mentee cannot read another | `mcp/test/identity-pglite.test.mjs` against [`../test/pglite/identity-schema.sql`](../test/pglite/identity-schema.sql) |
| SQL file locks | `mcp/test/identity-rls.test.mjs` (no network) |

Do not point CI at the live pirin.ai project. Do not run `preview-live.mjs` on PR cloud agents (that hits the production pin).

## Out

No mentee roster. No usage analytics as proof. No founder-update write. No WebMCP. No marketplace. No billing. No login UI in this repo. Insights/Apply stay email-only.
