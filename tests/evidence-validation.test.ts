import { describe, expect, it } from "vitest";
import {
  isArtificialValue,
  isPromotableEvidence,
  isValidDomain,
  isValidPublicHttpsUrl,
  buildTargetBindingDigest,
  buildEvidencePayloadDigest,
  calculateFreshness,
  validateCollectionContext,
  validateExternalTarget,
  type ExternalTarget
} from "../scripts/evidence-validation";

const awsTarget = (overrides: Partial<ExternalTarget> = {}): ExternalTarget => ({
  provider: "aws",
  scopeId: "123456789012",
  endpoint: "https://audit.acme-security.de/events",
  region: "eu-central-1",
  productBindingSignals: ["product:guardian", "environment:production"],
  ...overrides
});

function completeExternalFixture(key = "cloud_audit_logs_enabled") {
  const target = awsTarget();
  const payload = `synthetic-payload:${key}`;
  const digest = buildEvidencePayloadDigest(payload);
  const bindingDigest = buildTargetBindingDigest(target, "production");
  return {
    evidence: {
      key,
      present: true,
      source: "provider-api",
      notes: "synthetic external fixture; not operational evidence",
      status: "observed",
      verification_method: "read-only provider API fixture",
      integrity: { algorithm: "sha256", digest },
      integrity_payload: payload,
      external_target: target,
      collected_at: "2026-08-23T08:00:00Z",
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: `context:${key}`,
      target_fingerprint: "aws:123456789012:guardian",
      binding_digest: bindingDigest
    },
    expectedContext: {
      evidenceKey: key,
      collectionContextId: `context:${key}`,
      provider: "aws" as const,
      environment: "production",
      targetFingerprint: "aws:123456789012:guardian",
      bindingDigest,
      collectorVersion: "1.0.0",
      expectedPayloadDigest: digest
    }
  };
}

