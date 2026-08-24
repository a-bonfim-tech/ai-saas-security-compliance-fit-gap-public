import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.join(process.cwd(), "scripts/ingest-domain-evidence.ts");
const tsxLoader = path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs");

function writeJson(root: string, relativePath: string, value: unknown): void {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(value, null, 2));
}

function runIngest(root: string) {
  return spawnSync(process.execPath, ["--import", tsxLoader, script], { cwd: root, encoding: "utf8" });
}

const richExternalEvidence = {
  key: "cloud_audit_logs_enabled",
  present: true,
  source: "provider-api",
  notes: "complete external evidence fixture",
  status: "observed",
  external_target: {
    provider: "aws",
    scopeId: "123456789012",
    productBindingSignals: ["product:guardian", "environment:production"]
  },
  integrity: { algorithm: "sha256", digest: "a".repeat(64) },
  integrity_payload: "fixture payload",
  collected_at: "2026-08-24T08:00:00Z",
  collector_version: "1.0.0",
  environment: "production",
  collection_context: { purpose: "runtime verification" },
  collection_context_id: "ctx-cloud-audit",
  target_fingerprint: "aws:123456789012",
  binding_digest: "b".repeat(64),
  verification_method: "read-only provider API"
};

describe("domain evidence ingestion", () => {
  it("preserves every security-relevant field and remains idempotent", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "domain-ingest-rich-"));
    writeJson(root, "evidence/evidence-register.json", [{
      key: richExternalEvidence.key,
      present: false,
      source: null,
      notes: "canonical gap"
    }]);
    writeJson(root, "evidence/cloud/cloud-evidence-template.json", {
      area: "Cloud Security",
      collectedAt: "2026-08-24T08:00:00Z",
      evidence: [richExternalEvidence]
    });

    expect(runIngest(root).status).toBe(0);
    expect(runIngest(root).status).toBe(0);

    const [result] = JSON.parse(fs.readFileSync(
      path.join(root, "evidence/evidence-register.json"), "utf8"
    ));
    for (const field of [
      "status", "external_target", "integrity", "integrity_payload", "collected_at",
      "collector_version", "environment", "collection_context", "collection_context_id", "target_fingerprint",
      "binding_digest", "verification_method"
    ]) expect(result[field], field).toEqual(richExternalEvidence[field as keyof typeof richExternalEvidence]);
    expect(result.notes.match(/Updated by domain evidence ingestion/g)).toHaveLength(1);
  });

  it("fails closed instead of replacing richer evidence with a poorer present record", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "domain-ingest-downgrade-"));
    writeJson(root, "evidence/evidence-register.json", [richExternalEvidence]);
    writeJson(root, "evidence/cloud/cloud-evidence-template.json", {
      area: "Cloud Security",
      collectedAt: "2026-08-24T08:00:00Z",
      evidence: [{
        key: richExternalEvidence.key,
        present: true,
        source: "provider-api",
        notes: "incomplete replacement"
      }]
    });

    const result = runIngest(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing to discard security metadata");
  });

  it("handles duplicate, documentary, and repository records without downgrading richer state", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "domain-ingest-categories-"));
    writeJson(root, "evidence/evidence-register.json", [{
      key: "risk_management_process_defined",
      present: true,
      source: "docs/risk-management.md",
      notes: "authoritative documentary record",
      status: "documented",
      verification_method: "document review"
    }, {
      key: "security_policy_exists",
      present: false,
      source: null,
      notes: "repository gap"
    }]);
    writeJson(root, "evidence/application/application-evidence-template.json", {
      area: "Application Security",
      collectedAt: "2026-08-24T08:00:00Z",
      evidence: [{
        key: "risk_management_process_defined",
        present: false,
        source: null,
        notes: "poorer documentary duplicate"
      }, {
        key: "security_policy_exists",
        present: true,
        source: "SECURITY.md",
        notes: "repository evidence"
      }, {
        key: "security_policy_exists",
        present: false,
        source: null,
        notes: "later duplicate gap"
      }]
    });

    expect(runIngest(root).status).toBe(0);
    const result = JSON.parse(fs.readFileSync(
      path.join(root, "evidence/evidence-register.json"), "utf8"
    ));
    const documentary = result.find((item: { key: string }) => item.key === "risk_management_process_defined");
    const repository = result.find((item: { key: string }) => item.key === "security_policy_exists");
    expect(documentary).toMatchObject({
      present: true,
      source: "docs/risk-management.md",
      status: "documented",
      verification_method: "document review"
    });
    expect(repository).toMatchObject({ present: true, source: "SECURITY.md" });
  });
});
