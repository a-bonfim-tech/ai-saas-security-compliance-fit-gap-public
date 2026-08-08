import fs from "fs";
import path from "path";

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

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function directoryExists(relativePath: string): boolean {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function workflowContains(pattern: RegExp): boolean {
  const workflowsDir = ".github/workflows";

  if (!directoryExists(workflowsDir)) {
    return false;
  }

  const workflowFiles = fs
    .readdirSync(path.join(process.cwd(), workflowsDir))
    .filter(file => file.endsWith(".yml") || file.endsWith(".yaml"));

  return workflowFiles.some(file => {
    const content = readText(path.join(workflowsDir, file));
    return pattern.test(content);
  });
}

function collectEvidence(): Evidence[] {
  const evidence: Evidence[] = [];

  evidence.push({
    key: "security_policy_exists",
    present: fileExists("SECURITY.md"),
    source: "SECURITY.md",
    notes: fileExists("SECURITY.md")
      ? "SECURITY.md exists in the repository."
      : "SECURITY.md was not found."
  });

  evidence.push({
    key: "dependabot_enabled",
    present: fileExists(".github/dependabot.yml") || fileExists(".github/dependabot.yaml"),
    source: ".github/dependabot.yml",
    notes: fileExists(".github/dependabot.yml") || fileExists(".github/dependabot.yaml")
      ? "Dependabot configuration exists."
      : "Dependabot configuration was not found."
  });

  evidence.push({
    key: "codeql_enabled",
    present: workflowContains(/github\/codeql-action\/(init|analyze)@/),
    source: ".github/workflows",
    notes: workflowContains(/github\/codeql-action\/(init|analyze)@/)
      ? "CodeQL workflow is configured."
      : "CodeQL workflow was not found."
  });

  evidence.push({
    key: "dependency_review_enabled",
    present: workflowContains(/dependency-review-action/),
    source: ".github/workflows",
    notes: workflowContains(/dependency-review-action/)
      ? "Dependency review workflow is configured."
      : "Dependency review workflow was not found."
  });

  evidence.push({
    key: "codeowners_configured",
    present:
      fileExists("CODEOWNERS") ||
      fileExists(".github/CODEOWNERS") ||
      fileExists("docs/CODEOWNERS"),
    source: "CODEOWNERS or .github/CODEOWNERS",
    notes:
      fileExists("CODEOWNERS") ||
      fileExists(".github/CODEOWNERS") ||
      fileExists("docs/CODEOWNERS")
        ? "CODEOWNERS file exists."
        : "CODEOWNERS file was not found."
  });

  evidence.push({
    key: "ci_workflow_enabled",
    present: fileExists(".github/workflows/ci.yml") || fileExists(".github/workflows/ci.yaml"),
    source: ".github/workflows/ci.yml",
    notes: fileExists(".github/workflows/ci.yml") || fileExists(".github/workflows/ci.yaml")
      ? "CI workflow exists."
      : "CI workflow was not found."
  });

  evidence.push({
    key: "report_validation_workflow_enabled",
    present:
      fileExists(".github/workflows/validate-reports.yml") ||
      fileExists(".github/workflows/validate-reports.yaml"),
    source: ".github/workflows/validate-reports.yml",
    notes:
      fileExists(".github/workflows/validate-reports.yml") ||
      fileExists(".github/workflows/validate-reports.yaml")
        ? "Report validation workflow exists."
        : "Report validation workflow was not found."
  });

  evidence.push({
    key: "env_files_ignored",
    present: fileExists(".gitignore") && /\.env(\.\*)?/m.test(readText(".gitignore")),
    source: ".gitignore",
    notes: fileExists(".gitignore") && /\.env(\.\*)?/m.test(readText(".gitignore"))
      ? ".env files are ignored."
      : ".env ignore rule was not found."
  });

  evidence.push({
    key: "package_lock_committed",
    present:
      fileExists("pnpm-lock.yaml") ||
      fileExists("package-lock.json") ||
      fileExists("yarn.lock"),
    source: "pnpm-lock.yaml, package-lock.json or yarn.lock",
    notes:
      fileExists("pnpm-lock.yaml") ||
      fileExists("package-lock.json") ||
      fileExists("yarn.lock")
        ? "Package manager lockfile exists."
        : "Package manager lockfile was not found."
  });

  evidence.push({
    key: "typescript_typecheck_defined",
    present:
      fileExists("package.json") &&
      /"typecheck"\s*:/.test(readText("package.json")),
    source: "package.json",
    notes:
      fileExists("package.json") &&
      /"typecheck"\s*:/.test(readText("package.json"))
        ? "Typecheck script is defined."
        : "Typecheck script was not found."
  });

  evidence.push({
    key: "fit_gap_analysis_script_defined",
    present:
      fileExists("package.json") &&
      /"analyze"\s*:/.test(readText("package.json")) &&
      fileExists("scripts/analyze-fit-gap.ts"),
    source: "package.json and scripts/analyze-fit-gap.ts",
    notes:
      fileExists("package.json") &&
      /"analyze"\s*:/.test(readText("package.json")) &&
      fileExists("scripts/analyze-fit-gap.ts")
        ? "Fit-gap analysis script exists and is exposed through package.json."
        : "Fit-gap analysis script or package.json command was not found."
  });

  return evidence;
}

function main(): void {
  const outputDir = path.join(process.cwd(), "evidence/github");
  fs.mkdirSync(outputDir, { recursive: true });

  const report: GithubLocalEvidenceReport = {
    repositoryPath: ".",
    collectedAt: new Date().toISOString(),
    collector: "github-local-evidence-collector",
    evidence: collectEvidence()
  };

  const outputPath = path.join(outputDir, "github-local-evidence.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("GitHub local evidence collection completed.");
  console.log(`Evidence written to ${path.relative(process.cwd(), outputPath)}`);
}

main();
