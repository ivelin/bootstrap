import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(here, "..", "docs", "hosted-board-import.json"), "utf8"),
);

describe("hosted-board-import.json copies local files only", () => {
  it("pirin and totbox clocks match local json; zk0 is Hold note not README Beta", () => {
    const bySlug = Object.fromEntries(fixture.companies.map((c) => [c.slug, c]));
    assert.equal(bySlug.pirin.journeyPhase, 6);
    assert.equal(bySlug.pirin.loopStage, 6);
    assert.equal(bySlug.pirin.currentGate, "hold");
    assert.equal(bySlug.pirin.gateStatusInFile, "open");
    assert.equal(bySlug.totbox.journeyPhase, 6);
    assert.equal(bySlug.totbox.loopStage, 4);
    assert.equal(bySlug.totbox.currentGate, "hold");
    assert.equal(bySlug.zk0.journeyPhase, 1);
    assert.equal(bySlug.zk0.loopStage, 1);
    assert.doesNotMatch(JSON.stringify(bySlug.zk0), /Beta|FedProx|SmolVLA/i);
    assert.match(bySlug.zk0.scoreboard.constraint_this_week, /tangible/);
    assert.equal(bySlug.zk0.events[0].at, "2026-08-06T21:27:49.000Z");
    assert.equal(bySlug.pirin.events.length, 3);
    assert.equal(bySlug.totbox.events.length, 0);
  });
});
