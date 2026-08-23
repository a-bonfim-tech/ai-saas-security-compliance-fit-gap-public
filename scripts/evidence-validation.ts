import net from "node:net";
import { createHash } from "node:crypto";

export const PLACEHOLDER_TOKENS = new Set([
  "REAL", "EXAMPLE", "EXEMPLO", "PLACEHOLDER", "TEST", "DEMO", "SAMPLE",
  "TODO", "TBD", "UNKNOWN", "DUMMY", "MOCK", "FAKE", "N/A", "NA",
  "VALOR_REAL", "OWNER_OU_EQUIPE_REAL", "URL_OU_SERVICE_ID_REAL",
  "AWS_ACCOUNT_ID_REAL", "DOMINIO_REAL_ASSOCIADO_AO_PRODUTO",
  "SERVICE_ID_REAL_ASSOCIADO_AO_PRODUTO"
]);

export type ExternalProvider = "aws" | "azure" | "gcp" | "vercel" | "generic";

export type ExternalTarget = {
  provider: ExternalProvider;
  scopeId: string;
  endpoint?: string;
  region?: string;
  productBindingSignals: string[];
};

export type ValidationResult = {
  valid: boolean;
  reasons: string[];
};

export type FreshnessStatus =
  | "FRESH"
  | "STALE"
  | "EXPIRED"
  | "TIMESTAMP_MISSING"
  | "CLOCK_SKEW_SUSPECTED"
  | "NOT_APPLICABLE";

export type FreshnessPolicy = {
  staleAfterSeconds: number;
  expireAfterSeconds: number;
  futureSkewToleranceSeconds: number;
};

export type ExpectedCollectionContext = {
  collectionContextId: string;
  provider: ExternalProvider;
  environment: string;
  targetFingerprint: string;
  bindingDigest: string;
  collectorVersion: string;
  /** Authoritative expected value supplied independently by the caller. Never derive it from evidence input. */
  expectedPayloadDigest: string;
  repositoryCommitSha?: string;
};

export type EvidenceLike = {
  present: boolean;
  source: string | null;
  notes?: string;
  status?: string;
  verification_method?: string;
  integrity?: { algorithm: string; digest: string };
  integrity_payload?: string;
  external_target?: ExternalTarget;
  collected_at?: string;
  valid_until?: string;
  max_age_seconds?: number;
  source_timestamp?: string;
  environment?: string;
  collector_version?: string;
  collection_context_id?: string;
  target_fingerprint?: string;
  binding_digest?: string;
  repository_commit_sha?: string;
};

const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  staleAfterSeconds: 24 * 60 * 60,
  expireAfterSeconds: 7 * 24 * 60 * 60,
  futureSkewToleranceSeconds: 5 * 60
};

const VALID_AWS_REGIONS = new Set([
  "af-south-1", "ap-east-1", "ap-northeast-1", "ap-northeast-2",
  "ap-northeast-3", "ap-south-1", "ap-south-2", "ap-southeast-1",
  "ap-southeast-2", "ap-southeast-3", "ap-southeast-4", "ca-central-1",
  "ca-west-1", "eu-central-1", "eu-central-2", "eu-north-1", "eu-south-1",
  "eu-south-2", "eu-west-1", "eu-west-2", "eu-west-3", "il-central-1",
  "me-central-1", "me-south-1", "mx-central-1", "sa-east-1", "us-east-1",
  "us-east-2", "us-west-1", "us-west-2"
]);

function normalizedTokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9/]+/)
    .filter(Boolean);
}

export function isArtificialValue(value: string): boolean {
  const trimmed = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .trim();
  if (!trimmed) return true;
  const upper = trimmed.normalize("NFKC").toUpperCase();
  if (PLACEHOLDER_TOKENS.has(upper)) return true;
  return normalizedTokens(trimmed).some(token => PLACEHOLDER_TOKENS.has(token));
}

export function isValidPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) return false;
    if (hostname === "example.com" || hostname.endsWith(".example.com")) return false;
    if (hostname.endsWith(".example") || hostname.endsWith(".invalid") || hostname.endsWith(".test")) return false;
    const ipVersion = net.isIP(hostname);
    if (ipVersion && (hostname.startsWith("127.") || hostname === "::1")) return false;
    if (!ipVersion && !isValidDomain(hostname)) return false;
    return !isArtificialValue(hostname);
  } catch {
    return false;
  }
}

