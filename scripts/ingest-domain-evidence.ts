import fs from "fs";
import path from "path";

type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
};

type DomainEvidenceFile = {
  area: string;
  collectedAt: string;
  evidence: Evidence[];
};

const domainEvidenceFiles = [
  "evidence/application/application-evidence-template.json",
  "evidence/cloud/cloud-evidence-template.json",
  "evidence/privacy/privacy-evidence-template.json",
  "evidence/ai-governance/ai-governance-evidence-template.json"
];

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function writeJson(relativePath: string, data: unknown): void {
  fs.writeFileSync(path.join(process.cwd(), relativePath), JSON.stringify(data, null, 2));
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
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
        ? `${existing.notes} | Updated by domain evidence ingestion: ${item.notes}`
        : `${existing.notes} | Domain evidence note: ${item.notes}`
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function main(): void {
  const basePath = "evidence/evidence-register.json";

  if (!fileExists(basePath)) {
    throw new Error("Missing evidence/evidence-register.json");
  }

  let evidenceRegister = readJson<Evidence[]>(basePath);
  const ingestedFiles: string[] = [];

  for (const file of domainEvidenceFiles) {
    if (!fileExists(file)) {
      continue;
    }

    const domainFile = readJson<DomainEvidenceFile>(file);

    if (!Array.isArray(domainFile.evidence)) {
      throw new Error(`Invalid evidence file structure: ${file}`);
    }

    evidenceRegister = mergeEvidence(evidenceRegister, domainFile.evidence);
    ingestedFiles.push(file);
  }

  writeJson(basePath, evidenceRegister);

  console.log("Domain evidence ingestion completed.");
  console.log(`Ingested files: ${ingestedFiles.length}`);
  for (const file of ingestedFiles) {
    console.log(`- ${file}`);
  }
  console.log(`Total evidence items: ${evidenceRegister.length}`);
}

main();
