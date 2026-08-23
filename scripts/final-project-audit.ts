import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "child_process";
import { escapeMarkdownTableCell } from "./markdown-table";
import { RELEASE_ARTIFACTS, verifyReleaseManifest, type ReleaseManifest } from "./release-integrity";
import { isPromotableEvidence, type EvidenceLike, type ExpectedCollectionContext } from "./evidence-validation";

type AuditCheck = {
  category: string;
  check: string;
  passed: boolean;
  details: string;
};

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function run(command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}

function countFiles(directory: string): number {
  if (!exists(directory)) return 0;
  let count = 0;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current)) {
      if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
      const fullPath = path.join(current, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else count += 1;
    }
  }

  walk(path.join(process.cwd(), directory));
  return count;
}

function checkRequiredCoreFiles(): AuditCheck {
  const required = [
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "package.json",
    "tsconfig.json",
    "controls/control-catalog.json",
    "evidence/evidence-register.json",
    "scripts/analysis-core.ts",
    "scripts/analyze-fit-gap.ts",
    "docs/index/project-index.md",
    "docs/handoff/final-handoff-index.md"
  ];
  const missing = required.filter(file => !exists(file));
  return {
    category: "Core",
    check: "Required core files",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required core files exist." : `Missing files: ${missing.join(", ")}`
  };
}

function checkReports(): AuditCheck {
  const required = [
    "reports/fit-gap-analysis.md",
    "reports/json/fit-gap-analysis.json",
    "reports/csv/fit-gap-analysis.csv",
    "reports/roadmap/remediation-roadmap.md",
    "reports/json/remediation-roadmap.json",
    "reports/csv/remediation-roadmap.csv",
    "reports/executive/executive-readiness-report.md",
    "reports/risk-score-report.md",
    "reports/json/risk-score-report.json",
    "reports/security/local-secret-scan-report.md",
    "reports/json/local-secret-scan-report.json"
  ];
  const missing = required.filter(file => !exists(file));
  return {
    category: "Reports",
    check: "Generated reports",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All expected reports exist." : `Missing reports: ${missing.join(", ")}`
  };
}

function checkDocumentationCoverage(): AuditCheck {
  const docsCount = countFiles("docs");
  return {
    category: "Documentation",
    check: "Documentation coverage",
    passed: docsCount >= 30,
    details: `Documentation files found: ${docsCount}.`
  };
}

function checkFrameworkCoverage(): AuditCheck {
  const required = [
    "frameworks/nist-csf-2.0/notes.md",
    "frameworks/iso-27001/notes.md",
    "frameworks/soc-2/notes.md",
    "frameworks/gdpr/notes.md",
    "frameworks/eu-ai-act/notes.md",
    "frameworks/owasp/notes.md"
  ];
  const missing = required.filter(file => !exists(file));
  return {
    category: "Frameworks",
    check: "Framework notes",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All framework notes exist." : `Missing framework notes: ${missing.join(", ")}`
  };
}

function checkControlCatalog(): AuditCheck {
  try {
    const controls = readJson<any[]>("controls/control-catalog.json");
    const domains = Array.from(new Set(controls.map(control => control.domain))).sort();
    const frameworks = Array.from(new Set(controls.flatMap(control => control.frameworks))).sort();
    const passed = controls.length >= 10 && domains.length >= 6 && frameworks.length >= 5;
    return {
      category: "Controls",
      check: "Control catalog coverage",
      passed,
      details: `Controls: ${controls.length}. Domains: ${domains.length}. Frameworks: ${frameworks.length}.`
    };
  } catch (error) {
    return {
      category: "Controls",
      check: "Control catalog coverage",
      passed: false,
      details: `Failed to parse control catalog: ${String(error)}`
    };
  }
}

