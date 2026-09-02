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
    assert.equal(idea.meetingDoc, undefined);
    const expanded = await store.getJourney(founder, {
      companySlug: "corehaul",
      expandMeetingDoc: true,
    });
    assert.match(expanded.ideas[0].meetingDoc, /Generated as a view/);
    assert.match(expanded.ideas[0].meetingDoc, /Where help is needed/);
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
});
