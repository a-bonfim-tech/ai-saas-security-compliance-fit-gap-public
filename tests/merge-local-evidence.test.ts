import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergeEvidenceBatch, sourceIdentity, transitionEvidence, type MergeableEvidence } from "../scripts/evidence-merge";
import { assessControl, type Control, type Evidence } from "../scripts/analysis-core";
import { buildEvidencePayloadDigest, buildTargetBindingDigest } from "../scripts/evidence-validation";

function evidence(present: boolean, timestamp: string, overrides: Partial<MergeableEvidence> = {}): MergeableEvidence {
  return {
    key: "control_evidence",
    present,
    source: "collector/source",
    notes: present ? "confirmed" : "not confirmed",
    provenance: {
      assessment_repository: "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository: "a-bonfim-tech/source",
      source_collected_at: timestamp,
      source_collector: "test-collector"
    },
    ...overrides
  };
}

describe("authoritative evidence transition", () => {
  it.each([
    [true, false, "2026-08-23T00:00:00Z", "2026-08-24T00:00:00Z", false],
    [false, true, "2026-08-23T00:00:00Z", "2026-08-24T00:00:00Z", true],
    [true, false, "2026-08-24T00:00:00Z", "2026-08-23T00:00:00Z", true],
    [false, true, "2026-08-24T00:00:00Z", "2026-08-23T00:00:00Z", false]
  ])("orders state transitions by authoritative collection time", (oldState, newState, oldTime, newTime, expected) => {
    expect(transitionEvidence(evidence(oldState, oldTime), evidence(newState, newTime)).present).toBe(expected);
  });

  it("is byte-idempotent for an identical observation", () => {
    const item = evidence(true, "2026-08-24T00:00:00Z");
    expect(JSON.stringify(transitionEvidence(item, structuredClone(item)))).toBe(JSON.stringify(item));
  });

  it("rejects same-time value or metadata conflicts", () => {
    const old = evidence(true, "2026-08-24T00:00:00Z");
    expect(() => transitionEvidence(old, evidence(false, "2026-08-24T00:00:00Z"))).toThrow(/same timestamp/);
    expect(() => transitionEvidence(old, evidence(true, "2026-08-24T00:00:00Z", { notes: "different" }))).toThrow(/same timestamp/);
  });

  it("rejects different repository authorities and unrelated acquisition paths", () => {
    const old = evidence(true, "2026-08-23T00:00:00Z");
    expect(() => transitionEvidence(old, evidence(false, "2026-08-24T00:00:00Z", {
      provenance: { ...old.provenance!, source_repository: "a-bonfim-tech/other", source_collected_at: "2026-08-24T00:00:00Z" }
    }))).toThrow(/Conflicting authoritative sources/);
    expect(() => transitionEvidence(old, evidence(false, "2026-08-24T00:00:00Z", { source: "other/acquisition/path" }))).toThrow(/Conflicting authoritative sources/);
  });

  it.each([undefined, "not-a-timestamp"])("rejects missing or invalid timestamp: %s", source_collected_at => {
    const incoming = evidence(false, "2026-08-24T00:00:00Z");
    if (source_collected_at === undefined) delete (incoming.provenance as any).source_collected_at;
    else incoming.provenance!.source_collected_at = source_collected_at;
    expect(() => transitionEvidence(evidence(true, "2026-08-23T00:00:00Z"), incoming)).toThrow();
  });

  it.each([
    "2026-02-29T00:00:00Z", "2026-02-30T00:00:00Z", "2026-04-31T00:00:00Z",
    "2026-13-01T00:00:00Z", "2026-00-01T00:00:00Z", "2026-01-32T00:00:00Z",
    "2026-01-01T24:01:00Z", "2026-01-01T12:60:00Z", "2026-01-01T12:00:60Z",
    "2026-01-01T12:00:00", "2026-01-01T12:00:00Zjunk"
  ])("rejects calendar-invalid authoritative timestamp %s", timestamp => {
    expect(() => transitionEvidence(evidence(true, "2026-01-01T00:00:00Z"), evidence(false, timestamp))).toThrow(/Invalid authoritative timestamp/);
  });

  it.each([
    "2026-02-28T00:00:00Z", "2024-02-29T00:00:00Z",
    "2026-01-31T23:59:59Z", "2026-08-24T10:30:00+01:00"
  ])("accepts valid authoritative timestamp %s", timestamp => {
    expect(transitionEvidence(evidence(false, "2024-01-01T00:00:00Z"), evidence(true, timestamp)).present).toBe(true);
  });

  it("treats equivalent offset timestamps as the same instant", () => {
    const utc = evidence(true, "2026-08-24T09:30:00Z");
    const offset = evidence(true, "2026-08-24T10:30:00+01:00");
    expect(transitionEvidence(utc, offset)).toBe(utc);
  });

  it("rejects state changes without existing provenance", () => {
    const old = { ...evidence(true, "2026-08-23T00:00:00Z"), provenance: undefined };
    expect(() => transitionEvidence(old, evidence(false, "2026-08-24T00:00:00Z"))).toThrow(/lacks existing provenance/);
  });

  it("validates the complete batch before any caller can write", () => {
    const base = [evidence(false, "2026-08-23T00:00:00Z")];
    const valid = evidence(true, "2026-08-24T00:00:00Z");
    const invalid = evidence(false, "invalid", { key: "second" });
    expect(() => mergeEvidenceBatch(base, [valid, invalid])).toThrow();
    expect(base[0].present).toBe(false);
  });

  it("rejects a mixed batch containing a calendar-impossible timestamp atomically", () => {
    const base = [evidence(false, "2026-01-01T00:00:00Z")];
    const before = JSON.stringify(base);
    expect(() => mergeEvidenceBatch(base, [
      evidence(true, "2026-02-28T00:00:00Z"),
      evidence(false, "2026-02-30T00:00:00Z", { key: "invalid_second" })
    ])).toThrow(/Invalid authoritative timestamp/);
    expect(JSON.stringify(base)).toBe(before);
  });

  it("preserves provenance from the selected current observation", () => {
    const selected = transitionEvidence(evidence(true, "2026-08-23T00:00:00Z"), evidence(false, "2026-08-24T00:00:00Z"));
    expect(selected.provenance?.source_collected_at).toBe("2026-08-24T00:00:00Z");
  });

  it.each([
    ["classic to ruleset", "gh api repos/a-bonfim-tech/source/branches/main/protection", "gh api repos/a-bonfim-tech/source/rulesets"],
    ["ruleset to classic", "gh api repos/a-bonfim-tech/source/rulesets", "gh api repos/a-bonfim-tech/source/branches/main/protection"]
  ])("keeps authority identity stable from %s while preserving acquisition provenance", (_direction, oldSource, newSource) => {
    const existing = evidence(true, "2026-08-23T00:00:00Z", { key: "branch_protection_enabled", source: oldSource });
    const incoming = evidence(false, "2026-08-24T00:00:00Z", { key: "branch_protection_enabled", source: newSource });
    expect(sourceIdentity(existing)).toBe(sourceIdentity(incoming));
    const selected = transitionEvidence(existing, incoming);
    expect(selected.present).toBe(false);
    expect(selected.source).toBe(newSource);
  });

  it.each([
    ["AUD-002", "IAM-001", "mfa_enabled", "Identity and Access Management"],
    ["AUD-005", "LOG-001", "cloud_audit_logs_enabled", "Logging and Monitoring"]
  ])("keeps canonical %s runtime control unverified after revocation", (auditId, controlId, key, domain) => {
    const target = { provider: "aws" as const, scopeId: "123456789012", productBindingSignals: ["product:guardian", "environment:production"] };
    const payload = "synthetic authoritative regression fixture";
    const digest = buildEvidencePayloadDigest(payload);
    const bindingDigest = buildTargetBindingDigest(target, "production");
    const external = (present: boolean, timestamp: string): MergeableEvidence => ({
      ...evidence(present, timestamp, { key, source: "provider-api" }), status: "observed",
      verification_method: "read-only provider API fixture", integrity: { algorithm: "sha256", digest },
      integrity_payload: payload, external_target: target, collected_at: "2026-08-24T08:00:00Z",
      environment: "production", collector_version: "1.0.0", collection_context_id: "ctx",
      target_fingerprint: "fp", binding_digest: bindingDigest
    });
    const revoked = transitionEvidence(external(true, "2026-08-23T00:00:00Z"), external(false, "2026-08-24T00:00:00Z"));
    const control: Control = { id: controlId, domain, title: "Canonical runtime control", frameworks: [], expectedEvidence: [key] };
    const context = { evidenceKey: key, collectionContextId: "ctx", provider: "aws" as const, environment: "production", targetFingerprint: "fp", bindingDigest, collectorVersion: "1.0.0", expectedPayloadDigest: digest };
    expect(assessControl(control, [revoked as Evidence], { [key]: context })).toMatchObject({ status: "Evidence Gap", foundEvidence: [] });
    const audit = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/audit/canonical-security-portfolio-audit.json"), "utf8"));
    expect(audit.administrative_reconciliation.dispositions[auditId].technical_control_status).toBe("unverified");
  });

  it("applies revocation through the real local merge path", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "local-evidence-revoke-"));
    fs.mkdirSync(path.join(root, "evidence/github"), { recursive: true });
    fs.writeFileSync(path.join(root, "evidence/evidence-register.json"), JSON.stringify([
      evidence(true, "2026-08-23T00:00:00Z", {
        source: "SECURITY.md",
        provenance: {
          assessment_repository: "a-bonfim-tech/canonical-repository",
          source_repository: "a-bonfim-tech/canonical-repository",
          source_collected_at: "2026-08-23T00:00:00Z",
          source_collector: "github-local-evidence-collector"
        }
      })
    ], null, 2));
    fs.writeFileSync(path.join(root, "evidence/github/github-local-evidence.json"), JSON.stringify({
      repositoryPath: ".",
      collectedAt: "2026-08-24T00:00:00Z",
      collector: "github-local-evidence-collector",
      evidence: [{ key: "control_evidence", present: false, source: "SECURITY.md", notes: "removed" }]
    }, null, 2));
    spawnSync("git", ["init", "-q"], { cwd: root });
    spawnSync("git", ["remote", "add", "origin", "https://github.com/a-bonfim-tech/canonical-repository.git"], { cwd: root });
    const script = path.join(process.cwd(), "scripts/merge-local-evidence.ts");
    const loader = path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs");
    const result = spawnSync(process.execPath, ["--import", loader, script], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    const [merged] = JSON.parse(fs.readFileSync(path.join(root, "evidence/evidence-register.json"), "utf8"));
    expect(merged.present).toBe(false);
    expect(merged.provenance.assessment_repository).toBe("a-bonfim-tech/canonical-repository");
    expect(merged.provenance.source_repository).toBe("a-bonfim-tech/canonical-repository");
    expect(JSON.stringify(merged.provenance)).not.toContain(root);
  });

  it("derives stable and distinct repository identities independently of checkout paths", () => {
    const runFixture = (root: string, origin: string) => {
      fs.mkdirSync(path.join(root, "evidence/github"), { recursive: true });
      fs.writeFileSync(path.join(root, "evidence/evidence-register.json"), "[]");
      fs.writeFileSync(path.join(root, "evidence/github/github-local-evidence.json"), JSON.stringify({
        repositoryPath: root, collectedAt: "2026-08-24T00:00:00Z", collector: "github-local-evidence-collector",
        evidence: [{ key: "security_policy_exists", present: true, source: "SECURITY.md", notes: "present" }]
      }));
      spawnSync("git", ["init", "-q"], { cwd: root });
      spawnSync("git", ["remote", "add", "origin", origin], { cwd: root });
      const script = path.join(process.cwd(), "scripts/merge-local-evidence.ts");
      const loader = path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs");
      const result = spawnSync(process.execPath, ["--import", loader, script], { cwd: root, encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      return JSON.parse(fs.readFileSync(path.join(root, "evidence/evidence-register.json"), "utf8"))[0].provenance.assessment_repository;
    };
    const parentA = fs.mkdtempSync(path.join(os.tmpdir(), "identity-a-"));
    const parentB = fs.mkdtempSync(path.join(os.tmpdir(), "identity-b-"));
    const checkoutA = path.join(parentA, "same-name");
    const checkoutB = path.join(parentB, "same-name");
    fs.mkdirSync(checkoutA); fs.mkdirSync(checkoutB);
    expect(runFixture(checkoutA, "https://github.com/acme/shared.git")).toBe("acme/shared");
    expect(runFixture(checkoutB, "git@github.com:acme/shared.git")).toBe("acme/shared");
    const checkoutC = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "identity-c-")), "same-name");
    fs.mkdirSync(checkoutC);
    expect(runFixture(checkoutC, "https://github.com/other/different.git")).toBe("other/different");
  });

  it("rejects an indeterminable repository identity before writing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "identity-reject-"));
    fs.mkdirSync(path.join(root, "evidence/github"), { recursive: true });
    fs.writeFileSync(path.join(root, "evidence/evidence-register.json"), "[]");
    fs.writeFileSync(path.join(root, "evidence/github/github-local-evidence.json"), JSON.stringify({
      repositoryPath: ".", collectedAt: "2026-08-24T00:00:00Z", collector: "github-local-evidence-collector",
      evidence: [{ key: "security_policy_exists", present: true, source: "SECURITY.md", notes: "present" }]
    }));
    spawnSync("git", ["init", "-q"], { cwd: root });
    spawnSync("git", ["remote", "add", "origin", "https://example.com/acme/repo.git"], { cwd: root });
    const before = fs.readFileSync(path.join(root, "evidence/evidence-register.json"));
    const result = spawnSync(process.execPath, ["--import", path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs"), path.join(process.cwd(), "scripts/merge-local-evidence.ts")], { cwd: root });
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(path.join(root, "evidence/evidence-register.json")).equals(before)).toBe(true);
  });
});
