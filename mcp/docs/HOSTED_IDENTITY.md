# Hosted MCP identity (resource server)

This host is the **resource server only**. Public OS tools stay **unauthenticated**. Gated tools require a **pirin.ai access token**.

Path 1 (point an AI at GitHub) stays enough. Path 3 local stdio stays the write path. This host does not replace either.

## Founder lock — login lives on pirin.ai only

Login and OAuth consolidate on **pirin.ai**. Do **not** add a login UI, OAuth callback, mint page, or a second authorization server in `ivelin/bootstrap`.

| Owner | Surface |
|-------|---------|
| **This repo** | MCP resource server, SQL + RLS, `bootstrap-os-mcp` env pin + preview redeploy |
| **Web Builder / pirin-ai** | `/bootstrap-os/login` + OAuth + **protected-resource metadata** |

Mentees sign in on pirin.ai. The connector sends `Authorization: Bearer <pirin.ai access token>`. There is no copy-paste `bos_` mint as the mentee product.

## What ships in this repo

| Piece | Where |
|-------|--------|
| 401 + `WWW-Authenticate` | [`../src/hosted-handler.ts`](../src/hosted-handler.ts), [`../src/oauth.ts`](../src/oauth.ts) |
| JWT validation + labels | [`../src/identity.ts`](../src/identity.ts) via `/auth/v1/user` + `bootstrap_mcp_my_labels()` |
| SQL + RLS + Ivelin seed labels | [`../supabase/migrations/20260829_bootstrap_mcp_identity.sql`](../supabase/migrations/20260829_bootstrap_mcp_identity.sql) |
| Gated tools | `bootstrap_whoami`, `bootstrap_list_company_labels` on the hosted-read surface |
| Public pin | `https://bootstrap-os-mcp.vercel.app/mcp` — still works with no header |

## HTTP contract (gated tools)

Public tools (`bootstrap_os_info`, docs, house-rule pins), `initialize`, and `tools/list` stay **200** with no `Authorization` header.

Unauthenticated or invalid-token calls to a gated tool return **HTTP 401**:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="bootstrap-os-mcp", resource_metadata="https://pirin.ai/.well-known/oauth-protected-resource", error="invalid_token"
Access-Control-Expose-Headers: WWW-Authenticate
```

Do not invent a second OAuth server on `*.vercel.app`. The `resource_metadata` URL is on **pirin.ai**.

### Web Builder must publish (RFC 9728)

`GET https://pirin.ai/.well-known/oauth-protected-resource`

```json
{
  "resource": "https://bootstrap-os-mcp.vercel.app/mcp",
  "authorization_servers": ["https://pirin.ai"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://github.com/ivelin/bootstrap/blob/main/mcp/docs/HOSTED_IDENTITY.md"
}
```

Authorization-server metadata (RFC 8414 / OIDC) also lives on pirin.ai. Login UI: `/bootstrap-os/login`. This repo does not host those documents.

## Existing project (no new Neon)

| | |
|--|--|
| Supabase project | `supabase-pirin-ai` |
| Ref | `vsqekesftzstsjvcowgm` |
| URL | `https://vsqekesftzstsjvcowgm.supabase.co` |

This host validates the **pirin.ai-issued access token** (Supabase JWT) with the anon/publishable key only:

1. `GET {SUPABASE_URL}/auth/v1/user` with `Authorization: Bearer <access_token>`
2. `POST {SUPABASE_URL}/rest/v1/rpc/bootstrap_mcp_my_labels` with the same JWT (RLS / `auth.uid()`)

## Env (Vercel project `bootstrap-os-mcp`)

Public OS tools need none of these. Token validation needs both:

```text
BOOTSTRAP_SUPABASE_URL=https://vsqekesftzstsjvcowgm.supabase.co
BOOTSTRAP_SUPABASE_ANON_KEY=<legacy anon or sb_publishable_… from v0-pirin-ai-founder-studio>
```

Aliases accepted: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Do not put the service role on this host. Never print the anon key.

If the env is unset, public tools still work. Gated tools still return **401** + `WWW-Authenticate`.

## Connector (after pirin.ai login)

The client obtains an access token from pirin.ai OAuth / `/bootstrap-os/login`, then:

```json
{
  "mcpServers": {
    "bootstrap-os": {
      "url": "https://bootstrap-os-mcp.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer <pirin.ai access_token>"
      }
    }
  }
}
```

Anonymous install-first clients omit `headers`. They still get the published OS. They receive 401 only if they call a gated tool.

## Seed / RLS

`ivelin@pirin.ai` is pre-labeled `pirin`, `zk0`, `totbox`. After that email signs in on pirin.ai, `bootstrap_mcp_my_labels()` attaches `auth.users.id` by email and returns labels.

Authenticated PostgREST can `SELECT` only the caller’s mentee row and labels (`auth.uid() = auth_user_id`). Anon cannot read tables. One mentee cannot read another.

## Demoted — not the mentee path

`bootstrap_mcp_mint_token()` (hashed `bos_` string) is **not** the product. Do not tell mentees to mint a string and paste it into the connector. Leave the SQL in place if maintainers still need it; do not document it as login.

## Out

No mentee roster. No usage analytics as proof. No founder-update write. No WebMCP. No marketplace. No billing. No login UI in this repo. Insights/Apply stay email-only.
