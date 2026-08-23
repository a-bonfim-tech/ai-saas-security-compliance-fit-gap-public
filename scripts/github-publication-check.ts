import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "child_process";
import { escapeMarkdownTableCell } from "./markdown-table";

type PublicationCheck = {
  check: string;
  status: "PASS" | "FAIL" | "UNVERIFIED";
  details: string;
};

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

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function scanForForbiddenEnvFiles(): string[] {
  const findings: string[] = [];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory)) {
      if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;

      const fullPath = path.join(directory, entry);
      const relative = path.relative(process.cwd(), fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.startsWith(".env") && entry !== ".env.example") {
        findings.push(relative);
      }
    }
  }

  walk(process.cwd());
  return findings;
}

function getMeaningfulGitChanges(): string[] {
  const status = run("git", ["status", "--short"]) ?? "";

  return status
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.includes("reports/final/github-publication-check.md"))
    .filter(line => !line.includes("reports/json/github-publication-check.json"));
}

export function decodeMarkdownTarget(target: string): { decoded?: string; error?: "BROKEN_OR_MALFORMED_MARKDOWN_LINK" } {
  try {
    return { decoded: decodeURIComponent(target.replace(/^<|>$/g, "")) };
  } catch {
    return { error: "BROKEN_OR_MALFORMED_MARKDOWN_LINK" };
  }
}

