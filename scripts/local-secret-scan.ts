import fs from "fs";
import path from "path";

type Finding = {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
};

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

const patterns: { name: string; regex: RegExp }[] = [
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { name: "OpenAI API key", regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Private key block", regex: /-----BEGIN (RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/g },
  { name: "Generic password assignment", regex: /(password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/gi },
  { name: "Generic secret assignment", regex: /(secret|token|api_key|apikey)\s*[:=]\s*["'][^"']{12,}["']/gi }
];

function walk(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory)) {
    if (excludedDirectories.has(entry)) continue;

    const fullPath = path.join(directory, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      const relativePath = path.relative(process.cwd(), fullPath);
      if (!excludedFiles.has(relativePath) && !excludedFiles.has(entry)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function isProbablyBinary(filePath: string): boolean {
  const buffer = fs.readFileSync(filePath);
  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  return sample.includes(0);
}

function scanFile(filePath: string): Finding[] {
  if (isProbablyBinary(filePath)) return [];

  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          pattern: pattern.name,
          excerpt: line.length > 180 ? `${line.slice(0, 180)}...` : line
        });
      }
    }
  }

  return findings;
}

function generateMarkdown(findings: Finding[]): string {
  const lines: string[] = [];

  lines.push("# Local Secret Scan Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Findings: ${findings.length}`);
  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("This is a lightweight local scan for common secret patterns. It is not a replacement for professional secret scanning tools such as GitHub Secret Scanning, Gitleaks or TruffleHog.");
  lines.push("");

  if (findings.length === 0) {
    lines.push("No suspicious secret patterns were detected by this local scanner.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Findings");
  lines.push("");
  lines.push("| File | Line | Pattern | Excerpt |");
  lines.push("|---|---:|---|---|");

  for (const finding of findings) {
    const excerpt = finding.excerpt.replace(/\|/g, "\\|");
    lines.push(`| ${finding.file} | ${finding.line} | ${finding.pattern} | \`${excerpt}\` |`);
  }

  lines.push("");
  lines.push("## Recommended Action");
  lines.push("");
  lines.push("Review each finding manually. If a real secret was committed, rotate the secret immediately and remove it from Git history using an approved process.");
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  const files = walk(process.cwd());
  const findings = files.flatMap(scanFile);

  fs.mkdirSync(path.join(process.cwd(), "reports/security"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });

  fs.writeFileSync("reports/security/local-secret-scan-report.md", generateMarkdown(findings));
  fs.writeFileSync("reports/json/local-secret-scan-report.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    findings
  }, null, 2));

  console.log("Local secret scan completed.");
  console.log(`Findings: ${findings.length}`);
  console.log("Markdown: reports/security/local-secret-scan-report.md");
  console.log("JSON: reports/json/local-secret-scan-report.json");

  if (findings.length > 0) {
    console.error("Potential secret patterns found. Review the report before publishing.");
    process.exit(1);
  }
}

main();
