# FAST 0-1 journey (this branch, not production)

**Do not merge.** Production pin stays `https://bootstrap-os-mcp.vercel.app/mcp` on `main`. Login/OAuth stays Hold. No prod DB writes. No migrate/seed/live-probe of supabase-pirin-ai. Tests are **PGlite only**.

Ivelin yes 2026-09-01 (via Cos): one source of truth for a FAST mentee 0-1 journey. **Company and idea are separate abstractions**, not a flattened composite key.

## What this is

SQL + gated MCP tools + a thin “when to write” skill. Same payload for team / advisor / board / investor prep. Views (mermaid, two-minute snapshot, optional meeting doc) are generated. Do not store a novel. Comments never mutate phase or gate.

Each idea has a fluid `constraint_this_week` (short text on versioned jsonb). Not a clock. Not tickets. It is the honest biggest bottleneck — not a fun side quest. Preference / “this is interesting” cannot name it. Teaching picture, not extra law: the company only moves as fast as its weakest link. The platoon only moves as fast as the slowest soldier. Work that is not on that link is not progress. `get_journey` / “Where are we” must surface the field (and challenge a side quest dressed as the bottleneck). Writes emit an append-only audit row. Refuse “new landing page” when no one has talked to customers unless the founder writes an override. Do not rubber-stamp.

Research/traces stay local to the founder. Do not lift `~/.bootstrap-os`.

## Schema (apply later on pirin.ai; not from this PR)

See [`../supabase/migrations/20260902_bootstrap_os_journey.sql`](../supabase/migrations/20260902_bootstrap_os_journey.sql). PGlite fixture: [`../test/pglite/journey-schema.sql`](../test/pglite/journey-schema.sql).

Seed slugs exist **only** in the PGlite fixture: `dyeconverter`, `corehaul`. One default idea each. Fixture emails are synthetic `@example.test`. Real FAST emails are not in git.

Allowlist in SQL, fail closed. Token `email` (fallback `sub`) → ACL. No FAST claim on the JWT.

Append-only `audit_events` hang off company + optional idea (ACL is company-level). Who, when, which client, what changed. Inserts only — no update/delete policies. `put_journey`, `post_comment`, and ACL changes emit a row. Advisors may read audit for companies they can `get_journey`. They cannot write audit except via those tools.

`board_subscribers` hang off the company (optional idea). After ACL: only people who already have access may be subscribed. On `put_journey` / `post_comment` / `gate_events`, emit audit then fire the webhook to subscribers who may still read that row. Email is **enqueue-only** — Resend lives on pirin.ai. This repo does not send mail.

### Webhook payload (Web Builder)

No PII dump. Same shape for webhook and the email contract row:

```json
{
  "company": { "slug": "exampleco", "label": "Example Co" },
  "idea": { "slug": "default", "name": "Default" },
  "event": "put_journey",
  "who": "acl-principal",
  "at": "2026-09-02T00:00:00.000Z",
  "summary": "short comment-or-change summary"
}
```

`event` is `put_journey` | `post_comment` | `gate_event`. `idea` is null for company-only events. `who` is the actor already on the ACL. `summary` is ≤80 characters.

## Tools (gated; public OS tools stay unauthenticated)

| Tool | Who | Notes |
|------|-----|--------|
| `get_journey` | founder / advisor on the allowlist | Company query → every idea. Company/idea → one idea. Always surfaces `constraint_this_week`. |
| `put_journey` | founder + founder-authorized | Overwrite clocks/jsonb including `constraint_this_week`. One founder yes in chat. |
| `post_comment` | advisors | Side table. Never a gate. |
| `subscribe_board` | founder + founder-authorized | Grant webhook (+ email opt-in enqueue) to an ACL member. |
| `unsubscribe_board` | founder + founder-authorized | Remove a subscriber. |
| `list_subscribers` | anyone who may `get_journey` | Company the caller can read. |

HTTP 401 + `WWW-Authenticate: Bearer … resource_metadata=…` on gated `tools/call` without a token. Public OS tools skip login.

These tools are **not** on the production pin. Stdio/path 3 does not register them (do not lift local traces).

## Out

No login UI in this repo. No snapshot UI. No marketplace. No Grok Bot template. No FAST mentee names or emails in public markdown.
