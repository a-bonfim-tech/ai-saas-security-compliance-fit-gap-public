import fs from "fs";
import path from "path";
import { readSafeJson } from "./safe-file";
import { mergeEvidenceBatch, type EvidenceProvenance, type MergeableEvidence } from "./evidence-merge";

type Evidence = MergeableEvidence;

const SECURITY_RELEVANT_METADATA_FIELDS = [
  "status",
  "external_target",
  "integrity",
  "integrity_payload",
  "collected_at",
  "collector_version",
  "environment",
  "collection_context",
  "collection_context_id",
  "target_fingerprint",
  "binding_digest",
  "verification_method"
] as const;

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
  return readSafeJson<T>(relativePath);
}

function writeJson(relativePath: string, data: unknown): void {
  fs.writeFileSync(path.join(process.cwd(), relativePath), JSON.stringify(data, null, 2));
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
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

    if (domainFile.collectedAt === "YYYY-MM-DDTHH:MM:SSZ") {
      continue;
    }

    const provenance: EvidenceProvenance = {
      assessment_repository: "domain-evidence-register",
      source_repository: domainFile.area,
      source_collected_at: domainFile.collectedAt,
      source_collector: "domain-evidence-ingestion"
    };
    const incoming = domainFile.evidence.map(item => {
      const existing = evidenceRegister.find(record => record.key === item.key);
      if (item.present && existing) {
        const discardedFields = SECURITY_RELEVANT_METADATA_FIELDS.filter(field =>
          existing[field] !== undefined && item[field] === undefined
        );
        if (discardedFields.length > 0) {
          throw new Error(`Refusing to discard security metadata for ${item.key}: ${discardedFields.join(", ")}`);
        }
      }
      return { ...item, provenance };
    });
    evidenceRegister = mergeEvidenceBatch(evidenceRegister, incoming);
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
