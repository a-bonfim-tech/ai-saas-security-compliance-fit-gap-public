import fs from "fs";
import path from "path";

type MaintenanceItem = {
  area: string;
  task: string;
  cadence: string;
  commandOrLocation: string;
};

const maintenanceItems: MaintenanceItem[] = [
  {
    area: "Quality",
    task: "Run full quality check",
    cadence: "Before every major commit",
    commandOrLocation: "pnpm quality:check"
  },
  {
    area: "Release",
    task: "Run release preparation",
    cadence: "Before tagging a release",
    commandOrLocation: "pnpm release:prepare"
  },
  {
    area: "Security",
    task: "Run local secret scan",
    cadence: "Before pushing and before publication",
    commandOrLocation: "pnpm security:scan-local"
  },
  {
    area: "Evidence",
    task: "Refresh evidence and reports",
    cadence: "Whenever controls or evidence change",
    commandOrLocation: "pnpm evidence:refresh-complete"
  },
  {
    area: "Reports",
    task: "Regenerate all reports",
    cadence: "Whenever evidence changes",
    commandOrLocation: "pnpm reports:all"
  },
  {
    area: "Handoff",
    task: "Regenerate security assessment handoff package",
    cadence: "Before technical portfolio reviews or presentations",
    commandOrLocation: "pnpm handoff:generate"
  },
  {
    area: "Audit",
    task: "Run final audit",
    cadence: "Before public release or portfolio review",
    commandOrLocation: "pnpm audit:final"
  },
  {
    area: "GitHub",
    task: "Review GitHub repository settings",
    cadence: "Monthly or before publication",
    commandOrLocation: "docs/final/github-final-actions.md"
  }
];

function main(): void {
  fs.mkdirSync(path.join(process.cwd(), "reports/final"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });

  const lines: string[] = [];

  lines.push("# Maintenance Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push("This report defines the ongoing maintenance workflow for the AI SaaS Security & Compliance Fit-Gap Analysis repository.");
  lines.push("");
  lines.push("## Maintenance Tasks");
  lines.push("");
  lines.push("| Area | Task | Cadence | Command or Location |");
  lines.push("|---|---|---|---|");

  for (const item of maintenanceItems) {
    lines.push(`| ${item.area} | ${item.task} | ${item.cadence} | \`${item.commandOrLocation}\` |`);
  }

  lines.push("");
  lines.push("## Recommended Routine");
  lines.push("");
  lines.push("Before important commits, run:");
  lines.push("");
  lines.push("~~~bash");
  lines.push("pnpm quality:check");
  lines.push("~~~");
  lines.push("");
  lines.push("Before publication or portfolio sharing, run:");
  lines.push("");
  lines.push("~~~bash");
  lines.push("pnpm complete:verify");
  lines.push("pnpm security:scan-local");
  lines.push("git status");
  lines.push("~~~");
  lines.push("");
  lines.push("Before a technical portfolio review or assessment presentation, run:");
  lines.push("");
  lines.push("~~~bash");
  lines.push("pnpm evidence:refresh-complete");
  lines.push("pnpm handoff:generate");
  lines.push("pnpm audit:final");
  lines.push("~~~");
  lines.push("");

  fs.writeFileSync("reports/final/maintenance-report.md", lines.join("\n"));
  fs.writeFileSync("reports/json/maintenance-report.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    maintenanceItems
  }, null, 2));

  console.log("Maintenance report generated.");
  console.log("Markdown: reports/final/maintenance-report.md");
  console.log("JSON: reports/json/maintenance-report.json");
}

main();
