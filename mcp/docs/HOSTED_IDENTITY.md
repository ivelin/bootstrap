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
| Env pin | Live on Vercel project `bootstrap-os-mcp` (production + preview + development): `BOOTSTRAP_SUPABASE_URL` + `BOOTSTRAP_SUPABASE_ANON_KEY`. Do **not** print those values. Production pin stays on `main`. Do not merge. |
| Public preview | Vercel Authentication is **off** on this project so founders can add the PR git preview with no Vercel login. Unmodified URL **and** protected-resource identifier: `https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp`. Derived from the request host when `VERCEL_ENV=preview`. Never the production pin on preview. |

## HTTP contract

Public tools (`bootstrap_os_info`, docs, house-rule pins), `initialize`, and `tools/list` stay **200** with no `Authorization` header.

Unauthenticated or invalid-token calls to `bootstrap_whoami` or `bootstrap_list_company_labels` (and any later gated tool) return **HTTP 401**. Production / main uses this exact header:

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://pirin.ai/.well-known/oauth-protected-resource", scope="bootstrap-os"
```

The 401 JSON also includes `identityStore` (`supabase` | `memory` | `unset`). That is not a session claim.

Preview (this PR, until pirin-ai merge) challenge — `resource` is this preview host, `resource_metadata` is the #143 well-known:

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource", resource="https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp", scope="bootstrap-os"
```

Override for metadata URL only: `BOOTSTRAP_OAUTH_RESOURCE_METADATA` (preview only — never a prod-pin change). If that env is unset and `VERCEL_ENV=preview`, `resource_metadata` is:

`https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource`

This host also serves RFC 9728 at `/.well-known/oauth-protected-resource` (and the `/mcp` suffix). On this Hold preview, `"resource"` is the preview MCP URL and `"authorization_servers"` is the #143 Sign in URL — not bare `https://pirin.ai` (prod AS root is 404). Merge / production uses `https://pirin.ai/bootstrap-os/login`.

## Web Builder

Protected-resource metadata URL (production / after pirin-ai merge):

`https://pirin.ai/.well-known/oauth-protected-resource`

Protected-resource metadata URL (preview until pirin-ai #143 merges):

`https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource`

Authorize URL (authorization code + PKCE) — production / merge:

`https://pirin.ai/bootstrap-os/login`

Authorize URL (this Hold preview — #143 Sign in):

`https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login`

Suggested RFC 9728 document (production / after merge):

```json
{
  "resource": "https://bootstrap-os-mcp.vercel.app/mcp",
  "authorization_servers": ["https://pirin.ai/bootstrap-os/login"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

Suggested RFC 9728 document this MCP origin serves on the Hold preview (`VERCEL_ENV=preview`). `authorization_servers` must match the 401 / #143 Sign in page, not prod `https://pirin.ai`:

```json
{
  "resource": "https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp",
  "authorization_servers": ["https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

`WWW-Authenticate` `resource_metadata` still points at the #143 preview well-known. Clients that instead discover the AS from this origin well-known must still land on that same #143 login URL. This repo does not host a login UI.

Grok Bot / RFC 8414 clients that look for `/.well-known/oauth-authorization-server` (and the `/mcp` suffix) on **this MCP origin** get HTTP 200. The body is a copy of the #143 preview login AS document. All endpoints stay on the pirin-ai #143 host — this repo does **not** serve `/oauth/token`, `/oauth/register`, or a login UI.

Hold-preview RFC 8414 document (`VERCEL_ENV=preview`):

```json
{
  "issuer": "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login",
  "authorization_endpoint": "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login",
  "token_endpoint": "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/oauth/token",
  "registration_endpoint": "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["bootstrap-os", "openid", "profile", "email"],
  "service_documentation": "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login"
}
```

Merge / production later uses `https://pirin.ai/bootstrap-os/login`, `https://pirin.ai/oauth/token`, and `https://pirin.ai/oauth/register`. Do not emit those on this preview.

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
