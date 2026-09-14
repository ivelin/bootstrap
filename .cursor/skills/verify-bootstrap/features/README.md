# Bootstrap OS verification map

This directory is the maintained source for verifying user-facing Bootstrap OS behavior **served by this repo**. Read the index before driving, then use the matching feature file as the recipe.

## MECE

- **Own:** hosted MCP handshake / `bootstrap_whoami` / labels, `invite_member` Accept + signup cards, `accept_invite` claim, login-URL token contract (`?invite=`), email-confirm **return** to that token, journey board tools (`get_journey`, subscribe/unsubscribe/list).
- **Do not own:** pirin.ai home, insights, events, install-os marketing, the rendered `/bootstrap-os/login` UI, email-confirm page chrome, or Resend send. Those belong to **`verify-pirin`** in `ivelin/pirin-ai`.
- A path that crosses hosts: map only the Bootstrap landing here and name `verify-pirin`. Do not copy pirin drive steps into these files.

## Baseline preconditions

- `cd mcp && npm ci && npm run build` has produced `mcp/dist/http.js`.
- Launch via `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs launch`.
- `doctor` reports every check `ok` (loopback helper healthy; cookie-less whoami 401; collab-Host initialize 401).
- `VERCEL_ENV` is not `production`. Identity store on the helper is `unset`.
- Never drive `https://mcp.bootstrap.pirin.ai/mcp` or live `supabase-pirin-ai` from a PR agent.
- Invite/accept mutations use `mcp/test/e2e-roleplay-matrix.test.mjs` (PGlite). Mail is outbox + `dry-run` only.

## Driving conventions

- Start from the launched helper unless the feature file says the PGlite test is the user path.
- Treat tool names, card `action` strings, and `Host: mcp.bootstrap.pirin.ai` as literal.
- Prefer JSON-RPC + HTTP status over any invented UI selector.
- Restore nothing in prod. PGlite fixtures die with the test process.
- Cleanup removes the helper pid. Keep `artifacts/<feature-id>/`.

## Proof and skip reporting

- Capture the user action and the resulting state.
- HTTP proof includes status, challenge header, and body (`reason`, `identityStore`, card fields, labels).
- Mutation proof includes a second read (`bootstrap_whoami` after `accept_invite`).
- Record `featureId` and entry point on every artifact.
- An unreachable path (needs a real pirin.ai JWT Cos already holds) is `verified-unreachable` with the attempted command — not verified via a different path.

## Feature entry contract

Each file starts with an H1 and one paragraph. Then exactly four H2s: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-bootstrap`, `Gotchas`.

## Features

- [Hosted handshake and whoami](./hosted-handshake-whoami.md) covers `/health`, well-known, cookie-less whoami 401, loopback vs collab-Host initialize.
- [Invite member](./invite-member.md) covers `invite_member` Accept + signup cards, outbox, fail-closed inviter.
- [Accept invite claim](./accept-invite-claim.md) covers Bearer `accept_invite` → whoami labels, mismatch / replay.
- [Invite signup login URL](./invite-signup-login-url.md) covers `?invite=` + verify + mail dry-run; email confirm / login chrome is `verify-pirin`.
- [Journey board](./journey-board.md) covers gated `get_journey` and board subscribe tools served by this repo.
