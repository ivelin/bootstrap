/**
 * HARD RULE CI gate: company board/data access is invite-only.
 * Cross-tenant reads/writes MUST fail this file (and therefore the pipeline).
 * PGlite / memory / HTTP only. Never supabase-pirin-ai. Never prod.
 *
 * Distinctive tokens below are synthetic leak canaries — not instance secrets.
 */
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { handleHostedReadFetch } from "../dist/hosted-handler.js";
import {
  HOSTED_GATED_IDENTITY_TOOL_NAMES,
  HOSTED_GATED_JOURNEY_TOOL_NAMES,
} from "../dist/constants.js";
import { HostedMembershipJourneyStore } from "../dist/hosted-journey-store.js";
import { clearHostedCompanyContextForTests } from "../dist/hosted-company-context.js";
import {
  MemoryIdentityStore,
  hashMcpToken,
  setIdentityStoreForTests,
} from "../dist/identity.js";
import { syntheticAccessToken } from "../dist/journey-auth.js";
import {
  actorFromAuthorizationHeader,
} from "../dist/journey-auth.js";
import {
  fixtureJourneyStore,
  setJourneyStoreForTests,
} from "../dist/journey.js";
import { REPO_ROOT } from "./helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDENTITY_SCHEMA = path.join(__dirname, "pglite", "identity-schema.sql");
const JOURNEY_SCHEMA = path.join(__dirname, "pglite", "journey-schema.sql");
const HOSTED_DOC = path.join(REPO_ROOT, "mcp", "docs", "HOSTED_IDENTITY.md");
const JOURNEY_DOC = path.join(REPO_ROOT, "mcp", "docs", "JOURNEY.md");
const E2E_DOC = path.join(REPO_ROOT, "mcp", "docs", "E2E_ROLEPLAY.md");
const RPC_SQL = path.join(
  REPO_ROOT,
  "mcp",
  "supabase",
  "migrations",
  "20260915_bootstrap_os_journey_rpcs.sql",
);
const ENSURE_SQL = path.join(
  REPO_ROOT,
  "mcp",
  "supabase",
  "migrations",
  "20260916_bootstrap_os_get_journey_log.sql",
);
const CREATE_SQL = path.join(
  REPO_ROOT,
  "mcp",
  "supabase",
  "migrations",
  "20260918_bootstrap_os_create_idea.sql",
);

const EMAIL_A = "mentee-a@example.test";
const EMAIL_B = "mentee-b@example.test";
const EMAIL_MULTI = "founder@example.test";
const TOKEN_A = "bos_mentee_a_fixture_xx";
const TOKEN_B = "bos_mentee_b_fixture_xx";
const TOKEN_MULTI = "bos_multi_member_fix_xx";

const BRAVO_CONSTRAINT = "bravo-only-constraint-token";
const BRAVO_COMMENT = "bravo-only-comment-token";
const BRAVO_QUESTION = "bravo-only-question-token";
const BRAVO_HYPOTHESIS = "bravo-only-hypothesis-token";
const BRAVO_HOOK = "https://hooks.example.test/bravo-only";
const CORE_CONSTRAINT = "corehaul-only-constraint-token";
const CORE_COMMENT = "corehaul-only-comment-token";

const BRAVO_CANARIES = [
  BRAVO_CONSTRAINT,
  BRAVO_COMMENT,
  BRAVO_QUESTION,
  BRAVO_HYPOTHESIS,
  "hooks.example.test/bravo-only",
];
const CORE_CANARIES = [CORE_CONSTRAINT, CORE_COMMENT];

function jwt(email, sub) {
  return syntheticAccessToken({ email, sub: sub || `sub-${email}` });
}

function bearer(email, sub) {
  return actorFromAuthorizationHeader(`Bearer ${jwt(email, sub)}`, "memory");
}

function labelsFor(actor) {
  if (actor.email === EMAIL_A) return ["alpha"];
  if (actor.email === EMAIL_B) return ["bravo"];
  if (actor.email === EMAIL_MULTI) return ["alpha", "charlie"];
  return [];
}

function identityStore() {
  return new MemoryIdentityStore([
    {
      id: "mentee-a",
      email: EMAIL_A,
      authUserId: "auth-a",
      labels: ["alpha"],
      tokenHashes: [hashMcpToken(TOKEN_A)],
    },
    {
      id: "mentee-b",
      email: EMAIL_B,
      authUserId: "auth-b",
      labels: ["bravo"],
      tokenHashes: [hashMcpToken(TOKEN_B)],
    },
    {
      id: "mentee-multi",
      email: EMAIL_MULTI,
      authUserId: "auth-multi",
      labels: ["alpha", "charlie"],
      tokenHashes: [hashMcpToken(TOKEN_MULTI)],
    },
  ]);
}

