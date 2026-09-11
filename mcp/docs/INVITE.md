# Hosted MCP invite + accept (Grok-first)

Say it **once** here. Other files link. First-user SQL stays in [`HOSTED_IDENTITY.md`](HOSTED_IDENTITY.md#first-user-rebuild-from-github). HTTP challenge strings stay there too.

Fail-closed allowlist is already on. Invites **create/unlock mentee rows**. A valid pirin.ai JWT is not enough. Happy path stays **in-bot**. Website login/signup is the **support path** when the invitee has no JWT yet.

## Tools

| Tool | Who | Does |
|------|-----|------|
| `invite_member` | Allowlisted founder / authorized mentee | Email + company workspace **label** the inviter already holds. Returns an Accept card + signup Auth card. Enqueues `in_chat` + `email` outbox. |
| `accept_invite` | Invitee with a pirin.ai JWT | One-time token → mentee allowlist + that label. JWT email must match. |

`accept_invite` is the only gated tool that does **not** require an allowlist row (the invitee is `not_invited` until they accept). It still needs a usable JWT. Empty / wrong / expired Bearer stays HTTP 401.

`invite_store_unset` means this host has no Supabase URL / anon key / access token. A failed invite RPC (schema cache, grants, SQL) is `invite_rpc_failed` — HTTP status + body. Do not collapse those.

## Accept card (in-chat)

Shaped like **DraftExternalMessage**. Grok shows **who invited / to whom / company workspace → Accept**. Not `/bootstrap-os/login` as the product path.

```json
{
  "card": "accept_invite",
  "shape": "DraftExternalMessage",
  "from": { "email": "ivelin@pirin.ai" },
  "to": { "email": "bill@example.test" },
  "companyWorkspace": "zk0",
  "action": "Accept",
  "inviteToken": "inv_…",
  "tool": "accept_invite"
}
```

The raw token is shown **once** on the Accept card (and on the signup Auth card / email mailer handoff). The `in_chat` outbox stores the same shape **without** the token.

## Token

Single-use. Expires in 7 days. Hash only in `bootstrap_mcp_invites`. Fail closed on wrong email, expired, replay, or unknown token. Inviter cannot grant a label they do not hold (cross-company).

## How Bill uses it (dogfood A/B)

1. First user is already on the allowlist via SQL — [rebuild](HOSTED_IDENTITY.md#first-user-rebuild-from-github). Ivelin is that row (`pirin` / `zk0` / `totbox`).
2. Ivelin in Grok (collab pin): `invite_member` `email=bill@…` `companyLabel=zk0`.
3. **Invitee Grok:** card appears in-chat. Bill clicks **Accept**. Grok calls `accept_invite` with the token. Bill’s JWT email must match.
4. **Invitee non-Grok:** mail / Auth card → Web Builder `https://pirin.ai/bootstrap-os/login?invite=<token>` → create account for that email → JWT → `accept_invite` with the **same** token.
5. Bill’s `bootstrap_whoami` is `authenticated: true` with `zk0` only. Labels only — not boards.
6. zk0 dogfood uses the same outsider path (`ivelin@zk0.bot` / `zk0`). No Cos SQL shortcut for later mentees.

## Signup URL (Web Builder)

Documented here. pirin-ai owns the login UI. This repo does **not** implement it.

```
https://pirin.ai/bootstrap-os/login?invite=<token>
```

| Query | Required | Meaning |
|-------|----------|---------|
| `invite` | yes | Same `inv_…` token as `accept_invite` / `bootstrap_mcp_verify_invite`. |

Optional display hints the mailer may also send (not required for redeem): invitee email and company label come from **verify**, not from extra query params. Do not trust query `email=` / `company=` for allowlist.

After the invitee has a JWT as that email, the MCP client calls `accept_invite` with the same token. whoami then shows the company workspace label.

## Verify RPC (Web Builder — fail-closed)

`bootstrap_mcp_verify_invite(p_token text)` — SECURITY DEFINER, `search_path = public`. Hash lookup only.

| Pending + unexpired + unused | `{ "ok": true, "invitee_email", "company_label", "inviter_email" }` |
| Else (missing / expired / used / short) | `{ "ok": false }` — **opaque**. No reason. Do not enumerate. |

**Who calls it:** pirin-ai server (service_role) or MCP edge. **Never** the browser with open RLS. No anon SELECT on invite tables. `GRANT EXECUTE` is `service_role` only — not `anon`, not `authenticated`.

Signup page: receive `?invite=` → server verify → create-account **for `invitee_email` only** → issue JWT → `accept_invite`.

## Outbox + who sends mail

| Channel | Stores raw token? | Who reads |
|---------|-------------------|-----------|
| `in_chat` | **No** (`inviteToken: null`) | In-bot Accept card already has it |
| `email` | **Yes** — mailer handoff so pirin-ai can send `?invite=` | service_role poller only (FORCE RLS, no SELECT policies) |

**Recipe (say once):** table stores `token_hash` only. Raw `inv_` is revealed (1) on the Accept / Auth cards returned by `invite_member`, and (2) on the `email` outbox row for the pirin-ai poller. `in_chat` never stores it.

Email payload is enough for bootstrap@ mail: who invited, invitee email, company workspace, `signupUrl` + `qrPayload` (`https://pirin.ai/bootstrap-os/login?invite=<token>`).

**From address (hard):** `bootstrap@pirin.ai` only. Never `ivelin@` / `cos@`.

**Who sends:** this repo **enqueues**. pirin-ai **owns Resend**. MCP default is mail **off** (`BOOTSTRAP_INVITE_MAIL=off`). `dry-run` builds the body for tests. There is **no prod send** from this host. Cos yeses before pirin-ai enables the poller.

### Poll contract (pirin-ai, service_role)

```sql
SELECT id, invite_id, payload, created_at
FROM public.bootstrap_mcp_invite_outbox
WHERE channel = 'email' AND delivered_at IS NULL
ORDER BY created_at
LIMIT 50;
```

Send From `bootstrap@pirin.ai` using `payload.signupUrl` / who / to / workspace. Then:

```sql
UPDATE public.bootstrap_mcp_invite_outbox
SET delivered_at = now()
WHERE id = $1 AND channel = 'email' AND delivered_at IS NULL;
```

Do not SELECT as `anon` / `authenticated`. Do not call Resend from ivelin/bootstrap CI.

## Rebuild from GitHub (Cos — never a PR agent)

1. Identity + fail-closed + invite migrations, in order: `20260829_bootstrap_mcp_identity.sql`, `20260909_bootstrap_mcp_fail_closed_invite.sql`, `20260910_bootstrap_mcp_invite_accept.sql`, then the label-qualify fix `20260910_bootstrap_mcp_invite_qualify_label.sql`, then the pgcrypto search_path fix `20260911_bootstrap_mcp_invite_pgcrypto_search_path.sql`, then the verify + email outbox `20260911_bootstrap_mcp_invite_verify_email_outbox.sql` (CREATE OR REPLACE `bootstrap_mcp_invite_member` — shipped accept / qualify / pgcrypto files are not edited).
2. First user = SQL insert (link above). Do **not** apply `mcp/test/pglite/identity-schema.sql` to prod.
3. Later mentees use `invite_member` / `accept_invite`. Do not invent journey stage or Advance.

PR CI is **PGlite only**. Do not migrate, seed, or live-probe `supabase-pirin-ai`.

## Deferred

| | |
|--|--|
| Prod Resend | pirin-ai poller. **Cos yes before enable.** This PR does not blast mail. |
| QR render / SMS | Payload includes `qrPayload` (the signup URL). Image / SMS later. |
| Login UI | Never in this repo. pirin.ai `/bootstrap-os/login` is OAuth + create-account furniture. |

## Tests

PGlite role-play: [`E2E_ROLEPLAY.md`](E2E_ROLEPLAY.md) · `mcp/test/e2e-roleplay-matrix.test.mjs` · `mcp/test/invite.test.mjs` · `mcp/test/invite-mail.test.mjs` · `mcp/test/identity-pglite.test.mjs` (`SELECT bootstrap_mcp_invite_member` / `bootstrap_mcp_verify_invite` — no 42702 / no 42883 / opaque verify).
