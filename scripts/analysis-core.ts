export type Control = {
  id: string;
  domain: string;
  title: string;
  frameworks: string[];
  expectedEvidence: string[];
};

export type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
};

export type Status = "Compliant" | "Partial" | "Gap";

export type Risk = "Low" | "Medium" | "High" | "Critical";

export type Finding = {
  controlId: string;
  domain: string;
  title: string;
  frameworks: string[];
  status: Status;
  risk: Risk;
  foundEvidence: string[];
  missingEvidence: string[];
  recommendation: string;
};

export type Summary = {
  totalControls: number;
  compliant: number;
  partial: number;
  gaps: number;
  highRiskFindings: number;
  mediumRiskFindings: number;
  lowRiskFindings: number;
};

export type Report = {
  generatedAt: string;
  methodology: string;
  summary: Summary;
  findings: Finding[];
};

export function calculateStatus(expected: string[], found: string[]): Status {
  if (found.length === expected.length) return "Compliant";
  if (found.length > 0) return "Partial";
  return "Gap";
}

export function calculateRisk(status: Status, domain: string): Risk {
  if (status === "Compliant") return "Low";

  const highRiskDomains = [
    "Identity and Access Management",
    "Privacy and Data Protection",
    "AI Governance",
    "Logging and Monitoring",
    "Cloud Security"
  ];

  if (status === "Gap" && highRiskDomains.includes(domain)) return "High";
  if (status === "Gap") return "Medium";
  return "Medium";
}

export function buildRecommendation(status: Status, missingEvidence: string[]): string {
  if (status === "Compliant") {
    return "Maintain the control and periodically refresh the supporting evidence.";
  }

  return `Implement or document the following missing evidence: ${missingEvidence.join(", ")}.`;
}

export function assessControl(control: Control, evidence: Evidence[]): Finding {
  const foundEvidence = control.expectedEvidence.filter(expected =>
    evidence.some(item => item.key === expected && item.present)
  );

  const missingEvidence = control.expectedEvidence.filter(
    expected => !foundEvidence.includes(expected)
  );

  const status = calculateStatus(control.expectedEvidence, foundEvidence);
  const risk = calculateRisk(status, control.domain);

  return {
    controlId: control.id,
    domain: control.domain,
    title: control.title,
    frameworks: control.frameworks,
    status,
    risk,
    foundEvidence,
    missingEvidence,
    recommendation: buildRecommendation(status, missingEvidence)
  };
}

export function buildSummary(findings: Finding[]): Summary {
  return {
    totalControls: findings.length,
    compliant: findings.filter(finding => finding.status === "Compliant").length,
    partial: findings.filter(finding => finding.status === "Partial").length,
    gaps: findings.filter(finding => finding.status === "Gap").length,
    highRiskFindings: findings.filter(finding => finding.risk === "High").length,
    mediumRiskFindings: findings.filter(finding => finding.risk === "Medium").length,
    lowRiskFindings: findings.filter(finding => finding.risk === "Low").length
  };
}

export function csvEscape(value: string): string {
  const normalized = value.replace(/\n/g, " ").replace(/\r/g, " ");
  if (normalized.includes(",") || normalized.includes('"')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function generateCsv(findings: Finding[]): string {
  const header = [
    "control_id",
    "domain",
    "title",
    "frameworks",
    "status",
    "risk",
    "found_evidence",
    "missing_evidence",
    "recommendation"
  ];

  const rows = findings.map(finding => [
    finding.controlId,
    finding.domain,
    finding.title,
    finding.frameworks.join("; "),
    finding.status,
    finding.risk,
    finding.foundEvidence.join("; "),
    finding.missingEvidence.join("; "),
    finding.recommendation
  ]);

  return [header, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\n");
}

export function generateMarkdown(report: Report): string {
  const lines: string[] = [];

  lines.push("# Fit-Gap Analysis Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Methodology");
  lines.push("");
  lines.push(report.methodology);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`- Total controls assessed: ${report.summary.totalControls}`);
  lines.push(`- Compliant controls: ${report.summary.compliant}`);
  lines.push(`- Partially covered controls: ${report.summary.partial}`);
  lines.push(`- Gaps: ${report.summary.gaps}`);
  lines.push(`- High-risk findings: ${report.summary.highRiskFindings}`);
  lines.push(`- Medium-risk findings: ${report.summary.mediumRiskFindings}`);
  lines.push(`- Low-risk findings: ${report.summary.lowRiskFindings}`);
  lines.push("");

  lines.push("## Findings");
  lines.push("");
  lines.push("| Control ID | Domain | Status | Risk | Recommendation |");
  lines.push("|---|---|---|---|---|");

  for (const finding of report.findings) {
    lines.push(
      `| ${finding.controlId} | ${finding.domain} | ${finding.status} | ${finding.risk} | ${finding.recommendation} |`
    );
  }

  lines.push("");
  lines.push("## Detailed Evidence Mapping");
  lines.push("");

  for (const finding of report.findings) {
    lines.push(`### ${finding.controlId} — ${finding.title}`);
    lines.push("");
    lines.push(`Frameworks: ${finding.frameworks.join(", ")}`);
    lines.push("");
    lines.push(`Status: ${finding.status}`);
    lines.push("");
    lines.push(`Risk: ${finding.risk}`);
    lines.push("");
    lines.push(`Found evidence: ${finding.foundEvidence.length > 0 ? finding.foundEvidence.join(", ") : "None"}`);
    lines.push("");
    lines.push(`Missing evidence: ${finding.missingEvidence.length > 0 ? finding.missingEvidence.join(", ") : "None"}`);
    lines.push("");
    lines.push(`Recommendation: ${finding.recommendation}`);
    lines.push("");
  }

  return lines.join("\n");
}
