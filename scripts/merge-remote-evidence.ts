import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { readSafeJson } from "./safe-file";
import { mergeEvidenceBatch, type EvidenceProvenance, type MergeableEvidence } from "./evidence-merge";

type Provenance = EvidenceProvenance;
type Evidence = MergeableEvidence;

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

function mergeEvidence(
  base: Evidence[],
  incoming: Evidence[],
  remoteProvenance: Provenance
): Evidence[] {
  return mergeEvidenceBatch(
    base,
    incoming.map(item => ({ ...item, provenance: remoteProvenance }))
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
