import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const file = "docs/examples/privacy-processing-example.md";
const text = readFileSync(file, "utf8");

describe("AUD-006 bounded privacy processing example", () => {
  it("contains the required instantiated privacy concepts", () => {
    const required = [
      "Example processing context and scope",
      "Example processing activity",
      "Example data inventory",
      "Controller / processor role analysis",
      "Lawful-basis analysis",
      "Example data lifecycle",
      "Collection",
      "Use",
      "Disclosure",
      "Storage",
      "Retention",
      "Deletion",
      "Recipient, third-party and subprocessor boundary",
      "International-transfer analysis",
      "DPA and SCC evidence boundary",
      "Example data-subject-rights workflow",
      "Identity verification",
      "Locate / retrieve",
      "Approve / reject",
      "Recordkeeping / escalation",
      "Evidence classification",
      "Required evidence for operational validation"
    ];

    for (const phrase of required) {
      expect(text).toContain(phrase);
    }
  });

  it("contains the required example data-inventory dimensions", () => {
    const required = [
      "Data category",
      "Data-subject category",
      "Example source",
      "Example processing purpose",
      "Sensitivity",
      "Storage/location abstraction",
      "Recipient / processor abstraction",
      "Example retention / deletion model"
    ];

    for (const phrase of required) {
      expect(text).toContain(phrase);
    }
  });

  it("preserves the non-operational and legal claim boundary", () => {
    const requiredBoundaries = [
      "actual personal-data processing facts",
      "actual controller or processor status",
      "valid lawful basis for real processing",
      "actual DPA availability",
      "actual SCC availability",
      "actual subprocessor relationships",
      "actual international transfers",
      "operational data-subject-rights effectiveness",
      "verified production retention or deletion",
      "privacy compliance",
      "GDPR compliance",
      "certification status",
      "audit readiness"
    ];

    for (const phrase of requiredBoundaries) {
      expect(text).toContain(phrase);
    }
  });

  it("classifies the artifact as example rather than operational evidence", () => {
    expect(text).toContain("Evidence classification: `example`.");
    expect(text).toContain("repository-observed");
    expect(text).toContain("externally required");
    expect(text).toContain("unavailable / not validated");
  });

  it("does not assert actual contractual, transfer or subprocessor facts", () => {
    expect(text).toContain(
      "No actual vendor or subprocessor relationship is asserted."
    );
    expect(text).toContain(
      "The example does not assert that any international transfer occurs."
    );
    expect(text).toContain(
      "No DPA, SCC or equivalent agreement is claimed to exist."
    );
  });

  it("does not promote the example into operational privacy evidence", () => {
    expect(text).toContain(
      "Real processing, contractual, legal and runtime evidence is externally required"
    );
    expect(text).toContain(
      "Operational DSAR effectiveness is `unavailable / not validated`."
    );
    expect(text).toContain(
      "Production retention/deletion effectiveness"
    );
  });
});