describe("external evidence validation", () => {
  it.each(["", "REAL", "VALOR_REAL", "OWNER_OU_EQUIPE_REAL", "service-demo", "TBD", "N/A"])(
    "rejects artificial value %j", value => expect(isArtificialValue(value)).toBe(true)
  );

  it("distinguishes valid public endpoints and domains from reserved targets", () => {
    expect(isValidPublicHttpsUrl("https://audit.acme-security.de/events")).toBe(true);
    expect(isValidDomain("audit.acme-security.de")).toBe(true);
    expect(isValidPublicHttpsUrl("http://localhost:3000")).toBe(false);
    expect(isValidPublicHttpsUrl("https://example.com/logs")).toBe(false);
    expect(isValidDomain("example.com")).toBe(false);
  });

  it("accepts a syntactically valid AWS account target with correlated binding", () => {
    expect(validateExternalTarget(awsTarget())).toEqual({ valid: true, reasons: [] });
  });

  it("rejects false AWS IDs, invalid regions and incompatible providers", () => {
    expect(validateExternalTarget(awsTarget({ scopeId: "AWS_ACCOUNT_ID_REAL" })).valid).toBe(false);
    expect(validateExternalTarget(awsTarget({ scopeId: "12345" })).reasons).toContain("provider_scope_mismatch");
    expect(validateExternalTarget(awsTarget({ region: "eu-moon-1" })).reasons).toContain("invalid_aws_region");
    expect(validateExternalTarget({ ...awsTarget(), provider: "azure" }).reasons).toContain("provider_scope_mismatch");
  });

  it("rejects missing, partial and duplicated binding signals", () => {
    expect(validateExternalTarget(awsTarget({ productBindingSignals: [] })).reasons).toContain("insufficient_product_binding");
    expect(validateExternalTarget(awsTarget({ productBindingSignals: ["product:guardian"] })).reasons).toContain("insufficient_product_binding");
    expect(validateExternalTarget(awsTarget({ productBindingSignals: ["product:guardian", "product:guardian"] })).reasons).toContain("uncorrelated_product_binding");
  });

  it("does not promote documentation or unverified external evidence", () => {
    expect(isPromotableEvidence({ key: "security_policy_exists", present: true, source: "README.md", status: "documented" }).valid).toBe(false);
    expect(isPromotableEvidence({
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "cloud-provider/audit-logs",
      status: "unverified",
      external_target: awsTarget()
    }).valid).toBe(false);
  });

  it("promotes external evidence only against complete authoritative context and payload integrity", () => {
    const target = awsTarget();
    const environment = "production";
    const payload = '{"providerEvent":"confirmed"}';
    const authoritativeExpectedDigest = buildEvidencePayloadDigest(payload);
    const bindingDigest = buildTargetBindingDigest(target, environment);
    const evidence = {
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "evidence/runtime/audit-export.json",
      notes: "synthetic complete external fixture",
      status: "observed",
      verification_method: "read-only provider API export correlated to product and environment",
      integrity: { algorithm: "sha256", digest: authoritativeExpectedDigest },
      integrity_payload: payload,
      external_target: target,
      collected_at: "2026-08-23T08:00:00Z",
      environment,
      collector_version: "1.0.0",
      collection_context_id: "collection-20260823-01",
      target_fingerprint: "aws:123456789012:guardian",
      binding_digest: bindingDigest,
      repository_commit_sha: "a".repeat(40)
    };
    const expectedContext = { evidenceKey: "cloud_audit_logs_enabled", collectionContextId: "collection-20260823-01", provider: "aws" as const, environment, targetFingerprint: "aws:123456789012:guardian", bindingDigest, collectorVersion: "1.0.0", expectedPayloadDigest: authoritativeExpectedDigest, repositoryCommitSha: "a".repeat(40) };
    expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z"), expectedContext }).valid).toBe(true);
    expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z") }).reasons).toContain("context_not_provided");
    expect(isPromotableEvidence({ ...evidence, status: undefined }, { now: new Date("2026-08-23T09:00:00Z"), expectedContext }).reasons).toContain("missing_status");
    expect(isPromotableEvidence({ ...evidence, integrity: { algorithm: "md5", digest: buildEvidencePayloadDigest(payload) } }, { now: new Date("2026-08-23T09:00:00Z"), expectedContext }).valid).toBe(false);
    expect(isPromotableEvidence({ ...evidence, integrity: { algorithm: "sha256", digest: "a".repeat(64) } }, { now: new Date("2026-08-23T09:00:00Z"), expectedContext }).reasons).toContain("integrity_digest_mismatch");
    const contextWithoutExpectedDigest = { ...expectedContext, expectedPayloadDigest: undefined } as unknown as typeof expectedContext;
    expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z"), expectedContext: contextWithoutExpectedDigest }).reasons).toContain("expected_payload_digest_missing");
    expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z"), expectedContext: { ...expectedContext, expectedPayloadDigest: "not-a-sha256" } }).reasons).toContain("expected_payload_digest_invalid");
    expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z"), expectedContext: { ...expectedContext, expectedPayloadDigest: "b".repeat(64) } }).reasons).toContain("expected_payload_digest_mismatch");

    const attackerPayload = '{"providerEvent":"substituted"}';
    const replacedEvidence = {
      ...evidence,
      integrity_payload: attackerPayload,
      integrity: { algorithm: "sha256", digest: buildEvidencePayloadDigest(attackerPayload) }
    };
    expect(isPromotableEvidence(replacedEvidence, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext
    })).toMatchObject({ valid: false, reasons: expect.arrayContaining(["expected_payload_digest_mismatch"]) });
    for (const mismatch of [
      { expectedContext: { ...expectedContext, provider: "azure" as const }, reason: "provider_context_mismatch" },
      { expectedContext: { ...expectedContext, environment: "staging" }, reason: "environment_context_mismatch" },
      { expectedContext: { ...expectedContext, targetFingerprint: "different" }, reason: "target_fingerprint_mismatch" },
      { expectedContext: { ...expectedContext, bindingDigest: "b".repeat(64) }, reason: "binding_digest_context_mismatch" },
      { expectedContext: { ...expectedContext, repositoryCommitSha: "b".repeat(40) }, reason: "repository_commit_mismatch" }
    ]) expect(isPromotableEvidence(evidence, { now: new Date("2026-08-23T09:00:00Z"), expectedContext: mismatch.expectedContext }).reasons).toContain(mismatch.reason);
  });

  it.each([
    ["recent", "2026-08-23T08:00:00Z", "FRESH"],
    ["timezone", "2026-08-23T10:00:00+02:00", "FRESH"],
    ["stale", "2026-08-21T09:00:00Z", "STALE"],
    ["expired", "2026-08-01T09:00:00Z", "EXPIRED"],
    ["future", "2026-08-23T10:00:01Z", "CLOCK_SKEW_SUSPECTED"]
  ])("classifies %s timestamps deterministically", (_label, collectedAt, expected) => {
    expect(calculateFreshness({ external_target: awsTarget(), collected_at: collectedAt }, new Date("2026-08-23T09:00:00Z"))).toBe(expected);
  });

  it("handles missing timestamp and exact freshness boundary", () => {
    expect(calculateFreshness({ external_target: awsTarget() }, new Date("2026-08-23T09:00:00Z"))).toBe("TIMESTAMP_MISSING");
    expect(calculateFreshness(
      { external_target: awsTarget(), collected_at: "2026-08-22T09:00:00Z" },
      new Date("2026-08-23T09:00:00Z")
    )).toBe("FRESH");
  });

  it("rejects replay into a different environment, provider, target or context", () => {
    const target = awsTarget();
    const evidence = {
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "provider-api",
      notes: "synthetic replay fixture",
      external_target: target,
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: "context-a",
      target_fingerprint: "fingerprint-a",
      binding_digest: buildTargetBindingDigest(target, "production"),
      repository_commit_sha: "a".repeat(40)
    };
    expect(validateCollectionContext(evidence, {
      evidenceKey: "cloud_audit_logs_enabled",
      collectionContextId: "context-b",
      provider: "azure",
      environment: "staging",
      targetFingerprint: "fingerprint-b",
      bindingDigest: buildTargetBindingDigest(target, "staging"),
      collectorVersion: "2.0.0",
      expectedPayloadDigest: "a".repeat(64),
      repositoryCommitSha: "b".repeat(40)
    }).reasons).toEqual(expect.arrayContaining([
      "collection_context_mismatch", "provider_context_mismatch", "environment_context_mismatch",
      "target_fingerprint_mismatch", "repository_commit_mismatch"
    ]));
  });

  it("rejects a replayed binding digest after target mutation", () => {
    const original = awsTarget();
    expect(validateCollectionContext({
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "provider-api",
      notes: "synthetic target-mutation fixture",
      external_target: awsTarget({ scopeId: "999999999999" }),
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: "context-a",
      target_fingerprint: "fingerprint-a",
      binding_digest: buildTargetBindingDigest(original, "production")
    }, {
      evidenceKey: "cloud_audit_logs_enabled",
      collectionContextId: "context-a",
      provider: "aws",
      environment: "production",
      targetFingerprint: "fingerprint-a",
      bindingDigest: buildTargetBindingDigest(original, "production"),
      collectorVersion: "1.0.0",
      expectedPayloadDigest: "a".repeat(64)
    }).reasons).toContain("expected_binding_digest_invalid");
  });

  it("fails closed for unknown evidence requirements", () => {
    expect(isPromotableEvidence({
      key: "attacker_selected_unknown_key",
      present: true,
      source: "README.md",
      status: "implemented"
    }).reasons).toContain("unknown_evidence_requirement");
  });

  it("keeps known documentary and repository evidence legitimate without cloud targets", () => {
    expect(isPromotableEvidence({
      key: "risk_management_process_defined",
      present: true,
      source: "docs/risk-management.md",
      notes: "synthetic documentary fixture",
      status: "implemented"
    }).valid).toBe(true);
    expect(isPromotableEvidence({
      key: "codeowners_configured",
      present: true,
      source: ".github/CODEOWNERS",
      notes: "synthetic repository fixture",
      status: "implemented"
    }).valid).toBe(true);
    for (const external_target of [null, false, 0, ""]) {
      expect(isPromotableEvidence({
        key: "codeowners_configured",
        present: true,
        source: ".github/CODEOWNERS",
        notes: "synthetic mixed-shape fixture",
        external_target
      }).reasons).toContain("external_target_not_allowed");
    }
  });

  it("denies the external operational negative matrix and accepts the complete positive case", () => {
    const target = awsTarget();
    const payload = '{"providerEvent":"confirmed"}';
    const payloadDigest = buildEvidencePayloadDigest(payload);
    const bindingDigest = buildTargetBindingDigest(target, "production");
    const expectedContext = {
      evidenceKey: "cloud_audit_logs_enabled",
      collectionContextId: "context-a",
      provider: "aws" as const,
      environment: "production",
      targetFingerprint: "aws:123456789012:guardian",
      bindingDigest,
      collectorVersion: "1.0.0",
      expectedPayloadDigest: payloadDigest
    };
    const complete = {
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "provider-api",
      notes: "synthetic negative-matrix fixture",
      status: "observed",
      verification_method: "read-only provider API export",
      integrity: { algorithm: "sha256", digest: payloadDigest },
      integrity_payload: payload,
      external_target: target,
      collected_at: "2026-08-23T08:00:00Z",
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: "context-a",
      target_fingerprint: "aws:123456789012:guardian",
      binding_digest: bindingDigest
    };
    const check = (candidate: typeof complete | Record<string, unknown>, context?: typeof expectedContext) =>
      isPromotableEvidence(candidate as typeof complete, { now: new Date("2026-08-23T09:00:00Z"), expectedContext: context });
    const attackerPayload = '{"providerEvent":"substituted"}';

    const negativeCases: Array<[string, Record<string, unknown>]> = [
      ["missing target", { ...complete, external_target: undefined }],
      ["empty target", { ...complete, external_target: {} }],
      ["placeholder target", { ...complete, external_target: awsTarget({ scopeId: "PLACEHOLDER" }) }],
      ["missing expected context", complete],
      ["missing expected digest", complete],
      ["expected digest mismatch", complete],
      ["payload and declared digest replaced together", { ...complete, integrity_payload: attackerPayload, integrity: { algorithm: "sha256", digest: buildEvidencePayloadDigest(attackerPayload) } }],
      ["provider mismatch", complete],
      ["environment mismatch", complete],
      ["target fingerprint mismatch", complete],
      ["stale", { ...complete, collected_at: "2026-08-21T08:00:00Z" }],
      ["expired", { ...complete, collected_at: "2026-08-01T08:00:00Z" }],
      ["clock skew", { ...complete, collected_at: "2026-08-23T10:00:00Z" }],
      ["insufficient binding", { ...complete, external_target: awsTarget({ productBindingSignals: ["product:guardian"] }) }],
      ["missing verification method", { ...complete, verification_method: undefined }],
      ["wrong integrity algorithm", { ...complete, integrity: { algorithm: "md5", digest: payloadDigest } }],
      ["malformed declared digest", { ...complete, integrity: { algorithm: "sha256", digest: "bad" } }],
      ["non-promotable status", { ...complete, status: "unverified" }]
    ];
    const contexts = [
      expectedContext,
      expectedContext,
      expectedContext,
      undefined,
      { ...expectedContext, expectedPayloadDigest: undefined },
      { ...expectedContext, expectedPayloadDigest: "b".repeat(64) },
      expectedContext,
      { ...expectedContext, provider: "azure" as const },
      { ...expectedContext, environment: "staging" },
      { ...expectedContext, targetFingerprint: "different" },
      expectedContext,
      expectedContext,
      expectedContext,
      expectedContext,
      expectedContext,
      expectedContext,
      expectedContext,
      expectedContext
    ] as const;

    negativeCases.forEach(([label, candidate], index) => {
      expect(check(candidate, contexts[index] as typeof expectedContext), label).toMatchObject({ valid: false });
    });
    expect(check(complete, expectedContext)).toEqual({ valid: true, reasons: [] });
  });

  it.each([
    ["false string", "false"], ["true string", "true"], ["one", 1], ["zero", 0],
    ["null", null], ["array", []], ["object", {}], ["undefined", undefined]
  ])("rejects non-boolean present: %s", (_label, present) => {
    expect(isPromotableEvidence({
      key: "security_policy_exists",
      present,
      source: "SECURITY.md",
      notes: "synthetic primitive fixture"
    })).toMatchObject({ valid: false, reasons: expect.arrayContaining(["invalid_present_type"]) });
  });

  it("enforces the runtime status allowlist and primitive contract without schema", () => {
    const { evidence, expectedContext } = completeExternalFixture();
    for (const status of ["attacker_defined", "", null, [], {}]) {
      expect(isPromotableEvidence({ ...evidence, status }, {
        now: new Date("2026-08-23T09:00:00Z"), expectedContext
      })).toMatchObject({ valid: false, reasons: expect.arrayContaining(["invalid_status"]) });
    }
    for (const status of ["documented", "unavailable", "not_applicable", "unverified"]) {
      expect(isPromotableEvidence({ ...evidence, status }, {
        now: new Date("2026-08-23T09:00:00Z"), expectedContext
      }).valid).toBe(false);
    }
    expect(isPromotableEvidence({ ...evidence, source: [] }, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext
    }).reasons).toContain("invalid_source_type");
    expect(isPromotableEvidence({ ...evidence, notes: {} }, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext
    }).reasons).toContain("invalid_notes_type");
    expect(isPromotableEvidence(evidence, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext
    }).valid).toBe(true);
  });

  it("binds authoritative context and digest to the expected evidence key", () => {
    const cloud = completeExternalFixture("cloud_audit_logs_enabled");
    const application = completeExternalFixture("application_logs_enabled");
    const sameContextDifferentKey = {
      ...cloud.expectedContext,
      evidenceKey: "application_logs_enabled"
    };
    expect(isPromotableEvidence(cloud.evidence, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext: sameContextDifferentKey
    }).reasons).toContain("expected_evidence_key_mismatch");

    const missingKey = { ...cloud.expectedContext, evidenceKey: undefined } as unknown as typeof cloud.expectedContext;
    expect(isPromotableEvidence(cloud.evidence, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext: missingKey
    }).reasons).toContain("expected_evidence_key_missing");

    const unknownKey = { ...cloud.expectedContext, evidenceKey: "unknown_external_key" };
    expect(isPromotableEvidence(cloud.evidence, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext: unknownKey
    }).reasons).toContain("expected_evidence_key_unknown");

    const replaced = {
      ...cloud.evidence,
      key: "application_logs_enabled",
      integrity_payload: application.evidence.integrity_payload,
      integrity: application.evidence.integrity
    };
    expect(isPromotableEvidence(replaced, {
      now: new Date("2026-08-23T09:00:00Z"), expectedContext: cloud.expectedContext
    }).reasons).toEqual(expect.arrayContaining([
      "expected_evidence_key_mismatch", "expected_payload_digest_mismatch"
    ]));
  });
});
