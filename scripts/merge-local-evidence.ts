import fs from "fs";
import path from "path";
import { execFileSync } from "node:child_process";
import { readSafeJson } from "./safe-file";
import { mergeEvidenceBatch, parseGitHubRepositoryIdentity, type EvidenceProvenance, type MergeableEvidence } from "./evidence-merge";

type Evidence = MergeableEvidence;

type GithubLocalEvidenceReport = {
  repositoryPath: string;
  collectedAt: string;
  collector: string;
  evidence: Evidence[];
};

function readJson<T>(relativePath: string): T {
  return readSafeJson<T>(relativePath);
}

function writeJson(relativePath: string, data: unknown): void {
  fs.writeFileSync(path.join(process.cwd(), relativePath), JSON.stringify(data, null, 2));
}

function getCanonicalRepositoryIdentity(): string {
  let remoteUrl: string;
  try {
    remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new Error("Unable to determine local evidence repository identity from git remote.origin.url.");
  }
  const repository = parseGitHubRepositoryIdentity(remoteUrl);
  if (!repository) throw new Error(`Unable to parse canonical GitHub repository identity from origin: ${remoteUrl}`);
  return repository;
}

function main(): void {
  const base = readJson<Evidence[]>("evidence/evidence-register.json");
  const localReport = readJson<GithubLocalEvidenceReport>("evidence/github/github-local-evidence.json");
  const repositoryIdentity = getCanonicalRepositoryIdentity();

  const provenance: EvidenceProvenance = {
    assessment_repository: repositoryIdentity,
    source_repository: repositoryIdentity,
    source_collected_at: localReport.collectedAt,
    source_collector: localReport.collector
  };
  const incoming = localReport.evidence.map(item => ({ ...item, provenance }));
  const merged = mergeEvidenceBatch(base, incoming);

  writeJson("evidence/evidence-register.json", merged);

  console.log("Evidence register merged with local GitHub evidence.");
  console.log(`Total evidence items: ${merged.length}`);
}

main();
