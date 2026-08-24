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
import { buildEvidencePayloadDigest, buildTargetBindingDigest } from "../scripts/evidence-validation";

describe("analysis core", () => {
  it("classifies a fully evidenced control as Evidence Sufficient", () => {
    expect(calculateStatus(["a", "b"], ["a", "b"])).toBe("Evidence Sufficient");
  });

  it("classifies a partially evidenced control as Evidence Partial", () => {
    expect(calculateStatus(["a", "b"], ["a"])).toBe("Evidence Partial");
  });

  it("classifies a control with no evidence as Evidence Gap", () => {
    expect(calculateStatus(["a", "b"], [])).toBe("Evidence Gap");
  });

  it("assigns Low risk to evidence-sufficient states", () => {
    expect(calculateRisk("Evidence Sufficient", "AI Governance")).toBe("Low");
  });

  it("assigns High risk to high-risk domain gaps", () => {
    expect(calculateRisk("Evidence Gap", "AI Governance")).toBe("High");
    expect(calculateRisk("Evidence Gap", "Privacy and Data Protection")).toBe("High");
    expect(calculateRisk("Evidence Gap", "Cloud Security")).toBe("High");
  });

  it("assigns Medium risk to non-high-risk domain gaps", () => {
    expect(calculateRisk("Evidence Gap", "Application Security")).toBe("Medium");
  });

  it("assesses control evidence correctly", () => {
    const control: Control = {
      id: "TEST-001",
      domain: "Application Security",
      title: "Test control",
      frameworks: ["OWASP"],
      expectedEvidence: ["security_policy_exists", "risk_management_process_defined"]
    };

    const evidence: Evidence[] = [
      {
        key: "security_policy_exists",
        present: true,
        source: "manual/security-review",
        notes: "present"
      },
      {
        key: "risk_management_process_defined",
        present: false,
        source: "manual/security-review",
        notes: "missing"
      }
    ];

    const finding = assessControl(control, evidence);

    expect(finding.controlId).toBe("TEST-001");
    expect(finding.status).toBe("Evidence Partial");
    expect(finding.foundEvidence).toEqual(["security_policy_exists"]);
    expect(finding.missingEvidence).toEqual(["risk_management_process_defined"]);
  });

  it("denies external operational evidence that omits its external target", () => {
    const control: Control = {
      id: "LOG-001",
      domain: "Logging and Monitoring",
      title: "Security-relevant events are logged and monitored",
      frameworks: ["NIST CSF 2.0"],
      expectedEvidence: ["cloud_audit_logs_enabled"]
    };
    const evidence: Evidence[] = [{
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "cloud-provider/audit-logs",
      notes: "adversarial fixture; not operational evidence",
      status: "observed"
    }];

    const finding = assessControl(control, evidence);

    expect(finding.status).toBe("Evidence Gap");
    expect(finding.risk).toBe("High");
    expect(finding.foundEvidence).toEqual([]);
  });

  it("fails closed end-to-end for invalid primitives and arbitrary external status", () => {
    const repositoryControl: Control = {
      id: "SDLC-X", domain: "Secure Software Development", title: "Repository control",
      frameworks: [], expectedEvidence: ["security_policy_exists"]
    };
    expect(assessControl(repositoryControl, [{
      key: "security_policy_exists", present: "false", source: "SECURITY.md",
      notes: "synthetic invalid primitive fixture"
    }] as unknown as Evidence[]).status).toBe("Evidence Gap");

    const target = {
      provider: "aws" as const,
      scopeId: "123456789012",
      productBindingSignals: ["product:guardian", "environment:production"]
    };
    const payload = "synthetic external assessment fixture";
    const digest = buildEvidencePayloadDigest(payload);
    const bindingDigest = buildTargetBindingDigest(target, "production");
    const evidence = {
      key: "cloud_audit_logs_enabled", present: "false", source: "provider-api",
      notes: "synthetic invalid external fixture", status: "attacker_defined",
      verification_method: "read-only provider API fixture",
      integrity: { algorithm: "sha256", digest }, integrity_payload: payload,
      external_target: target, collected_at: "2026-08-23T08:00:00Z", environment: "production",
      collector_version: "1.0.0", collection_context_id: "ctx", target_fingerprint: "fp",
      binding_digest: bindingDigest
    };
    const context = {
      evidenceKey: "cloud_audit_logs_enabled", collectionContextId: "ctx", provider: "aws" as const,
      environment: "production", targetFingerprint: "fp", bindingDigest,
      collectorVersion: "1.0.0", expectedPayloadDigest: digest
    };
    const externalControl: Control = {
      id: "LOG-X", domain: "Logging and Monitoring", title: "External control",
      frameworks: [], expectedEvidence: ["cloud_audit_logs_enabled"]
    };
    expect(assessControl(externalControl, [evidence] as unknown as Evidence[], {
      cloud_audit_logs_enabled: context
    }).status).toBe("Evidence Gap");
  });

  it("denies cross-key context and preserves complete matched external evidence", () => {
    const key = "cloud_audit_logs_enabled";
    const target = {
      provider: "aws" as const,
      scopeId: "123456789012",
      productBindingSignals: ["product:guardian", "environment:production"]
    };
    const payload = "synthetic complete external fixture";
    const digest = buildEvidencePayloadDigest(payload);
    const bindingDigest = buildTargetBindingDigest(target, "production");
    const evidence: Evidence = {
      key, present: true, source: "provider-api", notes: "synthetic; not operational evidence",
      status: "observed", verification_method: "read-only provider API fixture",
      integrity: { algorithm: "sha256", digest }, integrity_payload: payload,
      external_target: target, collected_at: new Date().toISOString(), environment: "production",
      collector_version: "1.0.0", collection_context_id: "ctx", target_fingerprint: "fp",
      binding_digest: bindingDigest
    };
    const control: Control = {
      id: "LOG-X", domain: "Logging and Monitoring", title: "External control",
      frameworks: [], expectedEvidence: [key]
    };
    const matched = {
      evidenceKey: key, collectionContextId: "ctx", provider: "aws" as const,
      environment: "production", targetFingerprint: "fp", bindingDigest,
      collectorVersion: "1.0.0", expectedPayloadDigest: digest
    };
    expect(assessControl(control, [evidence], { [key]: matched }).status).toBe("Evidence Sufficient");
    expect(assessControl(control, [evidence], {
      [key]: { ...matched, evidenceKey: "application_logs_enabled" }
    }).status).toBe("Evidence Gap");
  });

  it("builds summary correctly", () => {
    const findings = [
      {
        controlId: "A",
        domain: "Application Security",
        title: "A",
        frameworks: ["OWASP"],
        status: "Evidence Sufficient" as const,
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
        status: "Evidence Gap" as const,
        risk: "High" as const,
        foundEvidence: [],
        missingEvidence: ["x"],
        recommendation: "B"
      }
    ];

    const summary = buildSummary(findings);

    expect(summary.totalControls).toBe(2);
    expect(summary.evidenceSufficient).toBe(1);
    expect(summary.evidenceGaps).toBe(1);
    expect(summary.highRiskFindings).toBe(1);
    expect(summary.lowRiskFindings).toBe(1);
  });

  it("escapes CSV values with commas and quotes", () => {
    expect(csvEscape('hello, "world"')).toBe('"hello, ""world"""');
  });

  it.each(["=CMD()", "+1+1", "-2+3", "@SUM(A1:A2)"])(
    "neutralizes spreadsheet formula input %s", value => {
      expect(csvEscape(value).startsWith("'")).toBe(true);
    }
  );

  it("generates CSV output", () => {
    const csv = generateCsv([
      {
        controlId: "TEST-001",
        domain: "Application Security",
        title: "Test control",
        frameworks: ["OWASP"],
        status: "Evidence Partial",
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
