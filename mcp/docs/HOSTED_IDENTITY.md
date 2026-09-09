# Hosted MCP identity (resource server)

This host is the **resource server only**. Path 1 public OS tools stay **unauthenticated** on the vercel.app alias. The collab host 401s the handshake so Grok Bot starts OAuth. Gated tools accept **access tokens issued by pirin.ai login**.

Path 1 (point an AI at GitHub) stays enough. Path 3 local stdio stays the write path.

## Founder lock

| | |
|--|--|
| Login / OAuth | **pirin.ai only.** Web Builder owns `/bootstrap-os/login` (authorize URL, authorization code + PKCE) and RFC 8414. This MCP origin serves RFC 9728; `authorization_servers` stay on pirin.ai. |
| This repo | MCP resource server. Do **not** add a login UI. No second authorization server. |
| Product | MCP client follows 401 → this origin's protected-resource metadata → pirin.ai authorize + PKCE. The client attaches the issued access token. This host never issues connector secrets. |
| Prod database | Cloud agents on PRs do **not** migrate, seed, or live-probe the live pirin.ai project. Local / CI use **PGlite**. |
| Env pin | Live on Vercel project `bootstrap-os-mcp` (production + preview + development): `BOOTSTRAP_SUPABASE_URL` + `BOOTSTRAP_SUPABASE_ANON_KEY`. Do **not** print those values. Collab / Grok pin is `https://mcp.bootstrap.pirin.ai/mcp` on `main`. Path 1 public pin is `https://bootstrap-os-mcp.vercel.app/mcp`. Do not merge. |
| Public preview | Vercel Authentication is **off** on this project so founders can add the PR git preview with no Vercel login. Unmodified URL **and** protected-resource identifier: `https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp`. Derived from the request host when `VERCEL_ENV=preview`. Never the production pin on preview. |

## HTTP contract

Two production URLs (Neil / Cos lock — Grok Bot OAuth vs Path 1):

| Pin | URL | Cookie-less `initialize` / GET SSE / `tools/list` |
|-----|-----|---------------------------------------------------|
| Collab / Grok / whoami | `https://mcp.bootstrap.pirin.ai/mcp` | **HTTP 401** + `WWW-Authenticate` (same as gated whoami). Public OS tools stay listed **after** auth. |
| Path 1 / first-hour / apply OS with no account | `https://bootstrap-os-mcp.vercel.app/mcp` | **HTTP 200**. Public OS tools stay open. Gated whoami/labels still 401. |

On this **Hold preview** (`VERCEL_ENV=preview`, not a prod hostname), cookie-less `initialize`, GET SSE `/mcp`, and `tools/list` return **HTTP 401** with the same `WWW-Authenticate` as gated whoami. Public OS tools still work **with a Bearer**. RFC 8414 / RFC 9728 well-known GETs stay 200.

Unauthenticated or invalid-token calls to `bootstrap_whoami` or `bootstrap_list_company_labels` (and any later gated tool) return **HTTP 401**. Production / main uses this exact header (`resource_metadata` is **this MCP origin** well-known — not live pirin.ai, whose RFC 9728 `resource` is still the vercel.app alias until pirin-ai updates):

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://mcp.bootstrap.pirin.ai/.well-known/oauth-protected-resource", resource="https://mcp.bootstrap.pirin.ai/mcp", scope="bootstrap-os"
```

The 401 JSON also includes `identityStore` (`supabase` | `memory` | `unset`). That is not a session claim.

Preview (this Hold — Cos lock) challenge — `resource` is this preview MCP URL, `resource_metadata` is **this preview origin** well-known (not live pirin.ai, not the dead #143 git preview):

```http
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource", resource="https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp", scope="bootstrap-os"
```

Do **not** point production or Hold-preview `resource_metadata` at `https://pirin.ai/.well-known/oauth-protected-resource` — that JSON `resource` is still `https://bootstrap-os-mcp.vercel.app/mcp`. `BOOTSTRAP_OAUTH_RESOURCE_METADATA` cannot override onto that live document.

