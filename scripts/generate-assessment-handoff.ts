import fs from "fs";
import path from "path";

type ReportSummary = {
  totalControls: number;
  compliant: number;
  partial: number;
  gaps: number;
  highRiskFindings: number;
  mediumRiskFindings: number;
  lowRiskFindings: number;
};

type FitGapReport = {
  generatedAt: string;
  methodology: string;
  summary: ReportSummary;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function main(): void {
  const report = readJson<FitGapReport>("reports/json/fit-gap-analysis.json");

  const lines: string[] = [];

  lines.push("# Security Assessment Handoff Package");
  lines.push("");
  lines.push("## Project Title");
  lines.push("");
  lines.push("AI SaaS Security & Compliance Fit-Gap Automation Lab");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push("This package summarizes the repository as a security assessment and portfolio artifact for AI-enabled B2B SaaS security, compliance automation, secure SDLC, cloud security, privacy and AI governance.");
  lines.push("");
  lines.push("## Core Methodology");
  lines.push("");
  lines.push("Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap");
  lines.push("");
  lines.push("## Current Repository Capabilities");
  lines.push("");
  lines.push("- Normalized control catalog.");
  lines.push("- Evidence register.");
  lines.push("- Local GitHub evidence collector.");
  lines.push("- Remote GitHub evidence collector using GitHub CLI.");
  lines.push("- Domain evidence ingestion for application, cloud, privacy and AI governance.");
  lines.push("- Fit-gap analysis engine.");
  lines.push("- Markdown, JSON and CSV reports.");
  lines.push("- Remediation roadmap.");
  lines.push("- Executive readiness report.");
  lines.push("- Risk score report.");
  lines.push("- Portfolio project summary.");
  lines.push("- Automated tests.");
  lines.push("- Repository validation.");
  lines.push("- Release readiness checks.");
  lines.push("- Local secret scan helper.");
  lines.push("");
  lines.push("## Current Fit-Gap Summary");
  lines.push("");
  lines.push(`- Generated at: ${report.generatedAt}`);
  lines.push(`- Total controls assessed: ${report.summary.totalControls}`);
  lines.push(`- Compliant controls: ${report.summary.compliant}`);
  lines.push(`- Partially covered controls: ${report.summary.partial}`);
  lines.push(`- Gaps: ${report.summary.gaps}`);
  lines.push(`- High-risk findings: ${report.summary.highRiskFindings}`);
  lines.push(`- Medium-risk findings: ${report.summary.mediumRiskFindings}`);
  lines.push(`- Low-risk findings: ${report.summary.lowRiskFindings}`);
  lines.push("");
  lines.push("## How to Demonstrate the Project");
  lines.push("");
  lines.push("Run:");
  lines.push("");
  lines.push("~~~bash");
  lines.push("pnpm quality:check");
  lines.push("pnpm release:prepare");
  lines.push("pnpm security:scan-local");
  lines.push("~~~");
  lines.push("");
  lines.push("Then show:");
  lines.push("");
  lines.push("- `README.md`");
  lines.push("- `controls/control-catalog.json`");
  lines.push("- `evidence/evidence-register.json`");
  lines.push("- `reports/fit-gap-analysis.md`");
  lines.push("- `reports/roadmap/remediation-roadmap.md`");
  lines.push("- `reports/executive/executive-readiness-report.md`");
  lines.push("- `docs/portfolio-project-summary.md`");
  lines.push("- `docs/architecture/system-overview.md`");
  lines.push("");
  lines.push("## 90-Second Explanation");
  lines.push("");
  lines.push("This repository is a practical lab for security and compliance automation in AI-enabled B2B SaaS. It maps frameworks such as NIST CSF 2.0, ISO 27001, SOC 2, GDPR, the EU AI Act and OWASP to normalized controls. Each control has expected evidence. The evidence register collects proof from GitHub, application security, cloud security, privacy and AI governance sources. A TypeScript engine compares expected evidence against available evidence, classifies each control as compliant, partial or gap, assigns risk and generates reports for technical and executive audiences.");
  lines.push("");
  lines.push("## Concise Project Explanation");
  lines.push("");
  lines.push("I built this project to practice translating security and compliance requirements into technical controls, evidence, fit-gap findings and prioritized remediation work for AI-enabled SaaS environments.");
  lines.push("");
  lines.push("## Current Limitations");
  lines.push("");
  lines.push("- This is not a formal audit tool.");
  lines.push("- Framework mappings are educational and should be validated before real compliance use.");
  lines.push("- Remote GitHub evidence depends on token permissions and repository plan features.");
  lines.push("- Cloud and application evidence templates require real product context to become authoritative.");
  lines.push("- Legal and regulatory conclusions require qualified review.");
  lines.push("");
  lines.push("## Next Improvements");
  lines.push("");
  lines.push("- Add real GitHub API collector coverage for rulesets and environments.");
  lines.push("- Add AWS and Azure evidence collectors.");
  lines.push("- Add JSON schema validation in CI.");
  lines.push("- Add dashboard output.");
  lines.push("- Add richer risk scoring logic.");
  lines.push("- Add evidence owner, review date and confidence fields.");
  lines.push("- Add Open Policy Agent or policy-as-code experiments.");
  lines.push("");

  fs.mkdirSync(path.join(process.cwd(), "docs/handoff"), { recursive: true });
  fs.writeFileSync("docs/handoff/security-assessment-handoff-package.md", lines.join("\n"));

  console.log("Security assessment handoff package generated.");
  console.log("Output: docs/handoff/security-assessment-handoff-package.md");
}

main();
