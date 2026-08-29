# Hosted MCP identity (resource server)

This host is the **resource server only**. Public OS tools stay **unauthenticated**. Gated tools accept **access tokens issued by pirin.ai login**.

Path 1 (point an AI at GitHub) stays enough. Path 3 local stdio stays the write path.

## Founder lock

| | |
|--|--|
| Login / OAuth | **pirin.ai only.** Web Builder owns `/bootstrap-os/login` (authorize URL, authorization code + PKCE) and `/.well-known/oauth-protected-resource` |
| This repo | MCP resource server. Do **not** add a login UI. No second authorization server. |
| Product | MCP client follows 401 → protected-resource metadata → pirin.ai authorize + PKCE. The client attaches the issued access token. This host never issues connector secrets. |
| Prod database | Cloud agents on PRs do **not** migrate, seed, or live-probe the live pirin.ai project. Local / CI use **PGlite**. |
| Env pin | Ivelin saved `BOOTSTRAP_SUPABASE_URL` + `BOOTSTRAP_SUPABASE_ANON_KEY` on Vercel project `bootstrap-os-mcp` (production + preview + development). Do **not** print those values. Production pin stays on `main`. Do not merge. |

## HTTP contract

Public tools (`bootstrap_os_info`, docs, house-rule pins), `initialize`, and `tools/list` stay **200** with no `Authorization` header.

Unauthenticated or invalid-token calls to `bootstrap_whoami` or `bootstrap_list_company_labels` (and any later gated tool) return **HTTP 401**. Production / main uses this exact header:

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://pirin.ai/.well-known/oauth-protected-resource", scope="bootstrap-os"
```

The 401 JSON also includes `identityStore` (`supabase` | `memory` | `unset`). That is not a session claim.

Preview (this PR, until pirin-ai merge) may point `resource_metadata` at the #143 well-known instead. Override: `BOOTSTRAP_OAUTH_RESOURCE_METADATA` (preview only — never a prod-pin change). If that env is unset and `VERCEL_ENV=preview`, the host uses:

`https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource`

## Web Builder

Protected-resource metadata URL (production / after pirin-ai merge):

`https://pirin.ai/.well-known/oauth-protected-resource`

Protected-resource metadata URL (preview until pirin-ai #143 merges):

`https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource`

Authorize URL (authorization code + PKCE):

`https://pirin.ai/bootstrap-os/login`

Suggested RFC 9728 document:

```json
{
  "resource": "https://bootstrap-os-mcp.vercel.app/mcp",
  "authorization_servers": ["https://pirin.ai"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

Authorization-server metadata on pirin.ai must advertise `authorization_endpoint` as `/bootstrap-os/login` and support authorization code + PKCE. This repo does not host those documents.

After the code exchange, the MCP client retries gated tools with:

```http
Authorization: Bearer <access_token issued by pirin.ai>
```

Install-first clients omit `Authorization`. They still get the published OS. They receive 401 only if they call a gated tool.

## Tests (PGlite / isolated)

| | |
|--|--|
| HTTP 401 + exact `WWW-Authenticate` | `mcp/test/identity.test.mjs` |
| FORCE RLS | `mcp/test/identity-pglite.test.mjs` |
| SQL file locks | `mcp/test/identity-rls.test.mjs` (no network) |

Do not run `preview-live.mjs` on PR cloud agents.

## Out

No mentee roster. No usage analytics as proof. No founder-update write. No WebMCP. No marketplace. No billing. No login UI in this repo. Insights/Apply stay email-only.
