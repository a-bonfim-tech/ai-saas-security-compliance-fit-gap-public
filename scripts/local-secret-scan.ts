import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { escapeMarkdownTableCell } from "./markdown-table";
import { detectAndMaskSecrets } from "./secret-patterns";

type Finding = {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
};

export type ScanCoverage = {
  files_scanned: number;
  files_skipped_symlink: number;
  files_skipped_oversize: number;
  files_skipped_binary: number;
  files_skipped_unreadable: number;
  files_skipped_other: number;
};

export type ScanResult = "CLEAN_COMPLETE" | "CLEAN_WITH_SKIPPED_FILES" | "FINDINGS_DETECTED" | "ERROR";
type WalkResult = { files: string[]; coverage: ScanCoverage };

const excludedDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  "coverage"
]);

const excludedFiles = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock"
]);
const maximumFileBytes = 5 * 1024 * 1024;

export function emptyCoverage(): ScanCoverage {
  return { files_scanned: 0, files_skipped_symlink: 0, files_skipped_oversize: 0, files_skipped_binary: 0, files_skipped_unreadable: 0, files_skipped_other: 0 };
}

export function walk(directory: string, root = process.cwd(), coverage = emptyCoverage()): WalkResult {
  const files: string[] = [];

  let entries: string[];
  try { entries = fs.readdirSync(directory); } catch { coverage.files_skipped_unreadable++; return { files, coverage }; }
  for (const entry of entries) {
    if (excludedDirectories.has(entry)) continue;

    const fullPath = path.join(directory, entry);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(fullPath); } catch { coverage.files_skipped_unreadable++; continue; }

    if (stat.isSymbolicLink()) { coverage.files_skipped_symlink++; continue; }

    if (stat.isDirectory()) {
      files.push(...walk(fullPath, root, coverage).files);
    } else if (stat.isFile()) {
      const relativePath = path.relative(root, fullPath);
      if (excludedFiles.has(relativePath) || excludedFiles.has(entry)) continue;
      if (stat.size > maximumFileBytes) { coverage.files_skipped_oversize++; continue; }
      files.push(fullPath);
    } else {
      coverage.files_skipped_other++;
    }
  }

  return { files, coverage };
}

function isProbablyBinary(filePath: string): boolean {
  const buffer = fs.readFileSync(filePath);
  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  return sample.includes(0);
}

function scanFile(filePath: string, coverage: ScanCoverage, root = process.cwd()): Finding[] {
  try {
    if (isProbablyBinary(filePath)) { coverage.files_skipped_binary++; return []; }
  } catch { coverage.files_skipped_unreadable++; return []; }

  const relativePath = path.relative(root, filePath);
  let content: string;
  try { content = fs.readFileSync(filePath, "utf8"); } catch { coverage.files_skipped_unreadable++; return []; }
  coverage.files_scanned++;
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    for (const detected of detectAndMaskSecrets(line)) {
      findings.push({
        file: relativePath,
        line: index + 1,
        pattern: detected.pattern,
        excerpt: detected.excerpt
      });
    }
  }

  return findings;
}

export function determineScanResult(findings: Finding[], coverage: ScanCoverage): ScanResult {
  if (coverage.files_skipped_unreadable > 0 || coverage.files_skipped_other > 0) return "ERROR";
  if (findings.length > 0) return "FINDINGS_DETECTED";
  const skipped = coverage.files_skipped_symlink + coverage.files_skipped_oversize + coverage.files_skipped_binary;
  return skipped > 0 ? "CLEAN_WITH_SKIPPED_FILES" : "CLEAN_COMPLETE";
}

export function generateMarkdown(findings: Finding[], coverage: ScanCoverage, result: ScanResult): string {
  const lines: string[] = [];

  lines.push("# Local Secret Scan Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Findings: ${findings.length}`);
  lines.push(`- SCAN_RESULT=${result}`);
  for (const [key, value] of Object.entries(coverage)) lines.push(`- ${key}: ${value}`);
  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("This is a lightweight local scan for common secret patterns. It is not a replacement for professional secret scanning tools such as GitHub Secret Scanning, Gitleaks or TruffleHog.");
  lines.push("");

  if (result === "CLEAN_COMPLETE") {
    lines.push("No suspicious secret patterns were detected by this local scanner.");
    lines.push("");
    return lines.join("\n");
  }

  if (result === "CLEAN_WITH_SKIPPED_FILES") {
    lines.push("No suspicious secret patterns were detected in scanned files. Coverage is partial because one or more files were skipped by explicit policy.");
    lines.push("");
    return lines.join("\n");
  }

  if (result === "ERROR") {
    lines.push("The scan did not complete because one or more files could not be inspected safely.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Findings");
  lines.push("");
  lines.push("| File | Line | Pattern | Excerpt |");
  lines.push("|---|---:|---|---|");

  for (const finding of findings) {
    const file = escapeMarkdownTableCell(finding.file);
    const pattern = escapeMarkdownTableCell(finding.pattern);
    const excerpt = escapeMarkdownTableCell(finding.excerpt);
    lines.push(`| ${file} | ${finding.line} | ${pattern} | ${excerpt} |`);
  }

  lines.push("");
  lines.push("## Recommended Action");
  lines.push("");
  lines.push("Review each finding manually. If a real secret was committed, rotate the secret immediately and remove it from Git history using an approved process.");
  lines.push("");

  return lines.join("\n");
}

export function runSecretScan(root = process.cwd()): { findings: Finding[]; coverage: ScanCoverage; result: ScanResult } {
  const { files, coverage } = walk(root, root);
  const findings = files.flatMap(file => scanFile(file, coverage, root));
  return { findings, coverage, result: determineScanResult(findings, coverage) };
}

function main(): void {
  const { findings, coverage, result } = runSecretScan(process.cwd());

  fs.mkdirSync(path.join(process.cwd(), "reports/security"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });

  fs.writeFileSync("reports/security/local-secret-scan-report.md", generateMarkdown(findings, coverage, result));
  fs.writeFileSync("reports/json/local-secret-scan-report.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    scanResult: result,
    coverage,
    findings
  }, null, 2));

  console.log("Local secret scan completed.");
  console.log(`Findings: ${findings.length}`);
  console.log(`SCAN_RESULT=${result}`);
  console.log("Markdown: reports/security/local-secret-scan-report.md");
  console.log("JSON: reports/json/local-secret-scan-report.json");

  if (result === "FINDINGS_DETECTED" || result === "ERROR") {
    console.error("Potential secret patterns found. Review the report before publishing.");
    process.exit(1);
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
