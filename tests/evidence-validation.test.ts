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
    expect(isPromotableEvidence({ present: true, source: "README.md", status: "documented" }).valid).toBe(false);
    expect(isPromotableEvidence({
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
      present: true,
      source: "evidence/runtime/audit-export.json",
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
    const expectedContext = { collectionContextId: "collection-20260823-01", provider: "aws" as const, environment, targetFingerprint: "aws:123456789012:guardian", bindingDigest, collectorVersion: "1.0.0", expectedPayloadDigest: authoritativeExpectedDigest, repositoryCommitSha: "a".repeat(40) };
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
      present: true,
      source: "provider-api",
      external_target: target,
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: "context-a",
      target_fingerprint: "fingerprint-a",
      binding_digest: buildTargetBindingDigest(target, "production"),
      repository_commit_sha: "a".repeat(40)
    };
    expect(validateCollectionContext(evidence, {
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
      present: true,
      source: "provider-api",
      external_target: awsTarget({ scopeId: "999999999999" }),
      environment: "production",
      collector_version: "1.0.0",
      collection_context_id: "context-a",
      target_fingerprint: "fingerprint-a",
      binding_digest: buildTargetBindingDigest(original, "production")
    }, {
      collectionContextId: "context-a",
      provider: "aws",
      environment: "production",
      targetFingerprint: "fingerprint-a",
      bindingDigest: buildTargetBindingDigest(original, "production"),
      collectorVersion: "1.0.0",
      expectedPayloadDigest: "a".repeat(64)
    }).reasons).toContain("expected_binding_digest_invalid");
  });
});
