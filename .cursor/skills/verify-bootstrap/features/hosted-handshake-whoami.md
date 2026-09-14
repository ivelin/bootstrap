# Hosted handshake and whoami

A mentee or MCP client hits this repo's hosted-read adapter. Public OS tools are not a silent open door on the collab Host: cookie-less handshake and gated identity tools return HTTP 401 with a `WWW-Authenticate` that points at this MCP origin, then pirin.ai login. Loopback `npm run start:http` stays open for `initialize` so local agents can list tools without pretending to be the pin.

## Sub-features

- `health-ok` answers `GET /health` with `ok`.
- `well-known` serves RFC 9728 with `authorization_servers` = `https://pirin.ai/bootstrap-os/login`.
- `whoami-empty` returns HTTP 401 `missing_or_short_token` for cookie-less `bootstrap_whoami`.
- `whoami-labels-absent` never includes `labels` on that 401 body.
- `handshake-loopback` allows cookie-less `initialize` on `127.0.0.1`.
- `handshake-collab` 401s cookie-less `initialize` and GET SSE when `Host` is `mcp.bootstrap.pirin.ai`.

## How to get to it (user POV)

- Open or add the invite-only pin `https://mcp.bootstrap.pirin.ai/mcp` in an MCP client (handshake 401).
- Hit a git-branch preview `*.vercel.app/mcp` (same 401; not a pin). `verify-pirin` does not own this host.
- Run the local helper and POST `/mcp` as any agentic client would.
- Call `bootstrap_whoami` or `bootstrap_list_company_labels` with no `Authorization` header.

## Driving it with verify-bootstrap

Preconditions:

- `verify-bootstrap.mjs launch` has a healthy helper.
- `verify-bootstrap.mjs doctor` reports every check `ok`.
- `VERCEL_ENV` is unset. Identity store is `unset`.

- **Health.** `GET /health`. Run `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs doctor` (or the drive below). Status `200`, body `ok`.
- **Well-known.** `GET /.well-known/oauth-protected-resource`. JSON includes `authorization_servers: ["https://pirin.ai/bootstrap-os/login"]`. Do not drive the pirin.ai login page here (`verify-pirin`).
- **Whoami empty.** POST `/mcp` `tools/call` `bootstrap_whoami` with no Bearer. HTTP `401`, `error: invalid_token`, `reason: missing_or_short_token`, `identityStore: unset`, `WWW-Authenticate` equals `Bearer realm="bootstrap-os-mcp", resource_metadata="https://mcp.bootstrap.pirin.ai/.well-known/oauth-protected-resource", resource="https://mcp.bootstrap.pirin.ai/mcp", scope="bootstrap-os"`. Body has no `labels`.
- **Loopback initialize.** POST `/mcp` `initialize` without a collab `Host`. HTTP `200`, `result.serverInfo.name` is `bootstrap-os`.
- **Collab handshake.** Repeat `initialize` with header `Host: mcp.bootstrap.pirin.ai`. HTTP `401` and the same challenge.
- **GET SSE.** `GET /mcp` with `Accept: text/event-stream` and `Host: mcp.bootstrap.pirin.ai`. HTTP `401`.
- **Proof.** Run `node .cursor/skills/verify-bootstrap/scripts/verify-bootstrap.mjs drive hosted-handshake-whoami`. Artifacts under `artifacts/hosted-handshake-whoami/` include `proof.json`, `whoami-401.json`, `initialize-collab-401.json`, `health.txt`.

## Gotchas

- Loopback `initialize` **200** is expected. Treating it as a handshake failure invalidates the doctor.
- `resource_metadata` on the challenge is **this MCP origin**, not `https://pirin.ai/.well-known/oauth-protected-resource`.
- Local whoami `identityStore` is `unset`. That is not `invite_store_unset` and not a prod attach.
- Do not call invited whoami on the live pin from a PR agent. Cos-only probe is `mcp/test/preview-live.mjs` (handshake/`/health` only) and is not this skill's default drive.
- pirin.ai `/bootstrap-os/login` after the challenge is `verify-pirin`.
