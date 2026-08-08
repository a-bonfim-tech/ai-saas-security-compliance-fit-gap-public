import { describe, expect, it } from "vitest";
import {
  assessControl,
  buildSummary,
  calculateRisk,
  calculateStatus,
  csvEscape,
  generateCsv,
  type Control,
  type Evidence
} from "../scripts/analysis-core";

describe("analysis core", () => {
  it("classifies a fully evidenced control as Compliant", () => {
    expect(calculateStatus(["a", "b"], ["a", "b"])).toBe("Compliant");
  });

  it("classifies a partially evidenced control as Partial", () => {
    expect(calculateStatus(["a", "b"], ["a"])).toBe("Partial");
  });

  it("classifies a control with no evidence as Gap", () => {
    expect(calculateStatus(["a", "b"], [])).toBe("Gap");
  });

  it("assigns Low risk to compliant controls", () => {
    expect(calculateRisk("Compliant", "AI Governance")).toBe("Low");
  });

  it("assigns High risk to high-risk domain gaps", () => {
    expect(calculateRisk("Gap", "AI Governance")).toBe("High");
    expect(calculateRisk("Gap", "Privacy and Data Protection")).toBe("High");
    expect(calculateRisk("Gap", "Cloud Security")).toBe("High");
  });

  it("assigns Medium risk to non-high-risk domain gaps", () => {
    expect(calculateRisk("Gap", "Application Security")).toBe("Medium");
  });

  it("assesses control evidence correctly", () => {
    const control: Control = {
      id: "TEST-001",
      domain: "Application Security",
      title: "Test control",
      frameworks: ["OWASP"],
      expectedEvidence: ["a", "b"]
    };

    const evidence: Evidence[] = [
      {
        key: "a",
        present: true,
        source: "test",
        notes: "present"
      },
      {
        key: "b",
        present: false,
        source: "test",
        notes: "missing"
      }
    ];

    const finding = assessControl(control, evidence);

    expect(finding.controlId).toBe("TEST-001");
    expect(finding.status).toBe("Partial");
    expect(finding.foundEvidence).toEqual(["a"]);
    expect(finding.missingEvidence).toEqual(["b"]);
  });

  it("builds summary correctly", () => {
    const findings = [
      {
        controlId: "A",
        domain: "Application Security",
        title: "A",
        frameworks: ["OWASP"],
        status: "Compliant" as const,
        risk: "Low" as const,
        foundEvidence: [],
        missingEvidence: [],
        recommendation: "A"
      },
      {
        controlId: "B",
        domain: "AI Governance",
        title: "B",
        frameworks: ["EU AI Act"],
        status: "Gap" as const,
        risk: "High" as const,
        foundEvidence: [],
        missingEvidence: ["x"],
        recommendation: "B"
      }
    ];

    const summary = buildSummary(findings);

    expect(summary.totalControls).toBe(2);
    expect(summary.compliant).toBe(1);
    expect(summary.gaps).toBe(1);
    expect(summary.highRiskFindings).toBe(1);
    expect(summary.lowRiskFindings).toBe(1);
  });

  it("escapes CSV values with commas and quotes", () => {
    expect(csvEscape('hello, "world"')).toBe('"hello, ""world"""');
  });

  it("generates CSV output", () => {
    const csv = generateCsv([
      {
        controlId: "TEST-001",
        domain: "Application Security",
        title: "Test control",
        frameworks: ["OWASP"],
        status: "Partial",
        risk: "Medium",
        foundEvidence: ["a"],
        missingEvidence: ["b"],
        recommendation: "Fix b"
      }
    ]);

    expect(csv).toContain("control_id,domain,title");
    expect(csv).toContain("TEST-001");
  });
});
