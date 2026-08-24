import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readSafeJson, resolveSafeFile } from "./safe-file";

export const RELEASE_ARTIFACTS = [
  "reports/json/fit-gap-analysis.json",
  "reports/json/remediation-roadmap.json",
  "reports/json/risk-score-report.json",
  "reports/json/local-secret-scan-report.json"
] as const;

export type ReleaseManifest = {
  schemaVersion: "1.0";
  manifestType: "WORKTREE_LOCAL_INTEGRITY_MANIFEST";
  baseCommitSha: string;
  generatedAt: string;
  tool: { name: "bonfim-release-integrity"; version: string };
  signatureStatus: "UNSIGNED_LOCAL_INTEGRITY_MANIFEST";
  artifacts: Array<{ path: string; sha256: string; bytes: number }>;
};

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function buildReleaseManifest(root: string, artifactPaths: readonly string[], generatedAt?: string): ReleaseManifest {
  const pkg = readSafeJson<{ version: string }>("package.json", { root });
  const timestamp = generatedAt ?? new Date(Number(git(root, ["show", "-s", "--format=%ct", "HEAD"])) * 1000).toISOString();
  const artifacts = [...artifactPaths].sort().map(relativePath => {
    const file = resolveSafeFile(relativePath, { root, allowedExtensions: [".json", ".md", ".csv"] });
    return { path: relativePath, sha256: sha256(file), bytes: fs.statSync(file).size };
  });
  return {
    schemaVersion: "1.0",
    manifestType: "WORKTREE_LOCAL_INTEGRITY_MANIFEST",
    baseCommitSha: git(root, ["rev-parse", "HEAD"]),
    generatedAt: timestamp,
    tool: { name: "bonfim-release-integrity", version: pkg.version },
    signatureStatus: "UNSIGNED_LOCAL_INTEGRITY_MANIFEST",
    artifacts
  };
}

export function verifyReleaseManifest(
  root: string,
  manifest: ReleaseManifest,
  expectedArtifacts: readonly string[]
): string[] {
  const errors: string[] = [];
  if (manifest.manifestType !== "WORKTREE_LOCAL_INTEGRITY_MANIFEST") errors.push("invalid_manifest_type");
  if ("commitSha" in (manifest as unknown as Record<string, unknown>)) errors.push("impossible_containing_commit_claim");
  if (!/^[a-f0-9]{40}$/i.test(manifest.baseCommitSha)) errors.push("invalid_base_commit_sha");
  else if (git(root, ["rev-parse", "HEAD"]) !== manifest.baseCommitSha) errors.push("base_commit_mismatch");
  if (manifest.signatureStatus !== "UNSIGNED_LOCAL_INTEGRITY_MANIFEST") errors.push("invalid_signature_claim");
  const declared = manifest.artifacts.map(item => item.path).sort();
  const expected = [...expectedArtifacts].sort();
  if (JSON.stringify(declared) !== JSON.stringify(expected)) errors.push("artifact_set_mismatch");
  for (const artifact of manifest.artifacts) {
    try {
      const file = resolveSafeFile(artifact.path, { root, allowedExtensions: [".json", ".md", ".csv"] });
      if (sha256(file) !== artifact.sha256) errors.push(`hash_mismatch:${artifact.path}`);
      if (fs.statSync(file).size !== artifact.bytes) errors.push(`size_mismatch:${artifact.path}`);
    } catch {
      errors.push(`missing_or_unsafe:${artifact.path}`);
    }
  }
  return errors;
}

export function writeReleaseManifest(root: string, outputPath = "reports/release/release-manifest.json"): void {
  const manifest = buildReleaseManifest(root, RELEASE_ARTIFACTS);
  const output = path.join(root, outputPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
}
