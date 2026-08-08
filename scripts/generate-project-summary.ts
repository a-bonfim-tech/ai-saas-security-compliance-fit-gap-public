import fs from "fs";
import path from "path";

type Summary = {
  totalControls: number;
  compliant: number;
  partial: number;
  gaps: number;
  highRiskFindings: number;
  mediumRiskFindings: number;
  lowRiskFindings: number;
};

type Finding = {
  controlId: string;
  domain: string;
  title: string;
  frameworks: string[];
  status: string;
  risk: string;
  foundEvidence: string[];
  missingEvidence: string[];
  recommendation: string;
};

type Report = {
  generatedAt: string;
  methodology: string;
  summary: Summary;
  findings: Finding[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function main(): void {
  const report = readJson<Report>("reports/json/fit-gap-analysis.json");

  const domains = unique(report.findings.map(finding => finding.domain));
  const frameworks = unique(report.findings.flatMap(finding => finding.frameworks));
  const highRisk = report.findings.filter(finding => finding.risk === "High");
  const gaps = report.findings.filter(finding => finding.status === "Gap");

  const lines: string[] = [];

  lines.push("# Portfolio Project Summary");
  lines.push("");
  lines.push("## Project");
  lines.push("");
  lines.push("AI SaaS Security & Compliance Fit-Gap Automation Lab");
  lines.push("");
  lines.push("## Professional Positioning");
  lines.push("");
  lines.push("This project demonstrates evidence-based security, privacy and AI governance assessment for AI-enabled B2B SaaS environments. It translates frameworks into controls, evidence requirements, fit-gap findings, risk ratings and remediation recommendations.");
  lines.push("");
  lines.push("## Core Methodology");
  lines.push("");
  lines.push("Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap");
  lines.push("");
  lines.push("## Frameworks Represented");
  lines.push("");
  for (const framework of frameworks) {
    lines.push(`- ${framework}`);
  }
  lines.push("");
  lines.push("## Domains Covered");
  lines.push("");
  for (const domain of domains) {
    lines.push(`- ${domain}`);
  }
  lines.push("");
  lines.push("## Current Analysis Summary");
  lines.push("");
  lines.push(`- Total controls assessed: ${report.summary.totalControls}`);
  lines.push(`- Compliant controls: ${report.summary.compliant}`);
  lines.push(`- Partially covered controls: ${report.summary.partial}`);
  lines.push(`- Gaps: ${report.summary.gaps}`);
  lines.push(`- High-risk findings: ${report.summary.highRiskFindings}`);
  lines.push(`- Medium-risk findings: ${report.summary.mediumRiskFindings}`);
  lines.push(`- Low-risk findings: ${report.summary.lowRiskFindings}`);
  lines.push("");
  lines.push("## High-Risk Findings");
  lines.push("");
  if (highRisk.length === 0) {
    lines.push("No high-risk findings are currently reported.");
  } else {
    for (const finding of highRisk) {
      lines.push(`- ${finding.controlId} (${finding.domain}): ${finding.title}`);
    }
  }
  lines.push("");
  lines.push("## Open Gaps");
  lines.push("");
  if (gaps.length === 0) {
    lines.push("No full gaps are currently reported.");
  } else {
    for (const finding of gaps) {
      lines.push(`- ${finding.controlId} (${finding.domain}): ${finding.title}`);
    }
  }
  lines.push("");
  lines.push("## Professional Relevance");
  lines.push("");
  lines.push("This repository is directly relevant to cybersecurity assessment work involving B2B SaaS compliance readiness, GitHub security, secure SDLC, application security, cloud security, privacy engineering and AI governance.");
  lines.push("");
  lines.push("## CV Bullet");
  lines.push("");
  lines.push("Built a TypeScript-based security and compliance fit-gap analysis lab for AI-enabled B2B SaaS products, mapping NIST CSF 2.0, ISO 27001, SOC 2, GDPR, EU AI Act and OWASP requirements to technical evidence from GitHub, cloud, application security and AI governance practices, producing risk-rated findings and remediation recommendations.");
  lines.push("");

  fs.writeFileSync("docs/portfolio-project-summary.md", lines.join("\n"));

  console.log("Portfolio project summary generated.");
  console.log("Output: docs/portfolio-project-summary.md");
}

main();