function checkEvidenceRegister(): AuditCheck {
  try {
    const evidence = readJson<any[]>("evidence/evidence-register.json");
    const present = evidence.filter(item => item.present === true).length;
    const missing = evidence.filter(item => item.present === false).length;
    return {
      category: "Evidence",
      check: "Evidence register",
      passed: evidence.length >= 20,
      details: `Evidence items: ${evidence.length}. Present: ${present}. Missing/false: ${missing}.`
    };
  } catch (error) {
    return {
      category: "Evidence",
      check: "Evidence register",
      passed: false,
      details: `Failed to parse evidence register: ${String(error)}`
    };
  }
}

function checkPackageScripts(): AuditCheck {
  const pkg = readJson<any>("package.json");
  const scripts = pkg.scripts ?? {};
  const required = [
    "typecheck",
    "test",
    "analyze",
    "evidence:refresh-complete",
    "quality:check",
    "release:prepare",
    "security:scan-local",
    "handoff:generate",
    "final:check"
  ];
  const missing = required.filter(script => !scripts[script]);
  return {
    category: "Automation",
    check: "Package scripts",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required scripts exist." : `Missing scripts: ${missing.join(", ")}`
  };
}

function checkRemote(): AuditCheck {
  const remote = run("git", ["remote", "get-url", "origin"]);
  const expected = "ai-saas-security-compliance-fit-gap-public";
  return {
    category: "GitHub",
    check: "Public-edition origin remote",
    passed: Boolean(remote?.includes(expected)),
    details: remote ? `Origin remote: ${remote}` : "No origin remote configured."
  };
}

function checkNoPrivateProvenance(): AuditCheck {
  const findings: string[] = [];
  const privateRepoName = "ai-saas-security-compliance-fit-gap";
  const privateRepoBase = "github.com/a-bonfim-tech/" + privateRepoName;
  const forbidden = [
    "/" + "Users/",
    privateRepoBase + ".git",
    privateRepoBase + "\""
  ];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory)) {
      if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
      const fullPath = path.join(directory, entry);
      const relative = path.relative(process.cwd(), fullPath);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        if (forbidden.some(value => content.includes(value))) findings.push(relative);
      } catch {
        // Ignore non-text files.
      }
    }
  }

  walk(process.cwd());
  return {
    category: "Publication Safety",
    check: "Private provenance markers",
    passed: findings.length === 0,
    details: findings.length === 0 ? "No private provenance markers found." : `Markers found in: ${findings.join(", ")}`
  };
}

type EvidenceClaim = { status: string; foundEvidence: string[] };

export function evaluateEvidenceInvariants(
  evidence: Array<EvidenceLike & { key: string }>,
  claims: EvidenceClaim[],
  expectedContexts: Readonly<Record<string, ExpectedCollectionContext>> = {}
): AuditCheck {
  const supportingKeys = new Set(claims.flatMap(claim => claim.foundEvidence));
  const unsupported = evidence.filter(item => supportingKeys.has(item.key) && !isPromotableEvidence(item, {
    expectedContext: item.external_target ? expectedContexts[item.key] : undefined
  }).valid);
  const contradictoryClaims = claims.filter(claim => claim.status === "Evidence Sufficient" && claim.foundEvidence.length === 0);
  const passed = unsupported.length === 0 && contradictoryClaims.length === 0;
  return {
    category: "Evidence",
    check: "Presence, promotion and control-support separation",
    passed,
    details: passed
      ? "Persisted non-promotable evidence does not support controls, and sufficient claims have supporting evidence."
      : `Unsupported evidence: ${unsupported.map(item => item.key).join(", ") || "none"}; contradictory sufficient claims: ${contradictoryClaims.length}`
  };
}

function checkEvidenceInvariants(): AuditCheck {
  const evidence = readJson<Array<EvidenceLike & { key: string }>>("evidence/evidence-register.json");
  const report = readJson<{ findings: EvidenceClaim[] }>("reports/json/fit-gap-analysis.json");
  return evaluateEvidenceInvariants(evidence, report.findings);
}

