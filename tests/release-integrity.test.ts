import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { buildReleaseManifest, verifyReleaseManifest } from "../scripts/release-integrity";

const roots: string[] = [];
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-integrity-"));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  fs.writeFileSync(path.join(root, "package.json"), '{"version":"1.0.0"}');
  fs.mkdirSync(path.join(root, "reports"));
  fs.writeFileSync(path.join(root, "reports", "a.json"), '{"ok":true}');
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return root;
}
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));

describe("release integrity manifest", () => {
  it("builds and verifies a deterministic valid manifest", () => {
    const root = fixture();
    const first = buildReleaseManifest(root, ["reports/a.json"]);
    const second = buildReleaseManifest(root, ["reports/a.json"]);
    expect(first).toEqual(second);
    expect(first.manifestType).toBe("WORKTREE_LOCAL_INTEGRITY_MANIFEST");
    expect(first.baseCommitSha).toMatch(/^[a-f0-9]{40}$/);
    expect(verifyReleaseManifest(root, first, ["reports/a.json"])).toEqual([]);
  });

  it("rejects a divergent base commit and an impossible containing-commit claim", () => {
    const root = fixture();
    const manifest = buildReleaseManifest(root, ["reports/a.json"]);
    fs.writeFileSync(path.join(root, "next.txt"), "next");
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "next"], { cwd: root });
    expect(verifyReleaseManifest(root, manifest, ["reports/a.json"])).toContain("base_commit_mismatch");
    const impossible = { ...buildReleaseManifest(root, ["reports/a.json"]), commitSha: "a".repeat(40) };
    expect(verifyReleaseManifest(root, impossible, ["reports/a.json"])).toContain("impossible_containing_commit_claim");
  });

  it("detects changed, missing, corrupt-hash and undeclared artifacts", () => {
    const root = fixture();
    const manifest = buildReleaseManifest(root, ["reports/a.json"]);
    fs.writeFileSync(path.join(root, "reports", "a.json"), '{"changed":true}');
    expect(verifyReleaseManifest(root, manifest, ["reports/a.json"])).toEqual(expect.arrayContaining(["hash_mismatch:reports/a.json"]));
    fs.rmSync(path.join(root, "reports", "a.json"));
    expect(verifyReleaseManifest(root, manifest, ["reports/a.json"])).toEqual(expect.arrayContaining(["missing_or_unsafe:reports/a.json"]));
    fs.writeFileSync(path.join(root, "reports", "a.json"), '{"ok":true}');
    expect(verifyReleaseManifest(root, { ...manifest, artifacts: [{ ...manifest.artifacts[0], sha256: "0".repeat(64) }] }, ["reports/a.json"]))
      .toEqual(expect.arrayContaining(["hash_mismatch:reports/a.json"]));
    expect(verifyReleaseManifest(root, manifest, ["reports/a.json", "reports/extra.json"]))
      .toContain("artifact_set_mismatch");
  });
});
