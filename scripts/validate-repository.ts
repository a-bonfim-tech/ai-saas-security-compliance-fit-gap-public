import fs from "fs";
import path from "path";

type ValidationResult = {
  check: string;
  passed: boolean;
  details: string;
};

const requiredFiles = [
  "README.md",
  "SECURITY.md",
  "package.json",
  "tsconfig.json",
  "controls/control-catalog.json",
  "evidence/evidence-register.json",
  "scripts/analysis-core.ts",
  "scripts/analyze-fit-gap.ts",
  "reports/fit-gap-analysis.md",
  "reports/json/fit-gap-analysis.json",
  "reports/csv/fit-gap-analysis.csv",
  "reports/roadmap/remediation-roadmap.md",
  "reports/executive/executive-readiness-report.md",
  "docs/portfolio-project-summary.md"
];

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function validateRequiredFiles(): ValidationResult {
  const missing = requiredFiles.filter(file => !fileExists(file));

  return {
    check: "required files",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required files exist." : `Missing files: ${missing.join(", ")}`
  };
}

function validateControlCatalog(): ValidationResult {
  try {
    const controls = readJson("controls/control-catalog.json");

    if (!Array.isArray(controls)) {
      return {
        check: "control catalog",
        passed: false,
        details: "Control catalog is not an array."
      };
    }

    const invalid = controls.filter(control =>
      typeof control.id !== "string" ||
      typeof control.domain !== "string" ||
      typeof control.title !== "string" ||
      !Array.isArray(control.frameworks) ||
      !Array.isArray(control.expectedEvidence)
    );

    return {
      check: "control catalog",
      passed: invalid.length === 0,
      details: invalid.length === 0
        ? `Control catalog is valid. Controls: ${controls.length}.`
        : `Invalid controls: ${invalid.length}.`
    };
  } catch (error) {
    return {
      check: "control catalog",
      passed: false,
      details: `Failed to parse control catalog: ${String(error)}`
    };
  }
}

function validateEvidenceRegister(): ValidationResult {
  try {
    const evidence = readJson("evidence/evidence-register.json");

    if (!Array.isArray(evidence)) {
      return {
        check: "evidence register",
        passed: false,
        details: "Evidence register is not an array."
      };
    }

    const invalid = evidence.filter(item =>
      typeof item.key !== "string" ||
      typeof item.present !== "boolean" ||
      !("source" in item) ||
      typeof item.notes !== "string"
    );

    return {
      check: "evidence register",
      passed: invalid.length === 0,
      details: invalid.length === 0
        ? `Evidence register is valid. Evidence items: ${evidence.length}.`
        : `Invalid evidence items: ${invalid.length}.`
    };
  } catch (error) {
    return {
      check: "evidence register",
      passed: false,
      details: `Failed to parse evidence register: ${String(error)}`
    };
  }
}

function validateFitGapReport(): ValidationResult {
  try {
    const report = readJson("reports/json/fit-gap-analysis.json") as any;

    const valid =
      typeof report.generatedAt === "string" &&
      typeof report.methodology === "string" &&
      report.summary &&
      Array.isArray(report.findings);

    return {
      check: "fit-gap report",
      passed: valid,
      details: valid
        ? `Fit-gap report is valid. Findings: ${report.findings.length}.`
        : "Fit-gap report structure is invalid."
    };
  } catch (error) {
    return {
      check: "fit-gap report",
      passed: false,
      details: `Failed to parse fit-gap report: ${String(error)}`
    };
  }
}

function main(): void {
  const results = [
    validateRequiredFiles(),
    validateControlCatalog(),
    validateEvidenceRegister(),
    validateFitGapReport()
  ];

  console.log("# Repository Validation Results");
  console.log("");

  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} - ${result.check}: ${result.details}`);
  }

  const failed = results.filter(result => !result.passed);

  if (failed.length > 0) {
    console.error("");
    console.error(`Repository validation failed. Failed checks: ${failed.length}`);
    process.exit(1);
  }

  console.log("");
  console.log("Repository validation passed.");
}

main();