function membershipStore() {
  return new HostedMembershipJourneyStore(labelsFor);
}

function blobOf(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function assertClosedNoLeak(payload, canaries, detail) {
  const blob = blobOf(payload);
  if (payload && typeof payload === "object") {
    assert.notEqual(payload.ok, true, `${detail}: must not be ok`);
    assert.equal(payload.ideas, undefined, `${detail}: ideas must be absent`);
    assert.equal(payload.owners, undefined, `${detail}: owners must be absent`);
    assert.equal(payload.acl, undefined, `${detail}: acl must be absent`);
    assert.equal(payload.audit, undefined, `${detail}: audit must be absent`);
    assert.equal(payload.subscribers, undefined, `${detail}: subscribers must be absent`);
    assert.equal(payload.comment, undefined, `${detail}: comment must be absent`);
  }
  for (const needle of canaries) {
    assert.doesNotMatch(blob, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${detail}: leaked ${needle}`);
  }
}

function parseTool(rpcBody) {
  const text = (rpcBody.result?.content ?? []).map((c) => c.text ?? "").join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rawRpc(name, args, token, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...extraHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return handleHostedReadFetch(
    new Request("https://preview.example/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    }),
  );
}

async function callTool(name, args, token, extraHeaders = {}) {
  const res = await rawRpc(name, args, token, extraHeaders);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { res, body, text };
}

async function seedBravo(store) {
  const b = bearer(EMAIL_B);
  assert.equal((await store.getJourney(b, { companySlug: "bravo" })).ok, true);
  const put = await store.putJourney(b, {
    companySlug: "bravo",
    why: "seed bravo",
    founderYes: true,
    constraintThisWeek: BRAVO_CONSTRAINT,
    scoreboard: {
      schema_version: 1,
      hypothesis: BRAVO_HYPOTHESIS,
      openQuestions: [BRAVO_QUESTION],
    },
  });
  assert.equal(put.ok, true);
  const comment = await store.postComment(b, { companySlug: "bravo", body: BRAVO_COMMENT });
  assert.equal(comment.ok, true);
  const sub = await store.subscribeBoard(b, {
    companySlug: "bravo",
    principal: EMAIL_B,
    principalKind: "email",
    webhookUrl: BRAVO_HOOK,
  });
  assert.equal(sub.ok, true);
}

async function seedCorehaul(store) {
  const founder = bearer("founder-core@example.test");
  const advisor = bearer("advisor-cos@example.test");
  const put = await store.putJourney(founder, {
    companySlug: "corehaul",
    why: "seed core",
    founderYes: true,
    constraintThisWeek: CORE_CONSTRAINT,
  });
  assert.equal(put.ok, true);
  const comment = await store.postComment(advisor, {
    companySlug: "corehaul",
    body: CORE_COMMENT,
  });
  assert.equal(comment.ok, true);
}

afterEach(() => {
  setIdentityStoreForTests(undefined);
  setJourneyStoreForTests(undefined);
  clearHostedCompanyContextForTests();
});

describe("cross-tenant invite-only CI gate (file lock)", () => {
  it("docs name the hard rule; SQL held_label fail-closed; CI wires this file", () => {
    const hosted = fs.readFileSync(HOSTED_DOC, "utf8");
    const journey = fs.readFileSync(JOURNEY_DOC, "utf8");
    const e2e = fs.readFileSync(E2E_DOC, "utf8");
    for (const body of [hosted, journey]) {
      assert.match(body, /Hard rule — invite-only company boards/);
      assert.match(body, /cross-tenant-leak\.test\.mjs/);
      assert.match(body, /never another company's rows/i);
    }
    assert.match(hosted, /401\/403 or empty/);
    assert.match(journey, /held_label|bootstrap_company_labels/);
    assert.match(e2e, /R8/);
    assert.match(e2e, /cross-tenant-leak\.test\.mjs/);

    const rpc = fs.readFileSync(RPC_SQL, "utf8");
    const ensure = fs.readFileSync(ENSURE_SQL, "utf8");
    const create = fs.readFileSync(CREATE_SQL, "utf8");
    assert.match(rpc, /CREATE OR REPLACE FUNCTION public\.bootstrap_os_held_label/);
    assert.match(rpc, /bootstrap_company_labels/);
    assert.match(rpc, /RAISE EXCEPTION 'company not visible'/);
    assert.match(rpc, /REVOKE ALL ON FUNCTION public\.bootstrap_os_held_label/);
    assert.doesNotMatch(rpc, /GRANT EXECUTE ON FUNCTION public\.bootstrap_os_held_label/);
    assert.match(rpc, /IF NOT public\.bootstrap_os_held_label/);
    assert.match(ensure, /IF NOT public\.bootstrap_os_held_label/);
    assert.match(create, /cid := public\.bootstrap_os_ensure_company/);
    assert.match(rpc, /i\.company_id = cid/);
    assert.doesNotMatch(rpc, /USING\s*\(\s*true\s*\)/i);
    assert.doesNotMatch(rpc, /GRANT EXECUTE ON FUNCTION public\.bootstrap_os_get_journey[\s\S]{0,40}anon/);

    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "mcp", "package.json"), "utf8"));
    assert.match(pkg.scripts["test:unit"], /test\/cross-tenant-leak\.test\.mjs/);
  });
});

describe("cross-tenant invite-only CI gate (HTTP + hosted membership)", () => {
  it("unauthenticated and stranger JWT: every gated journey/list tool 401, no canary leak", async () => {
    const store = membershipStore();
    setJourneyStoreForTests(store);
    setIdentityStoreForTests(identityStore());
    await seedBravo(store);

    const gated = [
      ...HOSTED_GATED_JOURNEY_TOOL_NAMES.map((name) => [
        name,
        name === "create_idea"
          ? { company: "bravo", idea: "leak", founderYes: true }
          : name === "put_journey"
            ? { company: "bravo", why: "x", founderYes: true }
            : name === "post_comment"
              ? { company: "bravo", body: "x" }
              : name === "subscribe_board"
                ? {
                    company: "bravo",
                    principal: EMAIL_B,
                    principalKind: "email",
                    webhookUrl: BRAVO_HOOK,
                  }
                : name === "unsubscribe_board"
                  ? { company: "bravo", principal: EMAIL_B, principalKind: "email" }
                  : name === "list_subscribers"
                    ? { company: "bravo" }
                    : { q: "bravo" },
      ]),
      ...HOSTED_GATED_IDENTITY_TOOL_NAMES.map((name) => [
        name,
        name === "bootstrap_use_company"
          ? { company: "bravo" }
          : name === "invite_member"
            ? { email: "other@example.test", companyLabel: "bravo" }
            : name === "accept_invite"
              ? { token: "inv_not_a_real_token_xx" }
              : {},
      ]),
    ];

    for (const [name, args] of gated) {
      const empty = await callTool(name, args);
      assert.equal(empty.res.status, 401, `${name} cookie-less`);
      assertClosedNoLeak(empty.text, BRAVO_CANARIES, `${name} cookie-less`);

      const stranger = await callTool(name, args, jwt("stranger@example.test"));
      assert.equal(stranger.res.status, 401, `${name} stranger`);
      assertClosedNoLeak(stranger.text, BRAVO_CANARIES, `${name} stranger`);
    }
  });

  it("invited to alpha only: can see alpha; every bravo probe fails closed (q=, typo, idea slug, webhook, list)", async () => {
    const store = membershipStore();
    setJourneyStoreForTests(store);
    setIdentityStoreForTests(identityStore());
    await seedBravo(store);
    const a = jwt(EMAIL_A);
    const actorA = bearer(EMAIL_A);

    const own = await callTool("get_journey", { company: "alpha" }, a);
    assert.equal(own.res.status, 200, own.text);
    const ownBoard = parseTool(own.body);
    assert.equal(ownBoard.ok, true);
    assert.equal(ownBoard.company.slug, "alpha");
    assertClosedNoLeak(
      { ok: false, blob: own.text },
      BRAVO_CANARIES,
      "alpha board must not contain bravo canaries",
    );
    assert.doesNotMatch(own.text, /mentee-b@example\.test/);

    const probes = [
      ["get_journey", { company: "bravo" }],
      ["get_journey", { q: "bravo" }],
      ["get_journey", { q: "Bravo / default" }],
      ["get_journey", { company: "brav" }],
      ["get_journey", { company: "alpha", idea: "secret-bet" }],
      ["bootstrap_where_are_we", { q: "bravo" }],
      ["create_idea", { company: "bravo", idea: "secret-bet", founderYes: true }],
      ["put_journey", { company: "bravo", why: "leak", founderYes: true, constraintThisWeek: "stolen" }],
      ["post_comment", { company: "bravo", body: "leak comment" }],
      [
        "subscribe_board",
        {
          company: "bravo",
          principal: EMAIL_B,
          principalKind: "email",
          webhookUrl: "https://hooks.example.test/stolen",
        },
      ],
      ["unsubscribe_board", { company: "bravo", principal: EMAIL_B, principalKind: "email" }],
      ["list_subscribers", { company: "bravo" }],
    ];

    for (const [name, args] of probes) {
      const hit = await callTool(name, args, a);
      assert.equal(hit.res.status, 200, `${name} ${JSON.stringify(args)} status`);
      const parsed = parseTool(hit.body);
      assertClosedNoLeak(parsed, BRAVO_CANARIES, `HTTP ${name} ${JSON.stringify(args)}`);
      assertClosedNoLeak(hit.text, BRAVO_CANARIES, `HTTP blob ${name}`);
    }

    const storeProbes = [
      store.getJourney(actorA, { companySlug: "bravo" }),
      store.getJourney(actorA, { companySlug: "bravo", ideaSlug: "default" }),
      store.createIdea(actorA, { companySlug: "bravo", ideaSlug: "secret-bet", founderYes: true }),
      store.putJourney(actorA, { companySlug: "bravo", why: "x", founderYes: true }),
      store.postComment(actorA, { companySlug: "bravo", body: "x" }),
      store.subscribeBoard(actorA, {
        companySlug: "bravo",
        principal: EMAIL_B,
        principalKind: "email",
        webhookUrl: BRAVO_HOOK,
      }),
      store.unsubscribeBoard(actorA, {
        companySlug: "bravo",
        principal: EMAIL_B,
        principalKind: "email",
      }),
      store.listSubscribers(actorA, { companySlug: "bravo" }),
      store.changeAcl(actorA, {
        companySlug: "bravo",
        principal: EMAIL_A,
        principalKind: "email",
        role: "founder",
        op: "grant",
      }),
    ];
    for (const pending of storeProbes) {
      const result = await pending;
      assertClosedNoLeak(result, BRAVO_CANARIES, `store ${result.error || "closed"}`);
    }

    const stillB = await store.getJourney(bearer(EMAIL_B), { companySlug: "bravo", expandMeetingDoc: true });
    assert.equal(stillB.ok, true);
    assert.equal(stillB.ideas[0].constraintThisWeek, BRAVO_CONSTRAINT);
    assert.ok(stillB.ideas[0].comments.some((c) => c.body === BRAVO_COMMENT));
    assert.deepEqual(
      stillB.ideas.map((i) => i.slug),
      ["default"],
    );
  });

  it("multi-membership is only the invite/ACL list; labels and boards do not bleed", async () => {
    const store = membershipStore();
    setJourneyStoreForTests(store);
    setIdentityStoreForTests(identityStore());
    await seedBravo(store);

    const listedA = parseTool(
      (await callTool("bootstrap_list_companies", {}, TOKEN_A)).body,
    );
    assert.deepEqual(listedA.companies, ["alpha"]);
    assert.deepEqual(listedA.labels, ["alpha"]);
    assert.ok(!listedA.companies.includes("bravo"));
    assert.ok(!listedA.companies.includes("charlie"));

    const listedB = parseTool(
      (await callTool("bootstrap_list_company_labels", {}, TOKEN_B)).body,
    );
    assert.deepEqual(listedB.companies, ["bravo"]);
    assert.ok(!listedB.companies.includes("alpha"));

    const listedM = parseTool(
      (await callTool("bootstrap_list_companies", {}, TOKEN_MULTI)).body,
    );
    assert.deepEqual(listedM.companies, ["alpha", "charlie"]);
    assert.ok(!listedM.companies.includes("bravo"));

    const useB = await callTool("bootstrap_use_company", { company: "bravo" }, TOKEN_A);
    assert.equal(useB.body.result.isError, true);
    assert.match(useB.body.result.content[0].text, /don't have access/i);
    assert.doesNotMatch(useB.text, /bravo-only/);

    const session = { "MCP-Session-Id": "cross-tenant-session-a" };
    const useA = parseTool(
      (await callTool("bootstrap_use_company", { company: "alpha" }, TOKEN_A, session)).body,
    );
    assert.equal(useA.ok, true);
    const viaSession = await callTool("get_journey", {}, jwt(EMAIL_A), session);
    const viaBoard = parseTool(viaSession.body);
    assert.equal(viaBoard.ok, true);
    assert.equal(viaBoard.company.slug, "alpha");
    assertClosedNoLeak(viaSession.text, BRAVO_CANARIES, "session fallback");

    const multiJwt = jwt(EMAIL_MULTI);
    const noBravo = parseTool((await callTool("get_journey", { q: "bravo" }, multiJwt)).body);
    assertClosedNoLeak(noBravo, BRAVO_CANARIES, "multi-member q=bravo");
    const charlie = parseTool((await callTool("get_journey", { company: "charlie" }, multiJwt)).body);
    assert.equal(charlie.ok, true);
    assert.equal(charlie.company.slug, "charlie");
    assertClosedNoLeak(
      { ok: false, blob: JSON.stringify(charlie) },
      BRAVO_CANARIES,
      "charlie board",
    );
  });
});

describe("cross-tenant invite-only CI gate (memory ACL + webhook)", () => {
  it("dye founder cannot read/write corehaul via q=, idea slug, list, or webhook", async () => {
    const store = fixtureJourneyStore();
    setJourneyStoreForTests(store);
    await seedCorehaul(store);

    const dyeTok = jwt("founder-dye@example.test");
    const dye = bearer("founder-dye@example.test");

    const own = parseTool((await callTool("get_journey", { q: "dyeconverter" }, dyeTok)).body);
    assert.equal(own.ok, true);
    assert.equal(own.company.slug, "dyeconverter");
    assertClosedNoLeak({ ok: false, blob: JSON.stringify(own) }, CORE_CANARIES, "dye board");

    for (const [name, args] of [
      ["get_journey", { q: "corehaul" }],
      ["get_journey", { q: "CoreHaul / last-mile" }],
      ["get_journey", { company: "dyeconverter", idea: "corehaul" }],
      ["put_journey", { company: "corehaul", why: "leak", founderYes: true }],
      ["post_comment", { company: "corehaul", body: "leak" }],
      ["list_subscribers", { company: "corehaul" }],
      [
        "subscribe_board",
        {
          company: "corehaul",
          principal: "advisor-cos@example.test",
          principalKind: "email",
          webhookUrl: "https://hooks.example.test/stolen",
        },
      ],
    ]) {
      const hit = await callTool(name, args, dyeTok);
      assert.equal(hit.res.status, 200, name);
      assertClosedNoLeak(parseTool(hit.body), CORE_CANARIES, `HTTP ${name}`);
    }

    const listed = await store.listSubscribers(dye, { companySlug: "corehaul" });
    assertClosedNoLeak(listed, CORE_CANARIES, "list corehaul as dye");

    const before = store.webhookDeliveries.length;
    const wrote = await store.putJourney(dye, {
      companySlug: "corehaul",
      why: "should not write",
      founderYes: true,
      constraintThisWeek: "stolen-from-dye",
    });
    assert.equal(wrote.ok, false);
    assert.equal(store.webhookDeliveries.length, before);

    const core = await store.getJourney(bearer("founder-core@example.test"), {
      companySlug: "corehaul",
      expandMeetingDoc: true,
    });
    assert.equal(core.ok, true);
    assert.equal(core.ideas[0].constraintThisWeek, CORE_CONSTRAINT);
    assert.doesNotMatch(JSON.stringify(core), /stolen-from-dye/);
  });
});

describe("cross-tenant invite-only CI gate (PGlite)", { concurrency: false }, () => {
  let idDb;
  let journeyDb;

  before(async () => {
    idDb = new PGlite();
    await idDb.exec(fs.readFileSync(IDENTITY_SCHEMA, "utf8"));
    journeyDb = new PGlite();
    await journeyDb.exec(fs.readFileSync(JOURNEY_SCHEMA, "utf8"));
  });

  after(async () => {
    await idDb?.close();
    await journeyDb?.close();
  });

  async function held(email, uid, company) {
    await idDb.exec("RESET ROLE");
    await idDb.query("SELECT set_config('app.auth_email', $1, false)", [email]);
    await idDb.query("SELECT set_config('app.auth_uid', $1, false)", [uid]);
    const rows = await idDb.query("SELECT bootstrap_os_held_label($1) AS held", [company]);
    return rows.rows[0].held;
  }

  async function asApp({ email = "", sub = "" }, sql, params = []) {
    await journeyDb.exec("RESET ROLE");
    await journeyDb.query("SELECT set_config('app.actor_email', $1, false)", [email]);
    await journeyDb.query("SELECT set_config('app.actor_sub', $1, false)", [sub]);
    await journeyDb.exec("SET ROLE journey_app");
    const rows = await journeyDb.query(sql, params);
    await journeyDb.exec("RESET ROLE");
    return rows.rows;
  }

  it("held_label: A holds alpha only; stranger and typos are false; no bravo bleed", async () => {
    assert.equal(await held(EMAIL_A, "11111111-1111-1111-1111-111111111111", "alpha"), true);
    assert.equal(await held(EMAIL_A, "11111111-1111-1111-1111-111111111111", "bravo"), false);
    assert.equal(await held(EMAIL_A, "11111111-1111-1111-1111-111111111111", "brav"), false);
    assert.equal(await held(EMAIL_A, "11111111-1111-1111-1111-111111111111", "charlie"), false);
    assert.equal(await held(EMAIL_B, "22222222-2222-2222-2222-222222222222", "bravo"), true);
    assert.equal(await held(EMAIL_B, "22222222-2222-2222-2222-222222222222", "alpha"), false);
    assert.equal(await held("stranger@example.test", "99999999-9999-9999-9999-999999999999", "alpha"), false);
    assert.equal(await held("", "", "alpha"), false);
    assert.equal(
      await held("founder@example.test", "33333333-3333-3333-3333-333333333333", "alpha"),
      true,
    );
    assert.equal(
      await held("founder@example.test", "33333333-3333-3333-3333-333333333333", "bravo"),
      true,
    );
  });

  it("journey RLS: dye cannot read corehaul comments, audit, scoreboard, subscribers, or notify", async () => {
    await journeyDb.exec("RESET ROLE");
    await journeyDb.exec(`
      UPDATE bootstrap_os.ideas
      SET scoreboard = jsonb_set(
        COALESCE(scoreboard, '{"schema_version": 1}'::jsonb),
        '{constraint_this_week}',
        '"${CORE_CONSTRAINT}"'
      )
      WHERE id = 'idea-core'
    `);
    await asApp(
      { email: "advisor-cos@example.test" },
      "INSERT INTO bootstrap_os.comments (id, idea_id, body, who) VALUES ('c-core-canary', 'idea-core', $1, 'advisor-cos@example.test')",
      [CORE_COMMENT],
    );

    const ideas = await asApp(
      { email: "founder-dye@example.test" },
      "SELECT slug, scoreboard->>'constraint_this_week' AS c FROM bootstrap_os.ideas",
    );
    assert.deepEqual(
      ideas.map((r) => r.slug),
      ["dyeconverter"],
    );
    assert.ok(ideas.every((r) => r.c !== CORE_CONSTRAINT));

    const comments = await asApp(
      { email: "founder-dye@example.test" },
      "SELECT body FROM bootstrap_os.comments",
    );
    assert.ok(comments.every((r) => r.body !== CORE_COMMENT));

    const audit = await asApp(
      { email: "founder-dye@example.test" },
      "SELECT id FROM bootstrap_os.audit_events WHERE company_id = 'co-core'",
    );
    assert.deepEqual(audit, []);

    const subs = await asApp(
      { email: "founder-dye@example.test" },
      "SELECT id FROM bootstrap_os.board_subscribers WHERE company_id = 'co-core'",
    );
    assert.deepEqual(subs, []);

    const outbox = await asApp(
      { email: "founder-dye@example.test" },
      "SELECT id FROM bootstrap_os.notify_outbox WHERE company_id = 'co-core'",
    );
    assert.deepEqual(outbox, []);

    await asApp(
      { email: "founder-dye@example.test" },
      "UPDATE bootstrap_os.ideas SET scoreboard = jsonb_set(scoreboard, '{constraint_this_week}', '\"stolen-from-dye\"') WHERE id = 'idea-core'",
    );
    const core = await asApp(
      { email: "founder-core@example.test" },
      "SELECT scoreboard->>'constraint_this_week' AS c FROM bootstrap_os.ideas WHERE id = 'idea-core'",
    );
    assert.equal(core[0].c, CORE_CONSTRAINT);
  });
});
