import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const script = path.join(projectRoot, "scripts/merge-remote-evidence.ts");
const loader = path.join(projectRoot, "node_modules/tsx/dist/loader.mjs");
const assessment = "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public";
const sourceRepository = "a-bonfim-tech/source";
const source = `gh api repos/${sourceRepository}/branches/main/protection`;

function writeJson(root: string, relative: string, value: unknown): void {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(value, null, 2));
}

function fixture(incoming: Array<Record<string, unknown>>, collectedAt = "2026-08-24T00:00:00Z") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "remote-evidence-"));
  spawnSync("git", ["init", "-q"], { cwd: root });
  spawnSync("git", ["remote", "add", "origin", `https://github.com/${assessment}.git`], { cwd: root });
  writeJson(root, "evidence/evidence-register.json", [{
    key: "branch_protection_enabled", present: true, source, notes: "older positive",
    provenance: {
      assessment_repository: assessment, source_repository: sourceRepository,
      source_collected_at: "2026-08-23T00:00:00Z", source_collector: "github-remote-evidence-collector"
    }
  }]);
  writeJson(root, "evidence/github/github-remote-evidence.json", {
    repository: sourceRepository, collectedAt, collector: "github-remote-evidence-collector",
    evidence: incoming, warnings: []
  });
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, ["--import", loader, script], { cwd: root, encoding: "utf8" });
}

