export type EvidenceProvenance = {
  assessment_repository: string;
  source_repository: string;
  source_collected_at: string;
  source_collector: string;
};

export type MergeableEvidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
  provenance?: EvidenceProvenance;
  [field: string]: unknown;
};

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing or invalid evidence provenance: ${field}`);
  }
  return value.trim();
}

function parseTimestamp(value: unknown): number {
  const timestamp = requireText(value, "source_collected_at");
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/);
  if (!match) {
    throw new Error(`Invalid authoritative timestamp: ${timestamp}`);
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = "", zone, sign, offsetHourText = "0", offsetMinuteText = "0"] = match;
  const [year, month, day, hour, minute, second, millisecond, offsetHour, offsetMinute] = [
    yearText, monthText, dayText, hourText, minuteText, secondText,
    fraction.padEnd(3, "0"), offsetHourText, offsetMinuteText
  ].map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) {
    throw new Error(`Invalid authoritative timestamp: ${timestamp}`);
  }
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, millisecond);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) {
    throw new Error(`Invalid authoritative timestamp: ${timestamp}`);
  }
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid authoritative timestamp: ${timestamp}`);
  const expectedOffset = zone === "Z" ? 0 : (sign === "+" ? 1 : -1) * (offsetHour * 60 + offsetMinute);
  if (parsed !== calendar.getTime() - expectedOffset * 60_000) {
    throw new Error(`Invalid authoritative timestamp: ${timestamp}`);
  }
  return parsed;
}

export function parseGitHubRepositoryIdentity(remoteUrl: string): string | null {
  const value = remoteUrl.trim();
  let repositoryPath: string;
  if (value.startsWith("git@github.com:")) repositoryPath = value.slice("git@github.com:".length);
  else {
    try {
      const parsed = new URL(value);
      if (parsed.hostname.toLowerCase() !== "github.com") return null;
      repositoryPath = parsed.pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }
  const parts = repositoryPath.replace(/\/+$/, "").replace(/\.git$/, "").split("/");
  if (parts.length !== 2 || parts.some(part => part.trim().length === 0)) return null;
  return `${parts[0]}/${parts[1]}`;
}

function normalizeSource(value: string | null): string {
  return value === null ? "<null>" : value.trim().replace(/\s+/g, " ").replace(/\/+$/g, "").toLowerCase();
}

function authorityControlIdentity(item: MergeableEvidence): string {
  const source = normalizeSource(item.source).replace(/^gh api /, "");
  const repository = item.provenance!.source_repository.trim().toLowerCase();
  const branchGovernanceKeys = new Set([
    "branch_protection_enabled",
    "pull_request_reviews_required",
    "status_checks_required"
  ]);
  const isEquivalentGitHubGovernancePath =
    source === `repos/${repository}/rulesets` ||
    new RegExp(`^repos/${repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/branches/[^/]+/protection$`).test(source);
  if (branchGovernanceKeys.has(item.key) && isEquivalentGitHubGovernancePath) {
    return "github-branch-governance";
  }
  return source;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalObservation(item: MergeableEvidence): string {
  return stable({
    ...item,
    provenance: item.provenance ? {
      ...item.provenance,
      source_collected_at: new Date(parseTimestamp(item.provenance.source_collected_at)).toISOString()
    } : undefined
  });
}

export function validateEvidence(item: MergeableEvidence): void {
  requireText(item.key, "key");
  if (typeof item.present !== "boolean" || (item.source !== null && typeof item.source !== "string") || typeof item.notes !== "string") {
    throw new Error(`Malformed evidence record: ${String(item.key)}`);
  }
  const provenance = item.provenance;
  if (!provenance) throw new Error(`Missing evidence provenance: ${item.key}`);
  requireText(provenance.assessment_repository, "assessment_repository");
  requireText(provenance.source_repository, "source_repository");
  requireText(provenance.source_collector, "source_collector");
  parseTimestamp(provenance.source_collected_at);
}

export function sourceIdentity(item: MergeableEvidence): string {
  validateEvidence(item);
  const provenance = item.provenance!;
  const target = item.external_target && typeof item.external_target === "object"
    ? item.external_target as Record<string, unknown>
    : {};
  return stable({
    key: item.key,
    assessmentRepository: provenance.assessment_repository.trim().toLowerCase(),
    sourceRepository: provenance.source_repository.trim().toLowerCase(),
    authorityControl: authorityControlIdentity(item),
    provider: typeof target.provider === "string" ? target.provider.trim().toLowerCase() : null,
    environment: typeof item.environment === "string" ? item.environment.trim().toLowerCase() : null,
    context: item.collection_context_id ?? item.collection_context ?? null
  });
}

export function transitionEvidence(existing: MergeableEvidence, incoming: MergeableEvidence): MergeableEvidence {
  validateEvidence(incoming);
  if (existing.key !== incoming.key) throw new Error("Evidence transition keys do not match");

  if (!existing.provenance) {
    if (existing.present !== incoming.present) {
      throw new Error(`State-changing evidence lacks existing provenance: ${existing.key}`);
    }
    return normalizeSource(existing.source) === normalizeSource(incoming.source)
      ? incoming
      : existing;
  }

  const existingIdentity = sourceIdentity(existing);
  const incomingIdentity = sourceIdentity(incoming);
  if (existingIdentity !== incomingIdentity) {
    if (existing.present !== incoming.present) {
      throw new Error(`Conflicting authoritative sources for ${existing.key}`);
    }
    return existing;
  }

  const existingTime = parseTimestamp(existing.provenance.source_collected_at);
  const incomingTime = parseTimestamp(incoming.provenance!.source_collected_at);
  if (incomingTime < existingTime) return existing;
  if (incomingTime === existingTime) {
    if (canonicalObservation(existing) !== canonicalObservation(incoming)) {
      throw new Error(`Conflicting observations at the same timestamp for ${existing.key}`);
    }
    return existing;
  }
  return incoming;
}

export function mergeEvidenceBatch(base: MergeableEvidence[], incoming: MergeableEvidence[]): MergeableEvidence[] {
  const merged = new Map<string, MergeableEvidence>();
  for (const item of base) merged.set(item.key, item);

  for (const item of incoming) {
    validateEvidence(item);
    const existing = merged.get(item.key);
    merged.set(item.key, existing ? transitionEvidence(existing, item) : item);
  }

  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}
