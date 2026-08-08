import fs from "fs";
import path from "path";

type Finding = {
  controlId: string;
  domain: string;
  title: string;
  frameworks: string[];
  status: "Compliant" | "Partial" | "Gap";
  risk: "Low" | "Medium" | "High" | "Critical";
  foundEvidence: string[];
  missingEvidence: string[];
  recommendation: string;
};

type Report = {
  generatedAt: string;
  methodology: string;
  summary: {
    totalControls: number;
    compliant: number;
    partial: number;
    gaps: number;
    highRiskFindings: number;
    mediumRiskFindings: number;
    lowRiskFindings: number;
  };
  findings: Finding[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function ensureDirectory(relativePath: string): void {
  fs.mkdirSync(path.join(process.cwd(), relativePath), { recursive: true });
}

function percentage(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function main(): void {
  ensureDirectory("reports/executive");

  const report = readJson<Report>("reports/json/fit-gap-analysis.json");

  const highRisk = report.findings.filter(finding => finding.risk === "High" || finding.risk === "Critical");
  const gaps = report.findings.filter(finding => finding.status === "Gap");
  const partial = report.findings.filter(finding => finding.status === "Partial");
  const domains = Array.from(new Set(report.findings.map(finding => finding.domain))).sort();

  const lines: string[] = [];

  lines.push("# Executive Security & Compliance Readiness Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Executive Overview");
  lines.push("");
  lines.push("This report summarizes the current security and compliance readiness posture for an AI-enabled B2B SaaS environment using an evidence-based fit-gap analysis model.");
  lines.push("");
  lines.push("The analysis maps security, privacy and AI governance requirements to controls, compares those controls against available evidence and produces risk-rated findings with remediation recommendations.");
  lines.push("");
  lines.push("## Readiness Snapshot");
  lines.push("");
  lines.push(`- Total controls assessed: ${report.summary.totalControls}`);
  lines.push(`- Compliant controls: ${report.summary.compliant} (${percentage(report.summary.compliant, report.summary.totalControls)})`);
  lines.push(`- Partially covered controls: ${report.summary.partial} (${percentage(report.summary.partial, report.summary.totalControls)})`);
  lines.push(`- Open gaps: ${report.summary.gaps} (${percentage(report.summary.gaps, report.summary.totalControls)})`);
  lines.push(`- High-risk findings: ${report.summary.highRiskFindings}`);
  lines.push(`- Medium-risk findings: ${report.summary.mediumRiskFindings}`);
  lines.push(`- Low-risk findings: ${report.summary.lowRiskFindings}`);
  lines.push("");
  lines.push("## Domains Assessed");
  lines.push("");
  for (const domain of domains) {
    lines.push(`- ${domain}`);
  }
  lines.push("");
  lines.push("## Key Risks");
  lines.push("");
  if (highRisk.length === 0) {
    lines.push("No high-risk or critical findings are currently reported.");
  } else {
    for (const finding of highRisk) {
      lines.push(`- ${finding.controlId} (${finding.domain}): ${finding.title}`);
    }
  }
  lines.push("");
  lines.push("## Main Gaps");
  lines.push("");
  if (gaps.length === 0) {
    lines.push("No full gaps are currently reported.");
  } else {
    for (const finding of gaps) {
      lines.push(`- ${finding.controlId} (${finding.domain}): ${finding.title}`);
    }
  }
  lines.push("");
  lines.push("## Partially Covered Areas");
  lines.push("");
  if (partial.length === 0) {
    lines.push("No partially covered controls are currently reported.");
  } else {
    for (const finding of partial) {
      lines.push(`- ${finding.controlId} (${finding.domain}): ${finding.title}`);
    }
  }
  lines.push("");
  lines.push("## Recommended Leadership Actions");
  lines.push("");
  lines.push("1. Confirm product scope, data flows and AI system boundaries.");
  lines.push("2. Assign owners for security governance, privacy and AI governance.");
  lines.push("3. Prioritize high-risk gaps in access control, logging, privacy and AI governance.");
  lines.push("4. Convert undocumented practices into verifiable evidence.");
  lines.push("5. Use the remediation roadmap to coordinate engineering and compliance work.");
  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("This report is not a formal audit or legal opinion. It is a structured readiness assessment designed to support security, engineering, product and leadership decision-making.");
  lines.push("");

  fs.writeFileSync("reports/executive/executive-readiness-report.md", lines.join("\n"));

  console.log("Executive report generated.");
  console.log("Output: reports/executive/executive-readiness-report.md");
}

main();
