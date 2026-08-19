import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_RULE_LINES,
  weighResearchInputs,
  spokenYesMayPromote,
  demographicOneLinerIsValidSeed,
  likertOrNakedDollarWtpAllowed,
  marketingVolumeMayPromote,
} from "../dist/house-rules.js";
import { PHASE_GATES, STAGE_GATES } from "../dist/gates.js";

describe("OS 2.8.6 house rules (adapter reminders)", () => {
  it("pins stated / synthetic / observed, observed wins, spoken yes, seed, Likert, marketing volume", () => {
    const blob = HOUSE_RULE_LINES.join("\n");
    assert.match(blob, /stated, synthetic, and observed/i);
    assert.match(blob, /observed wins/i);
    assert.match(blob, /spoken yes cannot promote/i);
    assert.match(blob, /demographic one-liner/i);
    assert.match(blob, /demo-only role-play is the weak case/i);
    assert.match(blob, /Likert/i);
    assert.match(blob, /naked dollar WTP/i);
    assert.match(blob, /then map/i);
    assert.match(blob, /Several ideas are allowed/);
    assert.match(blob, /Do not hide a second idea/);
    assert.match(blob, /Rank and kill per board/);
    assert.match(blob, /Marketing volume cannot promote/);
    assert.match(blob, /public launch week/);
    assert.match(blob, /Observed use or pay can/);
  });

  it("observed wins a clash; spoken yes / synthetic cannot promote", () => {
    const clash = weighResearchInputs({ stated: true, synthetic: true, observed: true });
    assert.equal(clash.winner, "observed");
    assert.equal(clash.mayPromote, true);

    const spoken = weighResearchInputs({ stated: true });
    assert.equal(spoken.winner, "stated");
    assert.equal(spoken.mayPromote, false);

    const syn = weighResearchInputs({ synthetic: true });
    assert.equal(syn.winner, "synthetic");
    assert.equal(syn.mayPromote, false);

    assert.equal(spokenYesMayPromote(), false);
    assert.equal(demographicOneLinerIsValidSeed(), false);
    assert.equal(likertOrNakedDollarWtpAllowed(), false);
    assert.equal(marketingVolumeMayPromote(), false);
  });

  it("phase 4 / 7 / 9 gates refuse marketing volume as evidence", () => {
    const p4 = PHASE_GATES[4].doNotCountAsEvidence.join("\n");
    const p7 = PHASE_GATES[7].doNotCountAsEvidence.join("\n");
    const p9 = PHASE_GATES[9].doNotCountAsEvidence.join("\n");
    assert.match(p4, /Marketing volume/i);
    assert.match(p4, /public launch week/i);
    assert.match(p7, /Impressions/i);
    assert.match(p7, /potential buyers/i);
    assert.match(p9, /Marketing volume before proof/i);
  });

  it("phase 3 / stage 1 gates refuse demo-only seed, spoken yes, Likert WTP", () => {
    const p3 = PHASE_GATES[3];
    const traps = p3.doNotCountAsEvidence.join("\n");
    assert.match(traps, /demographic one-liner/i);
    assert.match(traps, /Spoken yes/i);
    assert.match(traps, /Likert/i);
    assert.match(p3.evidenceToAdvance.map((e) => e.howToGather).join("\n"), /traces/i);
    assert.equal(p3.evidenceToAdvance[0].researchInputHint, "synthetic");

    const s1 = STAGE_GATES[1];
    assert.equal(s1.evidenceThisStage[0].researchInputHint, "synthetic");
    assert.match(s1.evidenceThisStage[0].howToGather, /then map/i);
  });
});
