# Hosted MCP identity (optional)

Public OS tools stay **unauthenticated**. Login is only for gated `bootstrap_whoami` and `bootstrap_list_company_labels`. Labels only — not boards, not `company-state`, not `~/.bootstrap-os`.

Path 1 (point an AI at GitHub) stays enough. Path 3 local stdio stays the write path. This host does not replace either.

## Founder lock — login lives on pirin.ai only

Login and OAuth consolidate on **pirin.ai**. Do **not** add a login UI, OAuth callback, or mint page in `ivelin/bootstrap`.

| Owner | Surface |
|-------|---------|
| **This repo** | MCP adapter, SQL + RLS, `bootstrap-os-mcp` env pin + preview redeploy |
| **Web Builder / pirin-ai** | `/bootstrap-os/login` on pirin.ai — existing auth, then mint RPC |

Mentees sign in on pirin.ai. The hosted pin only accepts `Authorization: Bearer bos_…`. There is no second password store and no login route on `*.vercel.app` for this adapter.

## What ships in this repo

| Piece | Where |
|-------|--------|
| SQL + RLS + Ivelin seed labels | [`../supabase/migrations/20260829_bootstrap_mcp_identity.sql`](../supabase/migrations/20260829_bootstrap_mcp_identity.sql) |
| Token hash + whoami lookup | [`../src/identity.ts`](../src/identity.ts) |
| Gated tools | `bootstrap_whoami`, `bootstrap_list_company_labels` on the hosted-read surface |
| Public pin | `https://bootstrap-os-mcp.vercel.app/mcp` — still works with no header |

Login UI is **not** in this repo. Web Builder owns `/bootstrap-os/login` on pirin.ai (same Supabase project). Do not invent a second password store.

## Existing project (no new Neon)

| | |
|--|--|
| Supabase project | `supabase-pirin-ai` |
| Ref | `vsqekesftzstsjvcowgm` |
| URL | `https://vsqekesftzstsjvcowgm.supabase.co` |

## Env (Vercel project `bootstrap-os-mcp`)

Public OS tools need none of these. Gated whoami needs both:

```text
BOOTSTRAP_SUPABASE_URL=https://vsqekesftzstsjvcowgm.supabase.co
BOOTSTRAP_SUPABASE_ANON_KEY=<legacy anon or sb_publishable_… from that project>
```

Aliases accepted: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Do not put the service role on this host. `bootstrap_mcp_whoami(p_token)` is `SECURITY DEFINER` and is the only lookup the pin needs.

If the env is unset, public tools still work. Gated whoami returns `authenticated: false` / `identity_store_unset`.

## API `/bootstrap-os/login` must call

Web Builder owns that route on pirin.ai. After the existing Supabase session (same project — do not mint against another DB):

```http
POST https://vsqekesftzstsjvcowgm.supabase.co/rest/v1/rpc/bootstrap_mcp_mint_token
apikey: <anon or publishable>
Authorization: Bearer <user access_token>
Content-Type: application/json
```

Empty JSON body `{}`.

Response (once):

```json
{
  "token": "bos_…",
  "email": "ivelin@pirin.ai",
  "labels": ["pirin", "totbox", "zk0"],
  "mcpUrl": "https://bootstrap-os-mcp.vercel.app/mcp",
  "note": "Show the token once. Put it on the MCP connector as Authorization: Bearer <token>."
}
```

Optional label check (same JWT, no new token):

```http
POST …/rest/v1/rpc/bootstrap_mcp_my_labels
Authorization: Bearer <user access_token>
```

### Connector snippet (after mint)

```json
{
  "mcpServers": {
    "bootstrap-os": {
      "url": "https://bootstrap-os-mcp.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer bos_…"
      }
    }
  }
}
```

Anonymous install-first clients omit `headers`. They still get the published OS.

## Seed

`ivelin@pirin.ai` is pre-labeled `pirin`, `zk0`, `totbox`. First successful `bootstrap_mcp_mint_token()` after that email signs in on pirin.ai attaches `auth.users.id` and returns the bearer.

## RLS

Authenticated PostgREST can `SELECT` only the caller’s mentee row and labels (`auth.uid() = auth_user_id`). Tokens are not granted. Anon cannot read tables. One mentee cannot read another.

## Out

No mentee roster. No usage analytics as proof. No founder-update write. No WebMCP. No marketplace. No billing. Insights/Apply stay email-only.
