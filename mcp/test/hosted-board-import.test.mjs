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
  it("charlie and bravo clocks match local json; alpha is Hold note not README Beta", () => {
    const bySlug = Object.fromEntries(fixture.companies.map((c) => [c.slug, c]));
    assert.equal(bySlug.charlie.journeyPhase, 6);
    assert.equal(bySlug.charlie.loopStage, 6);
    assert.equal(bySlug.charlie.currentGate, "hold");
    assert.equal(bySlug.charlie.gateStatusInFile, "open");
    assert.equal(bySlug.bravo.journeyPhase, 6);
    assert.equal(bySlug.bravo.loopStage, 4);
    assert.equal(bySlug.bravo.currentGate, "hold");
    assert.equal(bySlug.alpha.journeyPhase, 1);
    assert.equal(bySlug.alpha.loopStage, 1);
    assert.doesNotMatch(JSON.stringify(bySlug.alpha), /Beta/i);
    assert.match(bySlug.alpha.scoreboard.constraint_this_week, /tangible/);
    assert.equal(bySlug.alpha.events[0].at, "2026-08-06T21:27:49.000Z");
    assert.equal(bySlug.charlie.events.length, 3);
    assert.equal(bySlug.bravo.events.length, 0);
  });
});
