import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeTempEnv, rmrf } from "./helpers.mjs";
import {
  initCompany,
  useCompany,
  clearSession,
  listCompanies,
  slugifyCompanyId,
} from "../dist/companies.js";
import { patchState, readState } from "../dist/state.js";

describe("multi-company isolation", () => {
  let dataRoot;

  beforeEach(() => {
    dataRoot = makeTempEnv();
    clearSession();
  });

  afterEach(() => {
    clearSession();
    rmrf(dataRoot);
  });

  it("slugifyCompanyId normalizes ids", () => {
    assert.equal(slugifyCompanyId("  My Co! "), "my-co");
    assert.throws(() => slugifyCompanyId("!!!"), /letters or numbers/);
  });

  it("init + use keeps separate state files", () => {
    initCompany({ companyId: "pirin", hypothesis: "A" });
    initCompany({ companyId: "zk0", hypothesis: "B", activate: false });
    initCompany({ companyId: "tokbox", hypothesis: "C", activate: false });

    useCompany("pirin");
    patchState({ journeyPhase: 5 }, { allowPhaseAdvance: true });
    assert.equal(readState().journeyPhase, 5);
    assert.equal(readState().companyId, "pirin");

    useCompany("zk0");
    assert.equal(readState().journeyPhase, 1);
    assert.equal(readState().companyId, "zk0");
    assert.equal(readState().hypothesis, "B");

    useCompany("tokbox");
    assert.equal(readState().journeyPhase, 1);

    // pirin still 5 on disk
    const pirinState = JSON.parse(
      fs.readFileSync(
        path.join(dataRoot, "instances", "pirin", "company", "state", "company-state.json"),
        "utf8",
      ),
    );
    assert.equal(pirinState.journeyPhase, 5);

    const listed = listCompanies();
    assert.equal(listed.companies.length, 3);
    assert.equal(listed.activeCompanyId, "tokbox");
    const pirin = listed.companies.find((c) => c.companyId === "pirin");
    assert.equal(pirin.journeyPhase, 5);
  });

  it("useCompany fails for unknown company", () => {
    assert.throws(() => useCompany("nope"), /Unknown company/);
  });

  it("init is idempotent and does not wipe state", () => {
    initCompany({ companyId: "pirin" });
    patchState({ journeyPhase: 4 }, { allowPhaseAdvance: true });
    const again = initCompany({ companyId: "pirin" });
    assert.equal(again.created, false);
    assert.equal(readState().journeyPhase, 4);
  });
});
