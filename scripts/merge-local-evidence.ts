import fs from "fs";
import path from "path";
import { readSafeJson } from "./safe-file";

type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
};

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

function mergeEvidence(base: Evidence[], incoming: Evidence[]): Evidence[] {
  const merged = new Map<string, Evidence>();

  for (const item of base) {
    merged.set(item.key, item);
  }

  for (const item of incoming) {
    const existing = merged.get(item.key);

    if (!existing) {
      merged.set(item.key, item);
      continue;
    }

    merged.set(item.key, {
      key: item.key,
      present: item.present || existing.present,
      source: item.present ? item.source : existing.source,
      notes: item.present
        ? `${existing.notes} | Updated by local collector: ${item.notes}`
        : existing.notes
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function main(): void {
  const base = readJson<Evidence[]>("evidence/evidence-register.json");
  const localReport = readJson<GithubLocalEvidenceReport>("evidence/github/github-local-evidence.json");

  const merged = mergeEvidence(base, localReport.evidence);

  writeJson("evidence/evidence-register.json", merged);

  console.log("Evidence register merged with local GitHub evidence.");
  console.log(`Total evidence items: ${merged.length}`);
}

main();
