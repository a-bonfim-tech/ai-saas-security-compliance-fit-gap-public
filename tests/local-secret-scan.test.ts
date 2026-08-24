import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyCoverage, generateMarkdown, runSecretScan } from "../scripts/local-secret-scan";

const roots: string[] = [];
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "secret-scan-"));
  roots.push(root);
  return root;
}
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));

describe("local secret scan coverage", () => {
  it("reports a complete clean scan", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "safe.txt"), "ordinary content");
    expect(runSecretScan(root)).toMatchObject({ result: "CLEAN_COMPLETE", coverage: { files_scanned: 1 } });
  });

  it("reports explicit partial coverage for symlink, oversize and binary files", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "safe.txt"), "ordinary content");
    fs.writeFileSync(path.join(root, "large.txt"), Buffer.alloc(5 * 1024 * 1024 + 1, 65));
    fs.writeFileSync(path.join(root, "binary.bin"), Buffer.from([0, 1, 2]));
    fs.symlinkSync(path.join(root, "safe.txt"), path.join(root, "linked.txt"));
    const scan = runSecretScan(root);
    expect(scan.result).toBe("CLEAN_WITH_SKIPPED_FILES");
    expect(scan.coverage).toMatchObject({ files_skipped_symlink: 1, files_skipped_oversize: 1, files_skipped_binary: 1 });
    expect(generateMarkdown([], scan.coverage, scan.result)).toContain("Coverage is partial");
  });

  it("reports an unreadable or missing scan root as an error", () => {
    const scan = runSecretScan(path.join(fixture(), "missing"));
    expect(scan.result).toBe("ERROR");
    expect(scan.coverage.files_skipped_unreadable).toBe(1);
    expect(generateMarkdown([], scan.coverage, scan.result)).toContain("did not complete");
  });

  it("reports findings even when coverage is partial and never persists the original secret", () => {
    const root = fixture();
    const token = ["ghp_", "abcdefghijklmnopqrstuvwxyz123456"].join("");
    fs.writeFileSync(path.join(root, "secret.txt"), token);
    fs.writeFileSync(path.join(root, "binary.bin"), Buffer.from([0, 1, 2]));
    const scan = runSecretScan(root);
    expect(scan.result).toBe("FINDINGS_DETECTED");
    expect(scan.findings[0].excerpt).not.toContain(token);
    expect(scan.coverage.files_skipped_binary).toBe(1);
  });
});