export function isValidDomain(value: string): boolean {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (isArtificialValue(domain) || domain.length > 253) return false;
  if (domain === "localhost" || domain.endsWith(".localhost")) return false;
  if (domain === "example.com" || domain.endsWith(".example.com")) return false;
  if (domain.endsWith(".example") || domain.endsWith(".invalid") || domain.endsWith(".test")) return false;
  return domain.split(".").length >= 2 && domain.split(".").every(label =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  );
}

function providerScopeMatches(target: ExternalTarget): boolean {
  switch (target.provider) {
    case "aws":
      return /^\d{12}$/.test(target.scopeId);
    case "azure":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.scopeId);
    case "gcp":
      return /^(?=.{6,30}$)[a-z][a-z0-9-]*[a-z0-9]$/.test(target.scopeId);
    case "vercel":
      return /^(prj|team)_[A-Za-z0-9]{8,}$/.test(target.scopeId);
    case "generic":
      return isValidDomain(target.scopeId) || isValidPublicHttpsUrl(target.scopeId);
  }
}

export function validateExternalTarget(target: ExternalTarget): ValidationResult {
  const reasons: string[] = [];
  if (isArtificialValue(target.scopeId)) reasons.push("scope_id_is_artificial");
  if (!providerScopeMatches(target)) reasons.push("provider_scope_mismatch");
  if (target.endpoint && !isValidPublicHttpsUrl(target.endpoint)) reasons.push("invalid_endpoint");
  if (target.provider === "aws" && target.region && !VALID_AWS_REGIONS.has(target.region)) {
    reasons.push("invalid_aws_region");
  }
  const signals = target.productBindingSignals.filter(signal => !isArtificialValue(signal));
  if (signals.length < 2) reasons.push("insufficient_product_binding");
  if (new Set(signals.map(signal => signal.toLowerCase())).size < 2) reasons.push("uncorrelated_product_binding");
  return { valid: reasons.length === 0, reasons };
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function calculateFreshness(
  evidence: Pick<EvidenceLike, "collected_at" | "valid_until" | "max_age_seconds" | "external_target">,
  now: Date,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY
): FreshnessStatus {
  if (!evidence.external_target) return "NOT_APPLICABLE";
  const collectedAt = parseTimestamp(evidence.collected_at);
  if (collectedAt === null) return "TIMESTAMP_MISSING";
  const nowMs = now.getTime();
  if (collectedAt - nowMs > policy.futureSkewToleranceSeconds * 1000) return "CLOCK_SKEW_SUSPECTED";

  const validUntil = parseTimestamp(evidence.valid_until);
  if (evidence.valid_until && validUntil === null) return "EXPIRED";
  if (validUntil !== null && nowMs > validUntil) return "EXPIRED";

  const ageSeconds = Math.max(0, (nowMs - collectedAt) / 1000);
  const expireAfter = evidence.max_age_seconds ?? policy.expireAfterSeconds;
  if (!Number.isFinite(expireAfter) || expireAfter < 0) return "EXPIRED";
  if (ageSeconds > expireAfter || ageSeconds > policy.expireAfterSeconds) return "EXPIRED";
  if (ageSeconds > policy.staleAfterSeconds) return "STALE";
  return "FRESH";
}

function canonicalTarget(target: ExternalTarget, environment: string): string {
  return JSON.stringify({
    provider: target.provider,
    scopeId: target.scopeId.trim().toLowerCase(),
    endpoint: target.endpoint?.trim().toLowerCase() ?? null,
    region: target.region?.trim().toLowerCase() ?? null,
    environment: environment.trim().toLowerCase(),
    productBindingSignals: [...target.productBindingSignals]
      .map(signal => signal.normalize("NFKC").trim().toLowerCase())
      .sort()
  });
}

export function buildTargetBindingDigest(target: ExternalTarget, environment: string): string {
  return createHash("sha256").update(canonicalTarget(target, environment), "utf8").digest("hex");
}

export function buildEvidencePayloadDigest(payload: string): string {
  return createHash("sha256").update(payload.normalize("NFC"), "utf8").digest("hex");
}

export function validateCollectionContext(
  evidence: EvidenceLike,
  expected?: ExpectedCollectionContext
): ValidationResult {
  if (!evidence.external_target) return { valid: true, reasons: [] };
  const reasons: string[] = [];
  if (!expected) reasons.push("context_not_provided");
  if (!evidence.environment) reasons.push("missing_environment");
  if (!evidence.collector_version) reasons.push("missing_collector_version");
  if (!evidence.collection_context_id) reasons.push("missing_collection_context_id");
  if (!evidence.target_fingerprint) reasons.push("missing_target_fingerprint");
  if (!evidence.binding_digest) reasons.push("missing_binding_digest");

  if (expected) {
    if (evidence.collection_context_id !== expected.collectionContextId) reasons.push("collection_context_mismatch");
    if (evidence.external_target.provider !== expected.provider) reasons.push("provider_context_mismatch");
    if (evidence.environment !== expected.environment) reasons.push("environment_context_mismatch");
    if (evidence.target_fingerprint !== expected.targetFingerprint) reasons.push("target_fingerprint_mismatch");
    if (evidence.binding_digest !== expected.bindingDigest) reasons.push("binding_digest_context_mismatch");
    if (evidence.collector_version !== expected.collectorVersion) reasons.push("collector_version_mismatch");
    const calculated = buildTargetBindingDigest(evidence.external_target, expected.environment);
    if (calculated !== expected.bindingDigest.toLowerCase()) reasons.push("expected_binding_digest_invalid");
    if (expected.repositoryCommitSha && evidence.repository_commit_sha !== expected.repositoryCommitSha) {
      reasons.push("repository_commit_mismatch");
    }
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function isPromotableEvidence(
  evidence: EvidenceLike,
  options: { now?: Date; freshnessPolicy?: FreshnessPolicy; expectedContext?: ExpectedCollectionContext } = {}
): ValidationResult {
  const reasons: string[] = [];
  if (!evidence.present) reasons.push("not_present");
  const source = evidence.source?.trim() ?? "";
  if (!source || PLACEHOLDER_TOKENS.has(source.normalize("NFKC").toUpperCase())) {
    reasons.push("invalid_source");
  }
  if (evidence.status && ["documented", "unavailable", "not_applicable", "unverified"].includes(evidence.status.toLowerCase())) {
    reasons.push("status_not_technical_evidence");
  }
  if (evidence.external_target) {
    if (!evidence.status) reasons.push("missing_status");
    reasons.push(...validateExternalTarget(evidence.external_target).reasons);
    if (!evidence.verification_method || isArtificialValue(evidence.verification_method)) {
      reasons.push("missing_verification_method");
    }
    // Payload and declared digest are untrusted evidence claims. The expected digest is caller-supplied.
    const computedPayloadDigest = evidence.integrity_payload
      ? buildEvidencePayloadDigest(evidence.integrity_payload)
      : undefined;
    const expectedPayloadDigest = options.expectedContext?.expectedPayloadDigest;
    if (!evidence.integrity || evidence.integrity.algorithm !== "sha256" || !/^[a-f0-9]{64}$/i.test(evidence.integrity.digest)) {
      reasons.push("missing_integrity_metadata");
    } else if (!evidence.integrity_payload) {
      reasons.push("missing_integrity_payload");
    } else if (computedPayloadDigest !== evidence.integrity.digest.toLowerCase()) {
      reasons.push("integrity_digest_mismatch");
    }
    if (!expectedPayloadDigest) {
      reasons.push("expected_payload_digest_missing");
    } else if (!/^[a-f0-9]{64}$/i.test(expectedPayloadDigest)) {
      reasons.push("expected_payload_digest_invalid");
    } else if (computedPayloadDigest && computedPayloadDigest !== expectedPayloadDigest.toLowerCase()) {
      reasons.push("expected_payload_digest_mismatch");
    }
    const freshness = calculateFreshness(evidence, options.now ?? new Date(), options.freshnessPolicy);
    if (freshness !== "FRESH") reasons.push(`freshness_${freshness.toLowerCase()}`);
    reasons.push(...validateCollectionContext(evidence, options.expectedContext).reasons);
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}
