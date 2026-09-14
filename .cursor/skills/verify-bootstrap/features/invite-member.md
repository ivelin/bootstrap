# Invite member

An allowlisted team member invites an email onto a company workspace they already belong to. The user-visible result is an Accept card (who / to / workspace → Accept) plus a sign-in-or-create-account card and an email outbox row From `bootstrap@pirin.ai`. Uninvited callers cannot invite. Cross-company invites fail closed.

## Sub-features

- `invite-allowlisted` lets Ivelin invite Bill (or `ivelin@zk0.bot`) to `zk0`.
- `invite-accept-card` returns `card: "accept_invite"`, `shape: "DraftExternalMessage"`, `action: "Accept"`, `inviteToken` prefix `inv_`.
- `invite-signup-card` returns `card: "invite_signup"`, `action: "Sign in or create account"`, `signupUrl` with `invite=`.
- `invite-outbox` enqueues `in_chat` (token stripped) and `email` (token + signup URL, From `bootstrap@pirin.ai`).
- `invite-uninvited` cookie-less or stranger JWT → HTTP 401 (`missing_or_short_token` / `not_invited`).
- `invite-cross-company` allowlisted mentee-a cannot invite to `bravo`.
- `invite-unset-vs-rpc` `invite_store_unset` stays distinct from `invite_rpc_failed`.

## How to get to it (user POV)

- In any MCP client on the collab pin, an allowlisted member calls `invite_member` with `email` and `companyLabel`.
- The client may render the Accept card as an action (optional). The login URL on the signup card is the universal path.
- Email (after Cos yes on pirin-ai Resend) carries the same `signupUrl`. This repo only enqueues.

## Driving it with verify-bootstrap

Preconditions:

- Helper launched and `doctor` ok (proves the host is the hosted-read adapter).
- Do **not** set `VERCEL_ENV=production` on the helper. Live invite RPCs stay unset locally.
- Drive the mutation through PGlite: `mcp/test/e2e-roleplay-matrix.test.mjs` case `P1 invite_member: Ivelin invites Bill to zk0`.

- **Empty inviter.** Cookie-less `invite_member` on the helper is HTTP 401 (same as whoami). Covered by doctor `whoami-401` plus this test's empty-Bearer assertion.
- **Allowlisted invite.** Run `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs drive invite-member`. That is `cd mcp && node --test --test-name-pattern "P1 invite_member: Ivelin invites Bill to zk0" test/e2e-roleplay-matrix.test.mjs`.
- **Accept card.** Result `ok: true`, `card.card` is `accept_invite`, `from.email` is `ivelin@pirin.ai`, `to.email` is `bill@example.test`, `companyWorkspace` is `zk0`, `action` is `Accept`, `tool` is `accept_invite`, `inviteToken` matches `/^inv_/`.
- **Signup card.** `authCard.card` is `invite_signup`, `action` is `Sign in or create account`, `from.email` is `bootstrap@pirin.ai`.
- **Outbox.** `in_chat` payload `inviteToken` is `null`. `email` payload `mailFrom` is `bootstrap@pirin.ai` and `signupUrl` matches `/\/bootstrap-os\/login\?invite=inv_/`.
- **Fail closed.** Uninvited stranger → 401 `not_invited`. mentee-a inviting to `bravo` → tool error matching `/does not hold/i`.
- **Proof.** `artifacts/invite-member/proof.json` exit code `0` and `artifacts/invite-member/e2e.tap.txt` contain the P1 assertions.

## Gotchas

- The helper's identity store is `unset`. A 200 + `Invite store unset` on live `invite_member` is correct locally and is **not** the P1 pass. Use the PGlite test for the card/outbox proof.
- Do not collapse `invite_store_unset` into `invite_rpc_failed`.
- Do not enumerate to the inviter whether the email is already a Bootstrap OS user.
- From address is `bootstrap@pirin.ai` only. Never `ivelin@` / `cos@`.
- Opening `signupUrl` in a browser is `verify-pirin`. This file stops at the card and outbox fields.
- One pending invite per `(email, workspace)`. Re-invite rotates the token. A second workspace for the same email is `accept-invite-claim` / P4.
