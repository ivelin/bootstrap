# Hosted MCP invite + accept (Grok-first)

Say it **once** here. Other files link. First-user SQL stays in [`HOSTED_IDENTITY.md`](HOSTED_IDENTITY.md#first-user-rebuild-from-github). HTTP challenge strings stay there too.

Fail-closed allowlist is already on. Invites **create/unlock mentee rows**. A valid pirin.ai JWT is not enough. Happy path stays **in-bot**.

## Tools

| Tool | Who | Does |
|------|-----|------|
| `invite_member` | Allowlisted founder / authorized mentee | Email + company workspace **label** the inviter already holds. Returns an Accept card. |
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

The raw token is shown **once** on the card. The in_chat outbox stores the same shape **without** the token. No Resend in this repo.

## Token

Single-use. Expires in 7 days. Hash only in the table. Fail closed on wrong email, expired, replay, or unknown token. Inviter cannot grant a label they do not hold (cross-company).

## How Bill uses it (dogfood A/B)

1. First user is already on the allowlist via SQL — [rebuild](HOSTED_IDENTITY.md#first-user-rebuild-from-github). Ivelin is that row (`pirin` / `zk0` / `totbox`).
2. Ivelin in Grok (collab pin): `invite_member` `email=bill@…` `companyLabel=zk0`.
3. Card appears in-chat. Bill clicks **Accept** (same thread or the card forwarded). Grok calls `accept_invite` with the token. Bill’s JWT email must match.
4. Bill’s `bootstrap_whoami` is `authenticated: true` with `zk0` only. Labels only — not boards.
5. Outsider mail (`bootstrap@`) / Web Builder / QR / SMS are **later**. This PR may enqueue an `in_chat` outbox row. It does not send mail.

## Rebuild from GitHub (Cos — never a PR agent)

1. Identity + fail-closed + invite migrations, in order: `20260829_bootstrap_mcp_identity.sql`, `20260909_bootstrap_mcp_fail_closed_invite.sql`, `20260910_bootstrap_mcp_invite_accept.sql`.
2. First user = SQL insert (link above). Do **not** apply `mcp/test/pglite/identity-schema.sql` to prod.
3. Later mentees use `invite_member` / `accept_invite`. Do not invent journey stage or Advance.

PR CI is **PGlite only**. Do not migrate, seed, or live-probe `supabase-pirin-ai`.

## Deferred

| | |
|--|--|
| Mail | Outsider `bootstrap@` / Resend. Web Builder later. |
| QR / SMS | Later. |
| Login UI | Never in this repo. pirin.ai `/bootstrap-os/login` is OAuth furniture, not the Accept path. |

## Tests

PGlite role-play: [`E2E_ROLEPLAY.md`](E2E_ROLEPLAY.md) · `mcp/test/e2e-roleplay-matrix.test.mjs` · `mcp/test/invite.test.mjs` (unset store vs RPC status/body).
