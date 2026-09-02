/**
 * Visual flow, two-minute snapshot, and meeting doc are generated views.
 * Comments never mutate gates. Company query vs idea query.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { syntheticAccessToken } from "../dist/journey-auth.js";
import { actorFromAuthorizationHeader } from "../dist/journey-auth.js";
import {
  JOURNEY_FIXTURE,
  MemoryJourneyStore,
  commentsMayMutateGate,
  defaultScoreboard,
  fixtureJourneyStore,
  LANDING_PAGE_CONSTRAINT_REFUSE,
  agentMayRubberStampConstraint,
  mayWriteConstraintThisWeek,
  preferenceMayNameConstraint,
} from "../dist/journey.js";

function bearer(email, sub) {
  return actorFromAuthorizationHeader(
    `Bearer ${syntheticAccessToken({ email, sub })}`,
    "memory",
  );
}

describe("journey views + tools (memory store)", () => {
  it("company query returns every idea; idea query returns one; default idea on a one-thesis company", async () => {
    const extra = new MemoryJourneyStore(
      JOURNEY_FIXTURE.companies.map((c) => ({ ...c })),
      JOURNEY_FIXTURE.acl.map((a) => ({ ...a })),
      [
        ...JOURNEY_FIXTURE.ideas.map((i) => ({ ...i, scoreboard: defaultScoreboard() })),
        {
          id: "idea-core-2",
          companyId: "co-core",
          slug: "last-mile",
          name: "last-mile",
          journeyPhase: 1,
          loopStage: 1,
          currentGate: "hold",
          scoreboard: defaultScoreboard(),
        },
      ],
      [],
      [],
    );
    const founder = bearer("founder-core@example.test");
    const company = await extra.getJourney(founder, { companySlug: "corehaul" });
    assert.equal(company.ok, true);
    assert.deepEqual(
      company.ideas.map((i) => i.slug).sort(),
      ["corehaul", "last-mile"],
    );
    const one = await extra.getJourney(founder, {
      companySlug: "corehaul",
      ideaSlug: "last-mile",
    });
    assert.equal(one.ideas.length, 1);
    assert.equal(one.ideas[0].slug, "last-mile");

    const dyeStore = fixtureJourneyStore();
    const dyeFounder = bearer("founder-dye@example.test");
    const dye = await dyeStore.getJourney(dyeFounder, { companySlug: "dyeconverter" });
    assert.equal(dye.ideas.length, 1);
    assert.equal(dye.ideas[0].slug, "dyeconverter");
  });

  it("visual/snapshot always; meeting doc only on expand; not stored", async () => {
    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const basic = await store.getJourney(founder, { companySlug: "corehaul" });
    const idea = basic.ideas[0];
    assert.match(idea.visualFlow, /mermaid/);
    assert.match(idea.visualFlow, /Journey 1-9/);
    assert.match(idea.visualFlow, /Loop 1-7/);
    assert.match(idea.snapshot, /two-minute read/);
    assert.match(
      idea.snapshot,
      /Constraint this week \(honest biggest bottleneck; where help is required\): none yet/,
    );
    assert.match(idea.snapshot, /Not a fun side quest/);
    assert.match(idea.snapshot, /Preference/);
    assert.match(idea.snapshot, /Teaching picture, not extra law/);
    assert.match(idea.snapshot, /weakest link/);
    assert.match(idea.snapshot, /slowest soldier/);
    assert.match(idea.snapshot, /not on that link is not progress/);
    assert.equal(idea.constraintThisWeek, "");
    assert.match(idea.visualFlow, /Constraint this week:/);
    assert.equal(idea.meetingDoc, undefined);
    const expanded = await store.getJourney(founder, {
      companySlug: "corehaul",
      expandMeetingDoc: true,
    });
    assert.match(expanded.ideas[0].meetingDoc, /Generated as a view/);
    assert.match(expanded.ideas[0].meetingDoc, /Where help is needed/);
    assert.match(
      expanded.ideas[0].meetingDoc,
      /Constraint this week \(honest biggest bottleneck; where help is required\): none yet/,
    );
    assert.equal(commentsMayMutateGate(), false);
  });

  it("put_journey is founder+yes; advisor comments cannot mutate gates", async () => {
    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const advisor = bearer("advisor-cos@example.test");
    const dyeFounder = bearer("founder-dye@example.test");

    const refused = await store.putJourney(founder, {
      companySlug: "corehaul",
      journeyPhase: 2,
      currentGate: "advance",
      why: "thesis written",
      founderYes: false,
    });
    assert.equal(refused.ok, false);

    const advisorWrite = await store.putJourney(advisor, {
      companySlug: "corehaul",
      journeyPhase: 9,
      currentGate: "advance",
      why: "nope",
      founderYes: true,
    });
    assert.equal(advisorWrite.ok, false);

    const cross = await store.putJourney(dyeFounder, {
      companySlug: "corehaul",
      journeyPhase: 9,
      why: "nope",
      founderYes: true,
    });
    assert.equal(cross.ok, false);

    const ok = await store.putJourney(founder, {
      companySlug: "corehaul",
      journeyPhase: 2,
      loopStage: 2,
      currentGate: "advance",
      scoreboard: {
        schema_version: 1,
        openQuestions: ["who already has this job"],
        progress: ["thesis draft"],
      },
      why: "founder yes in chat",
      founderYes: true,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.idea.clocks.journeyPhase, 2);
    assert.equal(ok.idea.lastTransitions.length, 1);

    const before = ok.idea.clocks;
    const comment = await store.postComment(advisor, {
      companySlug: "corehaul",
      body: "I can intro two operators",
    });
    assert.equal(comment.ok, true);
    assert.deepEqual(comment.clocksUnchanged, before);
    const founderComment = await store.postComment(founder, {
      companySlug: "corehaul",
      body: "should fail",
    });
    assert.equal(founderComment.ok, false);
    const after = await store.getJourney(founder, { companySlug: "corehaul" });
    assert.equal(after.ideas[0].clocks.journeyPhase, 2);
    assert.equal(after.ideas[0].clocks.currentGate, "advance");
  });

  it("one mentee cannot read another; jsonb clocks stay out of scoreboard writes", async () => {
    const store = fixtureJourneyStore();
    const dye = bearer("founder-dye@example.test");
    const hidden = await store.getJourney(dye, { companySlug: "corehaul" });
    assert.equal(hidden.ok, false);
    await store.putJourney(dye, {
      companySlug: "dyeconverter",
      scoreboard: { schema_version: 1, journeyPhase: 9, currentGate: "advance" },
      why: "jsonb must not be clocks",
      founderYes: true,
    });
    const after = await store.getJourney(dye, { companySlug: "dyeconverter" });
    assert.equal(after.ideas[0].clocks.journeyPhase, 1);
    assert.equal(after.ideas[0].clocks.currentGate, "hold");
    assert.equal(after.ideas[0].scoreboard.journeyPhase, 9);
  });

  it("put_journey, post_comment, and ACL changes emit append-only audit; advisors read, cannot write", async () => {
    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const advisor = bearer("advisor-cos@example.test");
    const dye = bearer("founder-dye@example.test");

    await store.putJourney(founder, {
      companySlug: "corehaul",
      journeyPhase: 2,
      why: "founder yes",
      founderYes: true,
      client: "cursor-agent",
    });
    await store.postComment(advisor, {
      companySlug: "corehaul",
      body: "noted",
      client: "cursor-agent",
    });
    const granted = await store.changeAcl(founder, {
      companySlug: "corehaul",
      principal: "specialist@example.test",
      principalKind: "email",
      role: "advisor",
      op: "grant",
      client: "cursor-agent",
    });
    assert.equal(granted.ok, true);
    const advisorWriteAcl = await store.changeAcl(advisor, {
      companySlug: "corehaul",
      principal: "nope@example.test",
      principalKind: "email",
      role: "advisor",
      op: "grant",
    });
    assert.equal(advisorWriteAcl.ok, false);

    const seen = await store.getJourney(advisor, { companySlug: "corehaul" });
    assert.equal(seen.ok, true);
    const vias = seen.audit.map((a) => a.whatChanged.via).sort();
    assert.deepEqual(vias, ["acl", "post_comment", "put_journey"]);
    assert.ok(seen.audit.every((a) => a.client === "cursor-agent"));
    assert.ok(seen.audit.some((a) => a.ideaId === null && a.whatChanged.via === "acl"));

    const hidden = await store.getJourney(dye, { companySlug: "corehaul" });
    assert.equal(hidden.ok, false);
    const dyeView = await store.getJourney(dye, { companySlug: "dyeconverter" });
    assert.equal(dyeView.audit.length, 0);
  });

  it("constraint_this_week is fluid, surfaced by get_journey, and writes emit audit", async () => {
    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const advisor = bearer("advisor-cos@example.test");

    const empty = await store.getJourney(founder, { companySlug: "corehaul" });
    assert.equal(empty.ideas[0].constraintThisWeek, "");
    assert.match(empty.ideas[0].snapshot, /where help is required/);

    const tooLong = await store.putJourney(founder, {
      companySlug: "corehaul",
      constraintThisWeek: "x".repeat(281),
      why: "too long",
      founderYes: true,
    });
    assert.equal(tooLong.ok, false);

    const written = await store.putJourney(founder, {
      companySlug: "corehaul",
      constraintThisWeek: "need two operators who already pay for dispatch",
      why: "this week's constraint",
      founderYes: true,
      client: "cursor-agent",
    });
    assert.equal(written.ok, true);
    assert.equal(written.idea.clocks.journeyPhase, 1);
    assert.equal(written.idea.clocks.currentGate, "hold");
    assert.equal(
      written.idea.constraintThisWeek,
      "need two operators who already pay for dispatch",
    );
    assert.equal(written.audit.whatChanged.constraint_this_week, written.idea.constraintThisWeek);

    const seen = await store.getJourney(advisor, {
      companySlug: "corehaul",
      expandMeetingDoc: true,
    });
    assert.equal(seen.ideas[0].constraintThisWeek, "need two operators who already pay for dispatch");
    assert.match(seen.ideas[0].snapshot, /need two operators who already pay for dispatch/);
    assert.match(seen.ideas[0].visualFlow, /need two operators who already pay for dispatch/);
    assert.match(seen.ideas[0].meetingDoc, /need two operators who already pay for dispatch/);
    assert.ok(
      seen.audit.some(
        (a) =>
          a.whatChanged.via === "put_journey" &&
          a.whatChanged.constraint_this_week ===
            "need two operators who already pay for dispatch",
      ),
    );
  });

  it("cold agent refuses “new landing page” as constraint unless founder writes an override", async () => {
    assert.equal(preferenceMayNameConstraint(), false);
    assert.equal(agentMayRubberStampConstraint(), false);
    const refuse = mayWriteConstraintThisWeek({
      constraint: "new landing page",
      talkedToCustomers: false,
    });
    assert.equal(refuse.ok, false);
    assert.equal(refuse.error, LANDING_PAGE_CONSTRAINT_REFUSE);
    const override = mayWriteConstraintThisWeek({
      constraint: "new landing page",
      talkedToCustomers: false,
      founderWrittenDecision: "We already know the slice; page is the unlock this week.",
    });
    assert.equal(override.ok, true);
    const afterTalks = mayWriteConstraintThisWeek({
      constraint: "new landing page",
      talkedToCustomers: true,
    });
    assert.equal(afterTalks.ok, true);

    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const rubber = await store.putJourney(founder, {
      companySlug: "corehaul",
      constraintThisWeek: "new landing page",
      why: "this is interesting",
      founderYes: true,
    });
    assert.equal(rubber.ok, false);
    assert.match(rubber.error, /fun side quest/);
    assert.match(rubber.error, /Do not rubber-stamp/);

    const stillEmpty = await store.getJourney(founder, { companySlug: "corehaul" });
    assert.equal(stillEmpty.ok, true);
    assert.equal(stillEmpty.ideas[0].constraintThisWeek, "");
    assert.match(stillEmpty.ideas[0].snapshot, /honest biggest bottleneck/);

    const written = await store.putJourney(founder, {
      companySlug: "corehaul",
      constraintThisWeek: "new landing page",
      why: "founder override after challenge",
      founderYes: true,
      founderWrittenDecision:
        "I heard the challenge. The unlock this week is still a new landing page.",
    });
    assert.equal(written.ok, true);
    assert.equal(written.idea.constraintThisWeek, "new landing page");
    assert.match(written.idea.snapshot, /new landing page/);
    assert.match(written.idea.constraintChallenge, /fun side quest/);
    assert.match(written.idea.constraintChallenge, /written override/);

    const seen = await store.getJourney(founder, { companySlug: "corehaul" });
    assert.equal(seen.ideas[0].constraintThisWeek, "new landing page");
    assert.match(seen.ideas[0].snapshot, /Challenge:/);
    assert.match(seen.ideas[0].snapshot, /honest biggest bottleneck/);
  });

  it("board notify: founder grants ACL members; mentee A cannot subscribe to B; webhook only to ACL; comments do not move gates", async () => {
    const store = fixtureJourneyStore();
    const founder = bearer("founder-core@example.test");
    const advisor = bearer("advisor-cos@example.test");
    const dye = bearer("founder-dye@example.test");

    const strangerGrant = await store.subscribeBoard(founder, {
      companySlug: "corehaul",
      principal: "stranger@example.test",
      principalKind: "email",
      webhookUrl: "https://hooks.example.test/stranger",
    });
    assert.equal(strangerGrant.ok, false);

    const http = await store.subscribeBoard(founder, {
      companySlug: "corehaul",
      principal: "advisor-cos@example.test",
      principalKind: "email",
      webhookUrl: "http://hooks.example.test/insecure",
    });
    assert.equal(http.ok, false);

    const cross = await store.subscribeBoard(dye, {
      companySlug: "corehaul",
      principal: "advisor-cos@example.test",
      principalKind: "email",
      webhookUrl: "https://hooks.example.test/core",
    });
    assert.equal(cross.ok, false);

    const advisorGrant = await store.subscribeBoard(advisor, {
      companySlug: "corehaul",
      principal: "advisor-cos@example.test",
      principalKind: "email",
      webhookUrl: "https://hooks.example.test/core",
    });
    assert.equal(advisorGrant.ok, false);

    const granted = await store.subscribeBoard(founder, {
      companySlug: "corehaul",
      principal: "advisor-cos@example.test",
      principalKind: "email",
      webhookUrl: "https://hooks.example.test/core",
      emailOptIn: true,
    });
    assert.equal(granted.ok, true);

    const listed = await store.listSubscribers(advisor, { companySlug: "corehaul" });
    assert.equal(listed.ok, true);
    assert.equal(listed.subscribers.length, 1);
    const hiddenList = await store.listSubscribers(dye, { companySlug: "corehaul" });
    assert.equal(hiddenList.ok, false);

    const wrote = await store.putJourney(founder, {
      companySlug: "corehaul",
      journeyPhase: 2,
      why: "founder yes",
      founderYes: true,
    });
    assert.equal(wrote.ok, true);
    assert.equal(wrote.notify.webhook, 1);
    assert.equal(wrote.notify.emailQueued, 1);
    assert.equal(store.webhookDeliveries.length, 1);
    assert.equal(store.webhookDeliveries[0].url, "https://hooks.example.test/core");
    assert.equal(store.webhookDeliveries[0].payload.event, "put_journey");
    assert.equal(store.webhookDeliveries[0].payload.company.slug, "corehaul");
    assert.doesNotMatch(JSON.stringify(store.webhookDeliveries[0].payload), /scoreboard|openQuestions/);

    const before = wrote.idea.clocks;
    const comment = await store.postComment(advisor, {
      companySlug: "corehaul",
      body: "help on the slice",
    });
    assert.equal(comment.ok, true);
    assert.deepEqual(comment.clocksUnchanged, before);
    assert.equal(comment.notify.webhook, 1);
    assert.equal(store.webhookDeliveries.at(-1).payload.event, "post_comment");
    assert.equal(store.webhookDeliveries.at(-1).payload.summary, "help on the slice");

    await store.changeAcl(founder, {
      companySlug: "corehaul",
      principal: "advisor-cos@example.test",
      principalKind: "email",
      role: "advisor",
      op: "revoke",
    });
    const afterRevoke = await store.putJourney(founder, {
      companySlug: "corehaul",
      loopStage: 2,
      why: "after revoke",
      founderYes: true,
    });
    assert.equal(afterRevoke.notify.webhook, 0);
  });
});
