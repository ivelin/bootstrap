# Invite signup login URL

The universal invitee path is email + `https://pirin.ai/bootstrap-os/login?invite=<token>`. This repo builds that URL, verifies the token (opaque fail), and enqueues mail From `bootstrap@pirin.ai`. After the invitee has a JWT as that email, `accept_invite` uses the **same** token. Email confirm and the login page itself are not served here.

## Sub-features

- `signup-url` `inviteSignupUrl` is `https://pirin.ai/bootstrap-os/login?invite=<token>` (`invite` query only).
- `mail-dry-run` outbox + sink: From `bootstrap@pirin.ai`, body includes who / to / workspace / signup URL. No Resend.
- `verify-ok` pending unexpired unused token → `{ ok: true, invitee_email, company_label, inviter_email }`.
- `verify-opaque` missing / expired / used / short → `{ ok: false }` with no `reason`.
- `whoami-before` invitee JWT before accept → 401 `not_invited`.
- `accept-after-url` same token + matching JWT → whoami label.
- `email-confirm-return` Bootstrap landing after confirm is still `?invite=<same token>` then `accept_invite` (pirin chrome is `verify-pirin`).

## How to get to it (user POV)

- Receive the Auth card (`Sign in or create account`) or the email with `Signup URL`.
- Open `https://pirin.ai/bootstrap-os/login?invite=inv_…`. If the account is new, complete signup + email confirm **on pirin.ai**, which must redirect back to that login/invite landing with the token still present.
- If the account already exists, sign in as **that** email (do not register a second account).
- Once a JWT exists, the MCP client calls `accept_invite` with the same token.

## Driving it with verify-bootstrap

Preconditions:

- Helper launched and `doctor` ok.
- `BOOTSTRAP_INVITE_MAIL` in the PGlite test is `dry-run`. Never `send` from this repo.
- Do not open pirin.ai in this drive. Name `verify-pirin` if you must prove the confirm page.

- **Mail + URL + verify + accept.** Run `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs drive invite-signup-login-url`. That is `cd mcp && node --test --test-name-pattern "P3 Invitee login-URL" test/e2e-roleplay-matrix.test.mjs`.
- **Signup URL.** Dry-run mail `signupUrl` contains `invite=<token>` and host `pirin.ai` path `/bootstrap-os/login`. QR payload equals the signup URL.
- **Verify.** `bootstrap_mcp_verify_invite` (store `verifyInvite`) returns the invitee email + `zk0` + inviter. Bad token and expired token return `{ ok: false }` with no `reason` key.
- **Before accept.** Outsider JWT `bootstrap_whoami` is HTTP 401 `not_invited`.
- **After accept.** `accept_invite` `ok: true`, whoami `authenticated: true` with `["zk0"]`. Verify of the used token is `{ ok: false }`.
- **Email confirm redirect (this side only).** Assert the token in `signupUrl` is the one accept consumes. Do not script pirin.ai `/confirm` or marketing routes. If confirm drops `invite=`, the Bootstrap landing is broken — report it and let `verify-pirin` drive the pirin redirect.
- **Proof.** `artifacts/invite-signup-login-url/proof.json` exit `0` and TAP including `Signup URL` / `invite=` / whoami `zk0`.

## Gotchas

- Query `email=` / `company=` on the login URL are not allowlist. Verify RPC is the source of invitee email and workspace.
- `in_chat` outbox never stores the raw token. Email outbox does, for the pirin-ai poller only.
- `BOOTSTRAP_INVITE_MAIL=off` is the MCP default. Dry-run is test-only. There is no prod send from this host.
- After confirm, pirin.ai must **sign in** an existing user with that email, not fail "email already registered." That assertion lives in `verify-pirin`.
- PR agents do not migrate, seed, or live-probe `supabase-pirin-ai`. P3 on PGlite is the proof.
- Do not send a real person an invite until Cos yeses. CI green ≠ Ready-for-human-eyes.
