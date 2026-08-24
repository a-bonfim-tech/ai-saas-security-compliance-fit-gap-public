import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { EVIDENCE_REQUIREMENTS } from "../scripts/evidence-requirements";

const schema = JSON.parse(fs.readFileSync("schemas/evidence.schema.json", "utf8"));
const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(schema);

describe("evidence schema external-operational discriminator", () => {
  it("classifies every evidence key referenced by the authoritative control catalog", () => {
    const controls = JSON.parse(fs.readFileSync("controls/control-catalog.json", "utf8")) as Array<{ expectedEvidence: string[] }>;
    const keys = controls.flatMap(control => control.expectedEvidence);
    expect(keys.filter(key => !(key in EVIDENCE_REQUIREMENTS))).toEqual([]);
  });

  it("keeps external-operational registry and schema discriminator sets identical", () => {
    const registryKeys = Object.entries(EVIDENCE_REQUIREMENTS)
      .filter(([, requirement]) => requirement === "external_operational")
      .map(([key]) => key)
      .sort();
    const schemaKeys = [...schema.items.allOf[0].if.properties.key.enum].sort();
    expect(schemaKeys).toEqual(registryKeys);
  });

  it("requires the security-significant external fields in the schema contract", () => {
    const required = new Set([
      ...schema.items.required,
      ...schema.items.allOf[0].then.required
    ]);
    for (const field of [
      "key", "present", "source", "notes", "status", "external_target", "environment",
      "collector_version", "collection_context_id", "target_fingerprint", "binding_digest",
      "verification_method", "integrity", "integrity_payload", "collected_at"
    ]) expect(required.has(field), field).toBe(true);
    expect(schema.items.properties.external_target.required).toEqual(expect.arrayContaining([
      "provider", "scopeId", "productBindingSignals"
    ]));
    expect(schema.items.properties.integrity.required).toEqual(expect.arrayContaining(["algorithm", "digest"]));
  });

  it.each([
    ["present string", { present: "false" }],
    ["present number", { present: 1 }],
    ["status unknown", { status: "attacker_defined" }],
    ["source array", { source: [] }],
    ["notes object", { notes: {} }]
  ])("rejects invalid primitive schema shape: %s", (_label, override) => {
    expect(validate([{ key: "security_policy_exists", present: true, source: "SECURITY.md", notes: "fixture", ...override }])).toBe(false);
  });

  it("rejects an external operational key without external_target", () => {
    expect(validate([{
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "cloud-provider/audit-logs",
      notes: "adversarial fixture; not operational evidence",
      status: "observed"
    }])).toBe(false);
    expect(validate.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "required", params: { missingProperty: "external_target" } })
    ]));
  });

  it.each(Object.entries(EVIDENCE_REQUIREMENTS)
    .filter(([, requirement]) => requirement === "external_operational")
    .map(([key]) => key))
  ("accepts the canonical absent representation for %s", key => {
    expect(validate([{
      key,
      present: false,
      source: null,
      notes: "canonical evidence gap"
    }])).toBe(true);
  });

  it("accepts complete present external evidence and rejects malformed supplied metadata when absent", () => {
    const complete = {
      key: "cloud_audit_logs_enabled",
      present: true,
      source: "provider-api",
      notes: "complete schema fixture",
      status: "observed",
      verification_method: "read-only provider API",
      integrity: { algorithm: "sha256", digest: "a".repeat(64) },
      integrity_payload: "payload",
      collected_at: "2026-08-24T08:00:00Z",
      collector_version: "1.0.0",
      environment: "production",
      collection_context_id: "ctx",
      target_fingerprint: "target",
      binding_digest: "b".repeat(64),
      external_target: {
        provider: "aws",
        scopeId: "123456789012",
        productBindingSignals: ["product:guardian", "environment:production"]
      }
    };
    expect(validate([complete])).toBe(true);
    expect(validate([{
      key: complete.key,
      present: false,
      source: null,
      notes: "gap with malformed supplied metadata",
      integrity: { algorithm: "md5", digest: "bad" }
    }])).toBe(false);
  });

  it("does not require a cloud target for documentary or repository evidence", () => {
    expect(validate([{
      key: "security_policy_exists",
      present: true,
      source: "SECURITY.md",
      notes: "repository fixture"
    }])).toBe(true);
  });
});