function checkReleaseIntegrity(): AuditCheck {
  if (!exists("reports/release/release-manifest.json")) {
    return {
      category: "Release",
      check: "Worktree-local artifact integrity",
      passed: true,
      details: "Transient worktree manifest is not present. Generate it locally before requesting an integrity comparison; absence makes no release-provenance claim."
    };
  }
  try {
    const manifest = readJson<ReleaseManifest>("reports/release/release-manifest.json");
    const errors = verifyReleaseManifest(process.cwd(), manifest, RELEASE_ARTIFACTS);
    return { category: "Release", check: "Worktree-local artifact integrity", passed: errors.length === 0, details: errors.length ? errors.join(", ") : "Unsigned worktree-local SHA-256 manifest is internally consistent with its base commit." };
  } catch (error) {
    return { category: "Release", check: "Release artifact integrity", passed: false, details: String(error) };
  }
}

function checkSecurityPolicyGate(): AuditCheck {
  const result = run(process.execPath, ["--import", "tsx", "scripts/security-policy-check.ts"]);
  return {
    category: "CI/CD",
    check: "Workflow security policy",
    passed: result !== null,
    details: result === null ? "Workflow security policy failed." : "Immutable references, checkout safety, triggers and permissions passed."
  };
}

function checkSecurityDocumentation(): AuditCheck {
  const required = [
    "docs/security/threat-model.md", "docs/standards/nist-ssdf-crosswalk.md",
    "docs/quality/iso-25010-assessment.md", "docs/audit/control-traceability-matrix.md",
    "docs/portfolio/cybersecurity-case-study.md", "docs/decisions/SDR-005-freshness-and-replay.md"
  ];
  const missing = required.filter(file => !exists(file));
  return { category: "Documentation", check: "Security traceability links", passed: missing.length === 0, details: missing.length ? `Missing: ${missing.join(", ")}` : "Threat, standards, quality, traceability, case-study and decision artifacts exist." };
}

function generateMarkdown(checks: AuditCheck[]): string {
  const passed = checks.filter(check => check.passed).length;
  const failed = checks.length - passed;
  const lines: string[] = [
    "# Final Project Audit Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total checks: ${checks.length}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed}`,
    "",
    "## Checks",
    "",
    "| Category | Check | Status | Details |",
    "|---|---|---|---|"
  ];

  for (const check of checks) {
    const category = escapeMarkdownTableCell(check.category);
    const checkName = escapeMarkdownTableCell(check.check);
    const details = escapeMarkdownTableCell(check.details);
    lines.push(`| ${category} | ${checkName} | ${check.passed ? "PASS" : "FAIL"} | ${details} |`);
  }

  lines.push(
    "",
    "## Interpretation",
    "",
    "This audit checks repository structure, generated outputs, automation, framework coverage, evidence integrity and publication-safety provenance for the public portfolio edition.",
    "",
    "This audit does not validate legal compliance, formal audit readiness or the correctness of external framework mappings.",
    ""
  );
  return lines.join("\n");
}

function main(): void {
  const checks = [
    checkRequiredCoreFiles(),
    checkReports(),
    checkDocumentationCoverage(),
    checkFrameworkCoverage(),
    checkControlCatalog(),
    checkEvidenceRegister(),
    checkPackageScripts(),
    checkEvidenceInvariants(),
    checkReleaseIntegrity(),
    checkSecurityPolicyGate(),
    checkSecurityDocumentation(),
    checkRemote(),
    checkNoPrivateProvenance()
  ];

  fs.mkdirSync(path.join(process.cwd(), "reports/final"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });
  fs.writeFileSync("reports/final/final-project-audit.md", generateMarkdown(checks));
  fs.writeFileSync("reports/json/final-project-audit.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    checks
  }, null, 2));

  console.log("# Final Project Audit");
  console.log("");
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} - ${check.category} / ${check.check}: ${check.details}`);
  }

  const failed = checks.filter(check => !check.passed);
  if (failed.length > 0) {
    console.error("");
    console.error(`Final project audit failed. Failed checks: ${failed.length}`);
    process.exit(1);
  }

  console.log("");
  console.log("Final project audit passed.");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
