import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateExternalAsk, isPhaseAdvanceAllowed } from "../dist/policy.js";

describe("evaluateExternalAsk", () => {
  it("blocks when status is unknown", () => {
    const d = evaluateExternalAsk({ readyStatus: "unknown", intent: "mentor beta email" });
    assert.equal(d.allow, false);
    assert.match(d.reason, /not green/i);
    assert.ok(d.nextSteps?.length);
  });

  it("blocks when status is blocked", () => {
    const d = evaluateExternalAsk({
      readyStatus: "blocked",
      intent: "try my link",
      blockers: ["cold URL 404"],
    });
    assert.equal(d.allow, false);
  });

  it("allows when green (not demand/PMF claim)", () => {
    const d = evaluateExternalAsk({ readyStatus: "green", intent: "mentor beta" });
    assert.equal(d.allow, true);
    assert.match(d.reason, /not demand/i);
  });

  it("allows with founder override when not green", () => {
    const d = evaluateExternalAsk({
      readyStatus: "unknown",
      intent: "override ask",
      founderOverride: true,
    });
    assert.equal(d.allow, true);
    assert.match(d.reason, /override/i);
  });
});

describe("isPhaseAdvanceAllowed", () => {
  it("requires explicit true", () => {
    assert.equal(isPhaseAdvanceAllowed(undefined), false);
    assert.equal(isPhaseAdvanceAllowed(false), false);
    assert.equal(isPhaseAdvanceAllowed(true), true);
  });
});
