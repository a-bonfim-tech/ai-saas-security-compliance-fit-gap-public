import net from "node:net";
import { createHash } from "node:crypto";
import { getEvidenceRequirement } from "./evidence-requirements";

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
  evidenceKey: string;
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
  key?: string;
  present: boolean;
  source: string | null;
  notes: string;
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

export const PROMOTABLE_EVIDENCE_STATUSES = new Set([
  "implemented", "tested", "observed", "operationally_proven"
]);

export const NON_PROMOTABLE_EVIDENCE_STATUSES = new Set([
  "documented", "unavailable", "not_applicable", "unverified"
]);

const VALID_EVIDENCE_STATUSES = new Set([
  ...PROMOTABLE_EVIDENCE_STATUSES,
  ...NON_PROMOTABLE_EVIDENCE_STATUSES
]);

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
  if (!target || typeof target !== "object") return { valid: false, reasons: ["invalid_external_target"] };
  const candidate = target as Partial<ExternalTarget>;
  const providers: ExternalProvider[] = ["aws", "azure", "gcp", "vercel", "generic"];
  if (!candidate.provider || !providers.includes(candidate.provider)) reasons.push("invalid_provider");
  if (typeof candidate.scopeId !== "string" || isArtificialValue(candidate.scopeId)) reasons.push("scope_id_is_artificial");
  if (candidate.provider && typeof candidate.scopeId === "string" && !providerScopeMatches(candidate as ExternalTarget)) {
    reasons.push("provider_scope_mismatch");
  }
  if (candidate.endpoint !== undefined && (typeof candidate.endpoint !== "string" || !isValidPublicHttpsUrl(candidate.endpoint))) reasons.push("invalid_endpoint");
  if (candidate.provider === "aws" && candidate.region !== undefined && (typeof candidate.region !== "string" || !VALID_AWS_REGIONS.has(candidate.region))) {
    reasons.push("invalid_aws_region");
  }
  const rawSignals = Array.isArray(candidate.productBindingSignals) ? candidate.productBindingSignals : [];
  if (!Array.isArray(candidate.productBindingSignals)) reasons.push("missing_product_binding");
  const signals = rawSignals.filter(signal => typeof signal === "string" && !isArtificialValue(signal));
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
    if (typeof expected.evidenceKey !== "string" || !expected.evidenceKey) reasons.push("expected_evidence_key_missing");
    else if (!getEvidenceRequirement(expected.evidenceKey)) reasons.push("expected_evidence_key_unknown");
    else if (evidence.key !== expected.evidenceKey) reasons.push("expected_evidence_key_mismatch");
    const providerValid = ["aws", "azure", "gcp", "vercel", "generic"].includes(expected.provider);
    if (typeof expected.collectionContextId !== "string" || !expected.collectionContextId ||
        !providerValid || typeof expected.environment !== "string" || !expected.environment ||
        typeof expected.targetFingerprint !== "string" || !expected.targetFingerprint ||
        typeof expected.bindingDigest !== "string" || !/^[a-f0-9]{64}$/i.test(expected.bindingDigest) ||
        typeof expected.collectorVersion !== "string" || !expected.collectorVersion ||
        typeof expected.expectedPayloadDigest !== "string" || !/^[a-f0-9]{64}$/i.test(expected.expectedPayloadDigest) ||
        (expected.repositoryCommitSha !== undefined &&
          (typeof expected.repositoryCommitSha !== "string" || !/^[a-f0-9]{40}$/i.test(expected.repositoryCommitSha)))) {
      reasons.push("invalid_expected_context_shape");
      return { valid: false, reasons: [...new Set(reasons)] };
    }
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
  input: unknown,
  options: { now?: Date; freshnessPolicy?: FreshnessPolicy; expectedContext?: ExpectedCollectionContext } = {}
): ValidationResult {
  const reasons: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, reasons: ["invalid_evidence_shape"] };
  }
  const evidence = input as Partial<EvidenceLike>;
  if (typeof evidence.key !== "string" || !evidence.key.trim()) reasons.push("invalid_key_type");
  const requirement = typeof evidence.key === "string" ? getEvidenceRequirement(evidence.key) : undefined;
  if (!requirement) reasons.push("unknown_evidence_requirement");
  if (typeof evidence.present !== "boolean") reasons.push("invalid_present_type");
  else if (!evidence.present) reasons.push("not_present");
  if (evidence.source !== null && typeof evidence.source !== "string") reasons.push("invalid_source_type");
  const source = typeof evidence.source === "string" ? evidence.source.trim() : "";
  if (!source || PLACEHOLDER_TOKENS.has(source.normalize("NFKC").toUpperCase())) {
    reasons.push("invalid_source");
  }
  if (typeof evidence.notes !== "string") reasons.push("invalid_notes_type");
  if (evidence.status !== undefined) {
    if (typeof evidence.status !== "string" || !VALID_EVIDENCE_STATUSES.has(evidence.status)) {
      reasons.push("invalid_status");
    } else if (NON_PROMOTABLE_EVIDENCE_STATUSES.has(evidence.status)) {
      reasons.push("status_not_technical_evidence");
    }
  }
  const hasExternalTarget = evidence.external_target !== undefined;
  if (requirement === "external_operational" && !evidence.external_target) {
    reasons.push("external_target_required");
  }
  if (requirement !== "external_operational" && hasExternalTarget) {
    reasons.push("external_target_not_allowed");
  }
  if (requirement === "external_operational" && evidence.external_target) {
    if (!evidence.status) reasons.push("missing_status");
    else if (typeof evidence.status !== "string" || !PROMOTABLE_EVIDENCE_STATUSES.has(evidence.status)) {
      reasons.push("status_not_promotable");
    }
    const targetValidation = validateExternalTarget(evidence.external_target);
    reasons.push(...targetValidation.reasons);
    if (typeof evidence.collected_at !== "string") reasons.push("invalid_collected_at_type");
    if (evidence.valid_until !== undefined && typeof evidence.valid_until !== "string") reasons.push("invalid_valid_until_type");
    if (evidence.max_age_seconds !== undefined && typeof evidence.max_age_seconds !== "number") reasons.push("invalid_max_age_type");
    if (typeof evidence.environment !== "string" || !evidence.environment) reasons.push("invalid_environment_type");
    if (typeof evidence.collector_version !== "string" || !evidence.collector_version) reasons.push("invalid_collector_version_type");
    if (typeof evidence.collection_context_id !== "string" || !evidence.collection_context_id) reasons.push("invalid_collection_context_type");
    if (typeof evidence.target_fingerprint !== "string" || !evidence.target_fingerprint) reasons.push("invalid_target_fingerprint_type");
    if (typeof evidence.binding_digest !== "string" || !/^[a-f0-9]{64}$/i.test(evidence.binding_digest)) reasons.push("invalid_binding_digest_type");
    if (evidence.repository_commit_sha !== undefined &&
        (typeof evidence.repository_commit_sha !== "string" || !/^[a-f0-9]{40}$/i.test(evidence.repository_commit_sha))) {
      reasons.push("invalid_repository_commit_type");
    }
    if (typeof evidence.verification_method !== "string" || isArtificialValue(evidence.verification_method)) {
      reasons.push("missing_verification_method");
    }
    // Payload and declared digest are untrusted evidence claims. The expected digest is caller-supplied.
    const computedPayloadDigest = typeof evidence.integrity_payload === "string"
      ? buildEvidencePayloadDigest(evidence.integrity_payload)
      : undefined;
    const expectedPayloadDigest = options.expectedContext?.expectedPayloadDigest;
    if (!evidence.integrity || typeof evidence.integrity !== "object" ||
        evidence.integrity.algorithm !== "sha256" || typeof evidence.integrity.digest !== "string" ||
        !/^[a-f0-9]{64}$/i.test(evidence.integrity.digest)) {
      reasons.push("missing_integrity_metadata");
    } else if (typeof evidence.integrity_payload !== "string" || !evidence.integrity_payload) {
      reasons.push("missing_integrity_payload");
    } else if (computedPayloadDigest !== evidence.integrity.digest.toLowerCase()) {
      reasons.push("integrity_digest_mismatch");
    }
    if (expectedPayloadDigest === undefined) {
      reasons.push("expected_payload_digest_missing");
    } else if (typeof expectedPayloadDigest !== "string" || !/^[a-f0-9]{64}$/i.test(expectedPayloadDigest)) {
      reasons.push("expected_payload_digest_invalid");
    } else if (computedPayloadDigest && computedPayloadDigest !== expectedPayloadDigest.toLowerCase()) {
      reasons.push("expected_payload_digest_mismatch");
    }
    if (typeof evidence.collected_at === "string" &&
        (evidence.valid_until === undefined || typeof evidence.valid_until === "string") &&
        (evidence.max_age_seconds === undefined || typeof evidence.max_age_seconds === "number")) {
      const freshness = calculateFreshness(evidence as EvidenceLike, options.now ?? new Date(), options.freshnessPolicy);
      if (freshness !== "FRESH") reasons.push(`freshness_${freshness.toLowerCase()}`);
    }
    const contextFieldsValid = typeof evidence.environment === "string" &&
      typeof evidence.collector_version === "string" && typeof evidence.collection_context_id === "string" &&
      typeof evidence.target_fingerprint === "string" && typeof evidence.binding_digest === "string";
    if (targetValidation.valid && contextFieldsValid) {
      reasons.push(...validateCollectionContext(evidence as EvidenceLike, options.expectedContext).reasons);
    }
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}
