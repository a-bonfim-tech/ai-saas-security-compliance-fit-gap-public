import { describe, expect, it } from "vitest";
import { evaluateEvidenceInvariants } from "../scripts/final-project-audit";

describe("final audit evidence invariants", () => {
  const stale = { key: "runtime", present: true, source: "provider-api", notes: "synthetic stale fixture", status: "unverified", external_target: { provider: "aws" as const, scopeId: "123456789012", productBindingSignals: ["product:guardian", "environment:production"] }, collected_at: "2020-01-01T00:00:00Z" };

  it.each(["unverified", "superseded", "stale", "expired"])("allows persisted %s evidence when it supports no control", status => {
    expect(evaluateEvidenceInvariants([{ ...stale, status }], [{ status: "Evidence Gap", foundEvidence: [] }]).passed).toBe(true);
  });

  it("fails when non-promotable evidence supports a control", () => {
    expect(evaluateEvidenceInvariants([stale], [{ status: "Evidence Sufficient", foundEvidence: ["runtime"] }]).passed).toBe(false);
  });

  it("fails a sufficient claim without supporting evidence", () => {
    expect(evaluateEvidenceInvariants([], [{ status: "Evidence Sufficient", foundEvidence: [] }]).passed).toBe(false);
  });

  it("allows valid promotable evidence to support a control", () => {
    const evidence = { key: "risk_management_process_defined", present: true, source: "manual/security-review", status: "observed", notes: "reviewed" };
    expect(evaluateEvidenceInvariants([evidence], [{ status: "Evidence Sufficient", foundEvidence: ["risk_management_process_defined"] }]).passed).toBe(true);
  });
});