function collectWithUnavailableGitHubApis(root: string, simulation = "unavailable") {
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const gh = path.join(bin, "gh");
  fs.writeFileSync(gh, `#!/usr/bin/env node
const args = process.argv.slice(2);
const simulation = process.env.GITHUB_API_SIMULATION;
if (args[0] === "repo" && args[1] === "view" && args.includes("--jq")) {
  process.stdout.write(${JSON.stringify(sourceRepository)} + "\\n");
  process.exit(0);
}
if (args[0] === "repo" && args[1] === "view") {
  process.stdout.write(JSON.stringify({
    nameWithOwner: ${JSON.stringify(sourceRepository)}, visibility: "PUBLIC",
    isPrivate: false, defaultBranchRef: { name: "main" }
  }));
  process.exit(0);
}
const endpoint = args.at(-1) || "";
if (simulation === "ruleset-detail-failure") {
  if (args.includes("--include") && endpoint.includes("/branches/main/protection")) {
    process.stdout.write("HTTP/2 404 Not Found\\n");
    process.exit(0);
  }
  if (endpoint.endsWith("/rulesets?includes_parents=true")) {
    process.stdout.write(JSON.stringify([{ id: 1, target: "branch", enforcement: "active" }]));
    process.exit(0);
  }
}
if (simulation === "classic-payload-failure") {
  if (args.includes("--include") && endpoint.includes("/branches/main/protection")) {
    process.stdout.write("HTTP/2 200 OK\\n");
    process.exit(0);
  }
  if (endpoint.endsWith("/rulesets?includes_parents=true")) {
    process.stdout.write("[]");
    process.exit(0);
  }
}
process.stderr.write("simulated unavailable GitHub API");
process.exit(1);
`);
  fs.chmodSync(gh, 0o755);
  const collector = path.join(projectRoot, "scripts/collect-github-remote-evidence.ts");
  return spawnSync(process.execPath, ["--import", loader, collector], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_API_SIMULATION: simulation,
      PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}`
    }
  });
}

describe("remote authoritative evidence merge", () => {
  it("revokes a stale positive and selects current provenance", () => {
    const root = fixture([{ key: "branch_protection_enabled", present: false, source, notes: "newer negative" }]);
    expect(run(root).status).toBe(0);
    const [item] = JSON.parse(fs.readFileSync(path.join(root, "evidence/evidence-register.json"), "utf8"));
    expect(item.present).toBe(false);
    expect(item.provenance).toEqual({
      assessment_repository: assessment, source_repository: sourceRepository,
      source_collected_at: "2026-08-24T00:00:00Z", source_collector: "github-remote-evidence-collector"
    });
  });

  it("does not turn an unavailable collection into an authoritative revocation", () => {
    const root = fixture([]);
    expect(collectWithUnavailableGitHubApis(root).status).toBe(0);
    const report = JSON.parse(fs.readFileSync(path.join(root, "evidence/github/github-remote-evidence.json"), "utf8"));
    expect(report.evidence.find((item: { key: string }) => item.key === "branch_protection_enabled")).toBeUndefined();
    expect(run(root).status).toBe(0);
    const item = JSON.parse(fs.readFileSync(path.join(root, "evidence/evidence-register.json"), "utf8"))
      .find((candidate: { key: string }) => candidate.key === "branch_protection_enabled");
    expect(item.present).toBe(true);
  });

  it("does not fabricate negative evidence when unavailable collection has no prior state", () => {
    const root = fixture([]);
    writeJson(root, "evidence/evidence-register.json", []);
    expect(collectWithUnavailableGitHubApis(root).status).toBe(0);
    expect(run(root).status).toBe(0);
    const register = JSON.parse(fs.readFileSync(path.join(root, "evidence/evidence-register.json"), "utf8"));
    expect(register.some((item: { present: boolean }) => item.present === false)).toBe(false);
  });

  it("does not fabricate branch-governance negatives when active ruleset details are unavailable", () => {
    const root = fixture([]);
    expect(collectWithUnavailableGitHubApis(root, "ruleset-detail-failure").status).toBe(0);
    const report = JSON.parse(fs.readFileSync(path.join(root, "evidence/github/github-remote-evidence.json"), "utf8"));
    for (const key of ["branch_protection_enabled", "pull_request_reviews_required", "status_checks_required"]) {
      expect(report.evidence.find((item: { key: string }) => item.key === key)).toBeUndefined();
    }
  });

  it("does not fabricate review or status-check negatives when classic protection payload is unavailable", () => {
    const root = fixture([]);
    expect(collectWithUnavailableGitHubApis(root, "classic-payload-failure").status).toBe(0);
    const report = JSON.parse(fs.readFileSync(path.join(root, "evidence/github/github-remote-evidence.json"), "utf8"));
    expect(report.evidence.find((item: { key: string }) => item.key === "branch_protection_enabled")?.present).toBe(true);
    for (const key of ["pull_request_reviews_required", "status_checks_required"]) {
      expect(report.evidence.find((item: { key: string }) => item.key === key)).toBeUndefined();
    }
  });

  it("is byte-idempotent for an identical remote observation", () => {
    const root = fixture([{ key: "branch_protection_enabled", present: false, source, notes: "newer negative" }]);
    expect(run(root).status).toBe(0);
    const first = fs.readFileSync(path.join(root, "evidence/evidence-register.json"));
    expect(run(root).status).toBe(0);
    const second = fs.readFileSync(path.join(root, "evidence/evidence-register.json"));
    expect(createHash("sha256").update(second).digest("hex")).toBe(createHash("sha256").update(first).digest("hex"));
  });

  it("rejects a conflicting repository authority without writing", () => {
    const root = fixture([{ key: "branch_protection_enabled", present: false, source, notes: "ambiguous" }]);
    const register = path.join(root, "evidence/evidence-register.json");
    const [existing] = JSON.parse(fs.readFileSync(register, "utf8"));
    existing.provenance.source_repository = "a-bonfim-tech/other";
    fs.writeFileSync(register, JSON.stringify([existing], null, 2));
    const before = fs.readFileSync(register);
    expect(run(root).status).not.toBe(0);
    expect(fs.readFileSync(register).equals(before)).toBe(true);
  });

  it("rejects invalid time and mixed batches atomically", () => {
    const root = fixture([
      { key: "new_valid_item", present: true, source: "collector/new", notes: "valid" },
      { key: "branch_protection_enabled", present: false, source, notes: "invalid batch" }
    ], "invalid");
    const register = path.join(root, "evidence/evidence-register.json");
    const before = fs.readFileSync(register);
    expect(run(root).status).not.toBe(0);
    expect(fs.readFileSync(register).equals(before)).toBe(true);
  });

  it("fails closed when origin is not a GitHub repository", () => {
    const root = fixture([{ key: "new_item", present: true, source: "collector/new", notes: "new" }]);
    spawnSync("git", ["remote", "set-url", "origin", "https://example.com/acme/repo.git"], { cwd: root });
    const register = path.join(root, "evidence/evidence-register.json");
    const before = fs.readFileSync(register);
    expect(run(root).status).not.toBe(0);
    expect(fs.readFileSync(register).equals(before)).toBe(true);
  });
});
