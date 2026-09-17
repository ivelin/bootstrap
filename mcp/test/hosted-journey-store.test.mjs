import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { HostedMembershipJourneyStore, createJourneyStore } from "../dist/hosted-journey-store.js";
import { setJourneyStoreForTests } from "../dist/journey.js";

afterEach(() => setJourneyStoreForTests(undefined));

function actor(email) {
  return { authenticated: true, email, principal: email, identityStore: "memory" };
}

describe("hosted membership journey store", () => {
  it("lazy-ensures default idea; non-member cannot read; put needs founderYes", async () => {
    const store = new HostedMembershipJourneyStore((a) =>
      a.email === "founder@example.test" ? ["alpha", "charlie"] : [],
    );
    const ivelin = actor("founder@example.test");
    const bill = actor("bill@example.test");
    assert.equal((await store.getJourney(bill, { companySlug: "alpha" })).ok, false);
    const board = await store.getJourney(ivelin, { companySlug: "alpha" });
    assert.equal(board.ok, true);
    assert.equal(board.ideas[0].slug, "default");
    assert.ok(Array.isArray(board.owners));
    assert.ok(board.owners.some((row) => row.principal === "founder@example.test"));
    assert.equal(board.ideas[0].clocks.journeyPhase, 1);
    assert.match(board.ideas[0].visualFlow, /mermaid/);
    assert.equal(
      (await store.putJourney(ivelin, { companySlug: "alpha", why: "x", founderYes: false, journeyPhase: 2 })).ok,
      false,
    );
    assert.equal(
      (
        await store.putJourney(ivelin, {
          companySlug: "alpha",
          why: "yes",
          founderYes: true,
          currentGate: "hold",
          constraintThisWeek: "talk",
        })
      ).ok,
      true,
    );
    assert.equal((await store.postComment(ivelin, { companySlug: "alpha", body: "note" })).ok, true);
    const after = await store.getJourney(ivelin, { companySlug: "alpha" });
    assert.equal(after.ideas[0].clocks.journeyPhase, 1);
    assert.ok(Array.isArray(after.ideas[0].lastTransitions));
    assert.ok(after.ideas[0].lastTransitions.length >= 1);
    assert.equal(after.ideas[0].lastTransitions[0].who, "founder@example.test");
    assert.ok(Array.isArray(after.audit));
    assert.ok(after.audit.length >= 1);
    const expanded = await store.getJourney(ivelin, {
      companySlug: "alpha",
      expandMeetingDoc: true,
    });
    assert.equal(expanded.ideas[0].comments[0].body, "note");
  });

  it("createJourneyStore is null off production; supabase rpc failures stay closed", async () => {
    assert.equal(createJourneyStore("bearer-token-16xxxx"), null);
    process.env.VERCEL_ENV = "production";
    process.env.BOOTSTRAP_SUPABASE_URL = "https://example.supabase.co";
    process.env.BOOTSTRAP_SUPABASE_ANON_KEY = "anon-key";
    const store = createJourneyStore("bearer-token-16xxxx");
    assert.equal(store?.kind, "supabase");
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response("nope", { status: 500 });
    try {
      const ivelin = actor("founder@example.test");
      const got = await store.getJourney(ivelin, { companySlug: "alpha" });
      assert.equal(got.ok, false);
      const put = await store.putJourney(ivelin, { companySlug: "alpha", why: "x", founderYes: true });
      assert.equal(put.ok, false);
      const comment = await store.postComment(ivelin, { companySlug: "alpha", body: "x" });
      assert.equal(comment.ok, false);
    } finally {
      globalThis.fetch = orig;
      delete process.env.VERCEL_ENV;
      delete process.env.BOOTSTRAP_SUPABASE_URL;
      delete process.env.BOOTSTRAP_SUPABASE_ANON_KEY;
    }
  });
});