export function classifyMarkdownTarget(target: string, baseDirectory: string): "IGNORED" | "VALID" | "MISSING" | "BROKEN_OR_MALFORMED_MARKDOWN_LINK" {
  const withoutAnchor = target.split("#")[0];
  if (!withoutAnchor || /^(?:https?:|mailto:|#)/.test(target) || target.startsWith("/")) return "IGNORED";
  const decoded = decodeMarkdownTarget(withoutAnchor);
  if (decoded.error) return decoded.error;
  return fs.existsSync(path.resolve(baseDirectory, decoded.decoded!)) ? "VALID" : "MISSING";
}

function scanTrackedPublicationContent(): { machineSpecific: string[]; brokenLinks: string[] } {
  const tracked = (run("git", ["ls-files", "--cached", "--others", "--exclude-standard"]) ?? "").split("\n").filter(Boolean);
  const machineSpecific: string[] = [];
  const brokenLinks: string[] = [];
  for (const relative of tracked) {
    const full = path.join(process.cwd(), relative);
    if (!fs.existsSync(full) || fs.lstatSync(full).isSymbolicLink()) continue;
    let content: string;
    try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
    if (/(?:\/Users\/[^/\s]+|\/private\/var\/folders\/|\/var\/folders\/)/.test(content)) machineSpecific.push(relative);
    if (!relative.endsWith(".md")) continue;
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      const classification = classifyMarkdownTarget(target, path.dirname(full));
      if (classification === "MISSING" || classification === "BROKEN_OR_MALFORMED_MARKDOWN_LINK") {
        brokenLinks.push(`${relative} -> ${target} (${classification})`);
      }
    }
  }
  return { machineSpecific, brokenLinks };
}

function main(): void {
  fs.mkdirSync(path.join(process.cwd(), "reports/final"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });

  const checks: PublicationCheck[] = [];

  const meaningfulChangesBeforeReportWrite = getMeaningfulGitChanges();

  checks.push({
    check: "Git working tree",
    status: meaningfulChangesBeforeReportWrite.length === 0 ? "PASS" : "FAIL",
    details: meaningfulChangesBeforeReportWrite.length === 0
      ? "Working tree has no meaningful uncommitted changes. Publication-check report files are ignored for this check because the command regenerates them."
      : `Working tree has meaningful uncommitted changes: ${meaningfulChangesBeforeReportWrite.join("; ")}`
  });

  const remote = run("git", ["remote", "get-url", "origin"]);
  checks.push({
    check: "Git remote",
    status: remote ? "PASS" : "FAIL",
    details: remote ? `Origin remote configured: ${remote}` : "Origin remote missing."
  });

  const envFiles = scanForForbiddenEnvFiles();
  checks.push({
    check: "Forbidden .env files",
    status: envFiles.length === 0 ? "PASS" : "FAIL",
    details: envFiles.length === 0 ? "No forbidden .env files found." : `Forbidden files: ${envFiles.join(", ")}`
  });

  const requiredDocs = [
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "docs/publication-readiness.md",
    "docs/final/github-final-actions.md",
    "docs/final/project-completion-summary.md",
    "docs/index/project-index.md"
  ];

  const missingDocs = requiredDocs.filter(file => !exists(file));
  checks.push({
    check: "Publication documentation",
    status: missingDocs.length === 0 ? "PASS" : "FAIL",
    details: missingDocs.length === 0 ? "Publication documentation exists." : `Missing docs: ${missingDocs.join(", ")}`
  });

  const requiredReports = [
    "reports/final/final-project-audit.md",
    "reports/security/local-secret-scan-report.md",
    "reports/executive/executive-readiness-report.md",
    "reports/roadmap/remediation-roadmap.md"
  ];

  const missingReports = requiredReports.filter(file => !exists(file));
  checks.push({
    check: "Publication reports",
    status: missingReports.length === 0 ? "PASS" : "FAIL",
    details: missingReports.length === 0 ? "Publication reports exist." : `Missing reports: ${missingReports.join(", ")}`
  });

  const repoInfo = run("gh", ["repo", "view", "--json", "nameWithOwner,visibility,isPrivate,url,description"]);
  checks.push({
    check: "GitHub repository metadata access",
    status: repoInfo ? "PASS" : "UNVERIFIED",
    details: repoInfo ? "GitHub repository metadata is accessible." : "GitHub repository metadata is unavailable in this execution context; no enabled/disabled conclusion is drawn."
  });

  const publicationContent = scanTrackedPublicationContent();
  checks.push({
    check: "Machine-specific tracked content",
    status: publicationContent.machineSpecific.length === 0 ? "PASS" : "FAIL",
    details: publicationContent.machineSpecific.length === 0 ? "No absolute local user or temporary paths found in tracked content." : publicationContent.machineSpecific.join(", ")
  });
  checks.push({
    check: "Relative documentation links",
    status: publicationContent.brokenLinks.length === 0 ? "PASS" : "FAIL",
    details: publicationContent.brokenLinks.length === 0 ? "Tracked relative Markdown links resolve locally." : publicationContent.brokenLinks.join(", ")
  });

  const generatedAt = new Date().toISOString();

  const lines: string[] = [];

  lines.push("# GitHub Publication Check");
  lines.push("");
  lines.push(`Generated at: ${generatedAt}`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  lines.push("| Check | Status | Details |");
  lines.push("|---|---|---|");

  for (const check of checks) {
    const checkName = escapeMarkdownTableCell(check.check);
    const details = escapeMarkdownTableCell(check.details);
    lines.push(`| ${checkName} | ${check.status} | ${details} |`);
  }

  lines.push("");
  lines.push("## Recommendation");
  lines.push("");

  const failed = checks.filter(check => check.status === "FAIL");

  if (failed.length === 0) {
    lines.push("The repository passed the local publication checks. Before making it public, still review GitHub settings and confirm that no real company, customer or confidential data is present.");
  } else {
    lines.push("The repository did not pass all publication checks. Fix the failed checks before making the repository public.");
  }

  lines.push("");

  fs.writeFileSync("reports/final/github-publication-check.md", lines.join("\n"));
  fs.writeFileSync("reports/json/github-publication-check.json", JSON.stringify({
    generatedAt,
    checks
  }, null, 2));

  console.log("# GitHub Publication Check");
  console.log("");

  for (const check of checks) {
    console.log(`${check.status} - ${check.check}: ${check.details}`);
  }

  if (failed.length > 0) {
    console.error("");
    console.error(`Publication check failed. Failed checks: ${failed.length}`);
    process.exit(1);
  }

  console.log("");
  console.log("GitHub publication check passed.");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
