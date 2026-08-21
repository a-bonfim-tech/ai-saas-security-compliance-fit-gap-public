import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "docs/examples/ai-governance-example.md";
const text = readFileSync(path, "utf8");

describe("AUD-001 bounded AI governance example", () => {
  it("contains the required instantiated governance concepts", () => {
    const required = [
      "Example system purpose and scope",
      "System boundary",
      "Trust boundaries",
      "Provider and model abstraction",
      "End-to-end data flow",
      "Prompt injection",
      "Sensitive-data exposure",
      "Unsafe output",
      "Authorization / trust-boundary abuse",
      "Third-party/model dependency risk",
      "Human oversight model",
      "Override and rejection",
      "Escalation and failure behavior",
      "Evidence classification"
    ];

    for (const phrase of required) {
      expect(text).toContain(phrase);
    }
  });

  it("preserves the non-production claim boundary", () => {
    const requiredBoundaries = [
      "does not represent a production deployment",
      "operational effectiveness",
      "legal compliance",
      "certification status",
      "audit readiness",
      "Provider/runtime evidence would be required"
    ];

    for (const phrase of requiredBoundaries) {
      expect(text).toContain(phrase);
    }
  });

  it("does not claim a concrete provider or deployed model", () => {
    expect(text).toContain("Provider: not selected / not validated.");
    expect(text).toContain("Model: abstract external text-generation capability.");
    expect(text).toContain("Deployment state: example only.");
  });

  it("classifies the artifact as example rather than operational evidence", () => {
    expect(text).toContain("Evidence classification: `example`.");
    expect(text).toContain("repository-observed");
    expect(text).toContain("externally required");
    expect(text).toContain("unavailable / not validated");
  });
});