This host also serves RFC 9728 at `/.well-known/oauth-protected-resource` (and the `/mcp` suffix). On this Hold preview, `"resource"` is the preview MCP URL and `"authorization_servers"` is live `https://pirin.ai/bootstrap-os/login`. The Path 1 alias must **not** 401 `initialize` or `tools/list`.

## Web Builder

pirin-ai #143 is merged to main. The live authorization server is pirin.ai. Advertise the apex URLs (the live AS document uses these). Apex `https://pirin.ai/...` 307s to `www.pirin.ai` — that is pirin furniture, not this repo. Do not send Cos at the dead #143 git preview.

Protected-resource metadata URL (production — this MCP origin):

`https://mcp.bootstrap.pirin.ai/.well-known/oauth-protected-resource`

pirin.ai still publishes its own RFC 9728 at `https://pirin.ai/.well-known/oauth-protected-resource`. Do not send that URL as `resource_metadata` until that document's `resource` matches `https://mcp.bootstrap.pirin.ai/mcp`.

Protected-resource metadata URL (Hold preview — this MCP origin, Cos lock):

`https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource`

Authorize URL (authorization code + PKCE) — production **and** this Hold preview:

`https://pirin.ai/bootstrap-os/login`

Suggested RFC 9728 document (production — live):

```json
{
  "resource": "https://mcp.bootstrap.pirin.ai/mcp",
  "authorization_servers": ["https://pirin.ai/bootstrap-os/login"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

Suggested RFC 9728 document this MCP origin serves on the Hold preview (`VERCEL_ENV=preview`). `resource` is this preview MCP URL. `authorization_servers` is live pirin.ai login — not the prod pin, not #143:

```json
{
  "resource": "https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp",
  "authorization_servers": ["https://pirin.ai/bootstrap-os/login"],
  "scopes_supported": ["bootstrap-os"],
  "bearer_methods_supported": ["header"]
}
```

`WWW-Authenticate` `resource_metadata` points at this MCP origin well-known (production pin origin on main; this preview origin on Hold). Clients then read `authorization_servers` and land on live `https://pirin.ai/bootstrap-os/login`. This repo does not host a login UI.

Grok Bot / RFC 8414 clients that look for `/.well-known/oauth-authorization-server` (and the `/mcp` suffix) on **this MCP origin** get HTTP 200. Preview and production copy the live pirin.ai AS document. All endpoints stay on pirin.ai — this repo does **not** serve `/oauth/token`, `/oauth/register`, or a login UI.

Hold-preview RFC 8414 document (`VERCEL_ENV=preview`) — live pirin.ai:

```json
{
  "issuer": "https://pirin.ai/bootstrap-os/login",
  "authorization_endpoint": "https://pirin.ai/bootstrap-os/login",
  "token_endpoint": "https://pirin.ai/oauth/token",
  "registration_endpoint": "https://pirin.ai/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["bootstrap-os", "openid", "profile", "email"],
  "service_documentation": "https://pirin.ai/bootstrap-os/login"
}
```

After the code exchange, the MCP client retries gated tools with:

```http
Authorization: Bearer <access_token issued by pirin.ai>
```

Path 1 / alias clients omit `Authorization`. They still get the published OS. They receive 401 only if they call a gated tool. Collab-host clients get 401 on the first handshake and follow `WWW-Authenticate`.

## Tests (PGlite / isolated)

| | |
|--|--|
| HTTP 401 + exact `WWW-Authenticate` | `mcp/test/identity.test.mjs` |
| FORCE RLS | `mcp/test/identity-pglite.test.mjs` |
| SQL file locks | `mcp/test/identity-rls.test.mjs` (no network) |

Do not run `preview-live.mjs` on PR cloud agents.

## Out

No mentee roster. No usage analytics as proof. No founder-update write. No WebMCP. No marketplace. No billing. No login UI in this repo. Insights/Apply stay email-only.
