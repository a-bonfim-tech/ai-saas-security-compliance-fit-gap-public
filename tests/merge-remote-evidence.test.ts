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

  it("is byte-idempotent for an identical remote observation", () => {
    const root = fixture([{ key: "branch_protection_enabled", present: false, source, notes: "newer negative" }]);
    expect(run(root).status).toBe(0);
    const first = fs.readFileSync(path.join(root, "evidence/evidence-register.json"));
    expect(run(root).status).toBe(0);
    const second = fs.readFileSync(path.join(root, "evidence/evidence-register.json"));
    expect(createHash("sha256").update(second).digest("hex")).toBe(createHash("sha256").update(first).digest("hex"));
  });

  it("rejects a conflicting source without writing", () => {
    const root = fixture([{ key: "branch_protection_enabled", present: false, source: "gh api repos/other/source", notes: "ambiguous" }]);
    const register = path.join(root, "evidence/evidence-register.json");
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
