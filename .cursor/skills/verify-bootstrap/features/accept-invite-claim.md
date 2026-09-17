# Accept invite claim

The invitee, already holding a pirin.ai JWT as the invited email, calls `accept_invite` with the one-time `inv_` token. Success creates or reuses the Bootstrap OS user and adds that workspace membership. `bootstrap_whoami` then shows the new label. Wrong email, expired token, unknown token, and replay fail closed without leaking other teams.

## Sub-features

- `accept-bearer` matching JWT + fresh token → `ok: true`, `labels` includes the workspace.
- `accept-whoami` second read: `bootstrap_whoami` `authenticated: true` with the same labels.
- `accept-empty` no Bearer → HTTP 401 `missing_or_short_token`.
- `accept-mismatch` stranger JWT → tool error `Invite rejected` (no label leak).
- `accept-bad-token` unknown `inv_` → `Invite rejected`.
- `accept-expired` expired row → `Invite rejected`.
- `accept-replay` second accept of the same token → `Invite rejected`.
- `accept-second-workspace` existing user (already authenticated, not `not_invited`) gains another label; still one user.

## How to get to it (user POV)

- MCP client already has OAuth: call `accept_invite` with `{ "token": "inv_…" }` from the Accept card.
- After login URL / email confirm on pirin.ai (`verify-pirin`), the same client retries `accept_invite` with the **same** token and the new Bearer.
- Signed-in Accept **landing in this repo** is the tool result (`ok`, `email`, `labels`, `companyWorkspace`), not an HTML page.

## Driving it with verify-bootstrap

Preconditions:

- Helper launched and `doctor` ok.
- Do not mint or paste a real `bos_` / prod JWT.
- Drive P2 (and P4 when proving second workspace) on PGlite.

- **Empty accept.** Cookie-less `accept_invite` on the helper is HTTP 401. `accept_invite` is pre-allowlist: a valid JWT that is still `not_invited` may proceed; missing/short token must not.
- **Claim.** Run `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs drive accept-invite-claim`. That is `cd mcp && node --test --test-name-pattern "P2 accept_invite: Bill lands on alpha" test/e2e-roleplay-matrix.test.mjs`.
- **Success.** `ok: true`, `email` is `bill@example.test`, `labels` is `["alpha"]`.
- **Whoami.** Same Bill Bearer: `authenticated: true`, `email` Bill, `labels` `["alpha"]`, no `bravo` / `charlie`.
- **Rejects.** Mismatch, bad token, expired, and replay each return a tool error matching `/Invite rejected/` and do not print other companies' labels.
- **Second workspace (optional same run).** `P4 existing user second workspace` in the same file: mentee-a (`alpha`) accepts `charlie` → whoami `["alpha", "charlie"]`; re-invite → `already on this company workspace`; mentee-b stays `["bravo"]`.
- **Proof.** `artifacts/accept-invite-claim/proof.json` exit `0` and TAP showing Bill's whoami labels.

## Gotchas

- `accept_invite` is the only gated identity tool that does **not** require an allowlist row. Do not treat `not_invited` + valid JWT as a 401 for this tool.
- JWT email must match the invite. Case is lowercased on the invitee email.
- Replay and used tokens are opaque rejects. Do not assert a distinct user-facing reason that enumerates state.
- Existing users gain a membership — not a second account. P4 is that path.
- A browser "Accept" button on pirin.ai is `verify-pirin`. This file proves the MCP claim.
- Local helper without a store cannot complete a real accept. PGlite is the user-path harness, not a skip.
