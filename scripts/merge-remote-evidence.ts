import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { readSafeJson } from "./safe-file";

type Provenance = {
  assessment_repository: string;
  source_repository: string;
  source_collected_at: string;
  source_collector: string;
};

type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
  provenance?: Provenance;
};

type RemoteEvidenceReport = {
  repository: string;
  collectedAt: string;
  collector: string;
  evidence: Evidence[];
  warnings: string[];
};

function readJson<T>(relativePath: string): T {
  return readSafeJson<T>(relativePath);
}

function writeJson(relativePath: string, data: unknown): void {
  fs.writeFileSync(
    path.join(process.cwd(), relativePath),
    JSON.stringify(data, null, 2)
  );
}

function parseGitHubRepository(remoteUrl: string): string | null {
  const value = remoteUrl.trim();
  let repositoryPath: string | null = null;

  if (value.startsWith("git@github.com:")) {
    repositoryPath = value.slice("git@github.com:".length);
  } else {
    try {
      const parsed = new URL(value);

      if (parsed.hostname.toLowerCase() !== "github.com") {
        return null;
      }

      repositoryPath = parsed.pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }

  repositoryPath = repositoryPath
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");

  const parts = repositoryPath.split("/");

  if (
    parts.length !== 2 ||
    parts.some(part => part.trim().length === 0)
  ) {
    return null;
  }

  return `${parts[0]}/${parts[1]}`;
}

function getAssessmentRepository(): string {
  let remoteUrl: string;

  try {
    remoteUrl = execFileSync(
      "git",
      ["remote", "get-url", "origin"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    ).trim();
  } catch {
    throw new Error(
      "Unable to determine assessment repository from git remote.origin.url."
    );
  }

  const repository = parseGitHubRepository(remoteUrl);

  if (!repository) {
    throw new Error(
      `Unable to parse GitHub assessment repository from origin: ${remoteUrl}`
    );
  }

  return repository;
}

function buildRemoteProvenance(
  assessmentRepository: string,
  remoteReport: RemoteEvidenceReport
): Provenance {
  return {
    assessment_repository: assessmentRepository,
    source_repository: remoteReport.repository,
    source_collected_at: remoteReport.collectedAt,
    source_collector: remoteReport.collector
  };
}

function appendRemoteNoteOnce(
  existingNotes: string,
  prefix: "Updated by remote collector" | "Remote collector note",
  incomingNotes: string
): string {
  const fragment = `${prefix}: ${incomingNotes}`;

  const existingFragments = existingNotes.split(" | ");

  if (
    existingFragments.includes(incomingNotes) ||
    existingFragments.includes(fragment)
  ) {
    return existingNotes;
  }

  return `${existingNotes} | ${fragment}`;
}

function mergeEvidence(
  base: Evidence[],
  incoming: Evidence[],
  remoteProvenance: Provenance
): Evidence[] {
  const merged = new Map<string, Evidence>();

  for (const item of base) {
    merged.set(item.key, item);
  }

  for (const item of incoming) {
    const existing = merged.get(item.key);

    if (!existing) {
      merged.set(item.key, {
        ...item,
        provenance: remoteProvenance
      });
      continue;
    }

    const remoteSourceMatchesExisting =
      item.source !== null &&
      existing.source === item.source;

    const existingIsForeignRemoteEvidence =
      existing.provenance?.source_collector ===
        remoteProvenance.source_collector &&
      existing.provenance?.assessment_repository ===
        remoteProvenance.assessment_repository &&
      existing.provenance?.source_repository !==
        remoteProvenance.source_repository;

    const existingIsLegacyRepositorySettingsEvidence =
      existing.source === "github/repository-settings" &&
      existing.provenance === undefined;

    const remoteSourceBecomesAuthoritative =
      item.present ||
      remoteSourceMatchesExisting ||
      existingIsForeignRemoteEvidence ||
      existingIsLegacyRepositorySettingsEvidence;

    const freshRemoteStateIsAuthoritative =
      existingIsForeignRemoteEvidence ||
      existingIsLegacyRepositorySettingsEvidence;

    merged.set(item.key, {
      ...existing,
      key: item.key,
      present: freshRemoteStateIsAuthoritative
        ? item.present
        : item.present || existing.present,
      source:
        item.present ||
        freshRemoteStateIsAuthoritative
          ? item.source
          : existing.source,
      notes: item.present
        ? appendRemoteNoteOnce(
            existing.notes,
            "Updated by remote collector",
            item.notes
          )
        : appendRemoteNoteOnce(
            existing.notes,
            "Remote collector note",
            item.notes
          ),
      provenance: remoteSourceBecomesAuthoritative
        ? remoteProvenance
        : existing.provenance
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => a.key.localeCompare(b.key)
  );
}

function main(): void {
  const base = readJson<Evidence[]>(
    "evidence/evidence-register.json"
  );

  const remoteReport = readJson<RemoteEvidenceReport>(
    "evidence/github/github-remote-evidence.json"
  );

  const assessmentRepository = getAssessmentRepository();

  const remoteProvenance = buildRemoteProvenance(
    assessmentRepository,
    remoteReport
  );

  const merged = mergeEvidence(
    base,
    remoteReport.evidence,
    remoteProvenance
  );

  writeJson("evidence/evidence-register.json", merged);

  console.log(
    "Evidence register merged with remote GitHub evidence."
  );
  console.log(
    `Assessment repository: ${assessmentRepository}`
  );
  console.log(
    `Source repository: ${remoteReport.repository}`
  );
  console.log(`Total evidence items: ${merged.length}`);

  if (remoteReport.warnings.length > 0) {
    console.log("Remote collector warnings:");

    for (const warning of remoteReport.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
