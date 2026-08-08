import fs from "fs";
import path from "path";
import {
  assessControl,
  buildSummary,
  generateCsv,
  generateMarkdown,
  type Control,
  type Evidence,
  type Report
} from "./analysis-core";

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

function ensureDirectory(relativePath: string): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(fullPath, { recursive: true });
}

function main(): void {
  ensureDirectory("reports");
  ensureDirectory("reports/json");
  ensureDirectory("reports/csv");

  const controls = readJson<Control[]>("controls/control-catalog.json");
  const evidence = readJson<Evidence[]>("evidence/evidence-register.json");

  const findings = controls.map(control => assessControl(control, evidence));

  const report: Report = {
    generatedAt: new Date().toISOString(),
    methodology: "Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap",
    summary: buildSummary(findings),
    findings
  };

  fs.writeFileSync("reports/fit-gap-analysis.md", generateMarkdown(report));
  fs.writeFileSync("reports/json/fit-gap-analysis.json", JSON.stringify(report, null, 2));
  fs.writeFileSync("reports/csv/fit-gap-analysis.csv", generateCsv(findings));

  console.log("Fit-gap analysis completed.");
  console.log("Markdown report written to reports/fit-gap-analysis.md");
  console.log("JSON report written to reports/json/fit-gap-analysis.json");
  console.log("CSV report written to reports/csv/fit-gap-analysis.csv");
}

main();
