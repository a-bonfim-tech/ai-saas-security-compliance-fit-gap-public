import fs from "fs";
import path from "path";

type Check = {
  name: string;
  passed: boolean;
  details: string;
};

const requiredFiles = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/release/release-notes-v0.1.0.md",
  "docs/release/release-checklist.md",
  "docs/github-repository-settings.md",
  "docs/publication-readiness.md",
  "reports/fit-gap-analysis.md",
  "reports/json/fit-gap-analysis.json",
  "reports/csv/fit-gap-analysis.csv",
  "reports/roadmap/remediation-roadmap.md",
  "reports/executive/executive-readiness-report.md",
  "reports/risk-score-report.md",
  "docs/portfolio-project-summary.md"
];

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function checkRequiredFiles(): Check {
  const missing = requiredFiles.filter(file => !exists(file));

  return {
    name: "required release files",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required release files exist." : `Missing: ${missing.join(", ")}`
  };
}

function checkPackageScripts(): Check {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const scripts = packageJson.scripts ?? {};
  const requiredScripts = [
    "typecheck",
    "test",
    "analyze",
    "validate:repo",
    "quality:check",
    "evidence:refresh-complete"
  ];

  const missing = requiredScripts.filter(script => !scripts[script]);

  return {
    name: "package scripts",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required package scripts exist." : `Missing scripts: ${missing.join(", ")}`
  };
}

function checkJsonReports(): Check {
  const jsonFiles = [
    "reports/json/fit-gap-analysis.json",
    "reports/json/remediation-roadmap.json",
    "reports/json/risk-score-report.json"
  ];

  try {
    for (const file of jsonFiles) {
      JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8"));
    }

    return {
      name: "JSON reports",
      passed: true,
      details: "All JSON reports parse successfully."
    };
  } catch (error) {
    return {
      name: "JSON reports",
      passed: false,
      details: `JSON report parse failed: ${String(error)}`
    };
  }
}

function checkNoEnvFiles(): Check {
  const forbidden: string[] = [];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory)) {
      if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;

      const fullPath = path.join(directory, entry);
      const relativePath = path.relative(process.cwd(), fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.startsWith(".env") && entry !== ".env.example") {
        forbidden.push(relativePath);
      }
    }
  }

  walk(process.cwd());

  return {
    name: "environment files",
    passed: forbidden.length === 0,
    details: forbidden.length === 0 ? "No forbidden .env files found." : `Forbidden env files: ${forbidden.join(", ")}`
  };
}

function main(): void {
  const checks = [
    checkRequiredFiles(),
    checkPackageScripts(),
    checkJsonReports(),
    checkNoEnvFiles()
  ];

  console.log("# Final Release Check");
  console.log("");

  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} - ${check.name}: ${check.details}`);
  }

  const failed = checks.filter(check => !check.passed);

  if (failed.length > 0) {
    console.error("");
    console.error(`Final release check failed. Failed checks: ${failed.length}`);
    process.exit(1);
  }

  console.log("");
  console.log("Final release check passed.");
}

main();
