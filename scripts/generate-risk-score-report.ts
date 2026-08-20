import fs from "fs";
import path from "path";

type Finding = {
  controlId: string;
  domain: string;
  title: string;
  frameworks: string[];
  status: "Evidence Sufficient" | "Evidence Partial" | "Evidence Gap";
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
    evidenceSufficient: number;
    evidencePartial: number;
    evidenceGaps: number;
    highRiskFindings: number;
    mediumRiskFindings: number;
    lowRiskFindings: number;
  };
  findings: Finding[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function riskScore(finding: Finding): number {
  const riskBase = {
    Critical: 100,
    High: 75,
    Medium: 50,
    Low: 25
  }[finding.risk];

  const statusModifier = {
    "Evidence Gap": 20,
    "Evidence Partial": 10,
    "Evidence Sufficient": 0
  }[finding.status];

  const missingEvidenceModifier = Math.min(finding.missingEvidence.length * 3, 15);

  return Math.min(riskBase + statusModifier + missingEvidenceModifier, 100);
}

function main(): void {
  const report = readJson<Report>("reports/json/fit-gap-analysis.json");

  const scored = report.findings.map(finding => ({
    controlId: finding.controlId,
    domain: finding.domain,
    title: finding.title,
    status: finding.status,
    risk: finding.risk,
    score: riskScore(finding),
    missingEvidenceCount: finding.missingEvidence.length,
    missingEvidence: finding.missingEvidence,
    recommendation: finding.recommendation
  })).sort((a, b) => b.score - a.score);

  const lines: string[] = [];

  lines.push("# Risk Score Report");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push("This report adds a simple numeric risk score to each fit-gap finding. The score is intended for prioritization, not formal quantitative risk analysis.");
  lines.push("");
  lines.push("## Scoring Logic");
  lines.push("");
  lines.push("- Critical risk starts at 100.");
  lines.push("- High risk starts at 75.");
  lines.push("- Medium risk starts at 50.");
  lines.push("- Low risk starts at 25.");
  lines.push("- Evidence Gap status adds 20.");
  lines.push("- Evidence Partial status adds 10.");
  lines.push("- Missing evidence adds up to 15 additional points.");
  lines.push("- Maximum score is capped at 100.");
  lines.push("");
  lines.push("## Scored Findings");
  lines.push("");
  lines.push("| Score | Control | Domain | Status | Risk | Missing Evidence |");
  lines.push("|---|---|---|---|---|---|");

  for (const item of scored) {
    lines.push(`| ${item.score} | ${item.controlId} | ${item.domain} | ${item.status} | ${item.risk} | ${item.missingEvidenceCount} |`);
  }

  fs.writeFileSync("reports/risk-score-report.md", lines.join("\n"));
  fs.writeFileSync("reports/json/risk-score-report.json", JSON.stringify(scored, null, 2));

  console.log("Risk score report generated.");
  console.log("Markdown: reports/risk-score-report.md");
  console.log("JSON: reports/json/risk-score-report.json");
}

main();
