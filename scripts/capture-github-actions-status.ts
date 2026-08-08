import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function run(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error: any) {
    return `Command failed: ${command} ${args.join(" ")}\n${error?.message ?? String(error)}`;
  }
}

function main(): void {
  fs.mkdirSync(path.join(process.cwd(), "reports/final"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "reports/json"), { recursive: true });

  const generatedAt = new Date().toISOString();

  const repoMetadata = run("gh", ["repo", "view", "--json", "nameWithOwner,visibility,isPrivate,url,description"]);
  const runList = run("gh", ["run", "list", "--limit", "20"]);
  const failedRuns = run("gh", ["run", "list", "--status", "failure", "--limit", "10"]);
  const branchStatus = run("git", ["branch", "-vv"]);
  const latestCommits = run("git", ["--no-pager", "log", "--oneline", "-10"]);
  const gitStatus = run("git", ["status", "--short"]);
  const tags = run("git", ["tag", "--list"]);
  const remoteTags = run("git", ["ls-remote", "--tags", "origin"]);

  const markdown = [
    "# GitHub Actions and Repository Status Capture",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Repository Metadata",
    "",
    "~~~json",
    repoMetadata,
    "~~~",
    "",
    "## Latest Workflow Runs",
    "",
    "~~~text",
    runList,
    "~~~",
    "",
    "## Failed Workflow Runs",
    "",
    "~~~text",
    failedRuns || "No failed workflow runs returned by GitHub CLI.",
    "~~~",
    "",
    "## Branch Status",
    "",
    "~~~text",
    branchStatus,
    "~~~",
    "",
    "## Latest Commits",
    "",
    "~~~text",
    latestCommits,
    "~~~",
    "",
    "## Local Git Status",
    "",
    "~~~text",
    gitStatus || "Working tree clean.",
    "~~~",
    "",
    "## Local Tags",
    "",
    "~~~text",
    tags,
    "~~~",
    "",
    "## Remote Tags",
    "",
    "~~~text",
    remoteTags,
    "~~~",
    ""
  ].join("\n");

  fs.writeFileSync("reports/final/github-actions-status.md", markdown);

  fs.writeFileSync("reports/json/github-actions-status.json", JSON.stringify({
    generatedAt,
    repoMetadata,
    runList,
    failedRuns,
    branchStatus,
    latestCommits,
    gitStatus,
    tags,
    remoteTags
  }, null, 2));

  console.log("GitHub Actions and repository status captured.");
  console.log("Markdown: reports/final/github-actions-status.md");
  console.log("JSON: reports/json/github-actions-status.json");
}

main();
