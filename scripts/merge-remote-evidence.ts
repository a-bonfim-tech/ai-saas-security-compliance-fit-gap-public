import fs from "fs";
import path from "path";

type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
};

type RemoteEvidenceReport = {
  repository: string;
  collectedAt: string;
  collector: string;
  evidence: Evidence[];
  warnings: string[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
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
        ? `${existing.notes} | Updated by remote collector: ${item.notes}`
        : `${existing.notes} | Remote collector note: ${item.notes}`
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function main(): void {
  const base = readJson<Evidence[]>("evidence/evidence-register.json");
  const remoteReport = readJson<RemoteEvidenceReport>("evidence/github/github-remote-evidence.json");

  const merged = mergeEvidence(base, remoteReport.evidence);

  writeJson("evidence/evidence-register.json", merged);

  console.log("Evidence register merged with remote GitHub evidence.");
  console.log(`Repository: ${remoteReport.repository}`);
  console.log(`Total evidence items: ${merged.length}`);

  if (remoteReport.warnings.length > 0) {
    console.log("Remote collector warnings:");
    for (const warning of remoteReport.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
