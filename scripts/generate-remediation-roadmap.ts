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

type RoadmapItem = {
  controlId: string;
  domain: string;
  title: string;
  status: string;
  risk: string;
  priority: "P0" | "P1" | "P2" | "P3";
  effort: "Low" | "Medium" | "High";
  remediation: string;
  missingEvidence: string[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function ensureDirectory(relativePath: string): void {
  fs.mkdirSync(path.join(process.cwd(), relativePath), { recursive: true });
}

function priorityFor(finding: Finding): "P0" | "P1" | "P2" | "P3" {
  if (finding.risk === "Critical") return "P0";
  if (finding.risk === "High") return "P1";
  if (finding.risk === "Medium") return "P2";
  return "P3";
}

function effortFor(finding: Finding): "Low" | "Medium" | "High" {
  const missing = finding.missingEvidence.length;

  if (finding.domain === "AI Governance" && missing >= 3) return "High";
  if (finding.domain === "Privacy and Data Protection" && missing >= 3) return "High";
  if (finding.domain === "Cloud Security" && missing >= 3) return "High";
  if (missing >= 3) return "Medium";
  if (missing === 2) return "Medium";
  return "Low";
}

function buildRoadmapItem(finding: Finding): RoadmapItem {
  return {
    controlId: finding.controlId,
    domain: finding.domain,
    title: finding.title,
    status: finding.status,
    risk: finding.risk,
    priority: priorityFor(finding),
    effort: effortFor(finding),
    remediation: finding.recommendation,
    missingEvidence: finding.missingEvidence
  };
}

function generateMarkdown(items: RoadmapItem[]): string {
  const lines: string[] = [];

  lines.push("# Remediation Roadmap");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push("This roadmap prioritizes remediation actions based on fit-gap findings, risk level, missing evidence and estimated implementation effort.");
  lines.push("");
  lines.push("## Priority Definitions");
  lines.push("");
  lines.push("| Priority | Meaning |");
  lines.push("|---|---|");
  lines.push("| P0 | Immediate remediation required. |");
  lines.push("| P1 | High-priority remediation for significant exposure. |");
  lines.push("| P2 | Planned remediation for medium-risk issues. |");
  lines.push("| P3 | Low-priority improvement or documentation work. |");
  lines.push("");
  lines.push("## Roadmap");
  lines.push("");
  lines.push("| Priority | Control | Domain | Risk | Effort | Remediation |");
  lines.push("|---|---|---|---|---|---|");

  for (const item of items) {
    lines.push(`| ${item.priority} | ${item.controlId} | ${item.domain} | ${item.risk} | ${item.effort} | ${item.remediation} |`);
  }

  lines.push("");
  lines.push("## Detailed Missing Evidence");
  lines.push("");

  for (const item of items) {
    lines.push(`### ${item.priority} — ${item.controlId}: ${item.title}`);
    lines.push("");
    lines.push(`- Domain: ${item.domain}`);
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Risk: ${item.risk}`);
    lines.push(`- Estimated effort: ${item.effort}`);
    lines.push(`- Remediation: ${item.remediation}`);
    lines.push(`- Missing evidence: ${item.missingEvidence.length > 0 ? item.missingEvidence.join(", ") : "None"}`);
    lines.push("");
  }

  return lines.join("\n");
}

function generateCsv(items: RoadmapItem[]): string {
  const header = [
    "priority",
    "control_id",
    "domain",
    "title",
    "status",
    "risk",
    "effort",
    "remediation",
    "missing_evidence"
  ];

  const rows = items.map(item => [
    item.priority,
    item.controlId,
    item.domain,
    item.title,
    item.status,
    item.risk,
    item.effort,
    item.remediation,
    item.missingEvidence.join("; ")
  ]);

  return [header, ...rows]
    .map(row => row.map(value => {
      const normalized = value.replace(/\n/g, " ").replace(/\r/g, " ");
      if (normalized.includes(",") || normalized.includes('"')) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    }).join(","))
    .join("\n");
}

function main(): void {
  ensureDirectory("reports/roadmap");
  ensureDirectory("reports/json");
  ensureDirectory("reports/csv");

  const report = readJson<Report>("reports/json/fit-gap-analysis.json");

  const roadmapItems = report.findings
    .filter(finding => finding.status !== "Compliant")
    .map(buildRoadmapItem)
    .sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return order[a.priority] - order[b.priority];
    });

  fs.writeFileSync("reports/roadmap/remediation-roadmap.md", generateMarkdown(roadmapItems));
  fs.writeFileSync("reports/json/remediation-roadmap.json", JSON.stringify(roadmapItems, null, 2));
  fs.writeFileSync("reports/csv/remediation-roadmap.csv", generateCsv(roadmapItems));

  console.log("Remediation roadmap generated.");
  console.log("Markdown: reports/roadmap/remediation-roadmap.md");
  console.log("JSON: reports/json/remediation-roadmap.json");
  console.log("CSV: reports/csv/remediation-roadmap.csv");
}

main();
