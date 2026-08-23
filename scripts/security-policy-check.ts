import fs from "node:fs";
import path from "node:path";
import { analyzeWorkflowText, WORKFLOW_POLICY_PARSER_SCOPE } from "./workflow-policy";

type Check = { name: string; passed: boolean; details: string };

function workflowFiles(): string[] {
  const directory = path.join(process.cwd(), ".github/workflows");
  return fs.readdirSync(directory).filter(file => /\.ya?ml$/.test(file)).map(file => path.join(directory, file));
}

function main(): void {
  console.log(`WORKFLOW_POLICY_PARSER_SCOPE=${WORKFLOW_POLICY_PARSER_SCOPE}`);
  const workflows = workflowFiles();
  const mutableActions: string[] = [];
  const excessivePermissions: string[] = [];
  const unsafePullRequestTarget: string[] = [];
  const advancedFindings: string[] = [];

  for (const file of workflows) {
    const relative = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, "utf8");
    advancedFindings.push(...analyzeWorkflowText(content).map(finding => `${relative}: ${finding.rule} (${finding.detail})`));
    for (const match of content.matchAll(/^\s*(?:-\s*)?(?:uses|["']uses["'])\s*:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
      const reference = match[1];
      if (reference.startsWith("./") || /^[^@]+@[a-f0-9]{40}$/i.test(reference)) continue;
      mutableActions.push(`${relative}: ${reference}`);
    }
    if (/^permissions:\s*write-all\s*$/m.test(content)) excessivePermissions.push(relative);
    if (/^\s*pull_request_target\s*:/m.test(content)) unsafePullRequestTarget.push(relative);
  }

  const checks: Check[] = [
    { name: "immutable action references", passed: mutableActions.length === 0, details: mutableActions.length ? mutableActions.join(", ") : "All external Actions use full commit SHAs." },
    { name: "workflow permissions", passed: excessivePermissions.length === 0, details: excessivePermissions.length ? excessivePermissions.join(", ") : "No workflow uses write-all." },
    { name: "pull_request_target", passed: unsafePullRequestTarget.length === 0, details: unsafePullRequestTarget.length ? unsafePullRequestTarget.join(", ") : "No pull_request_target workflow is present." },
    { name: "advanced workflow safety", passed: advancedFindings.length === 0, details: advancedFindings.length ? advancedFindings.join(", ") : "No unsafe checkout, trigger, event interpolation or artifact download pattern was detected." },
    { name: "lockfile", passed: fs.existsSync("pnpm-lock.yaml"), details: fs.existsSync("pnpm-lock.yaml") ? "pnpm-lock.yaml exists." : "pnpm-lock.yaml is missing." }
  ];

  for (const check of checks) console.log(`${check.passed ? "PASS" : "FAIL"} - ${check.name}: ${check.details}`);
  if (checks.some(check => !check.passed)) process.exit(1);
}

main();
