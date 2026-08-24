import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readSafeJson, resolveSafeFile } from "../scripts/safe-file";

const roots: string[] = [];
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "safe-file-"));
  roots.push(root);
  return root;
}
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));

describe("safe evidence file ingestion", () => {
  it("reads bounded valid JSON", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "input.json"), '{"ok":true}');
    expect(readSafeJson<{ ok: boolean }>("input.json", { root }).ok).toBe(true);
  });

  it("rejects traversal and external symlinks", () => {
    const root = fixture();
    expect(() => resolveSafeFile("../outside.json", { root })).toThrow(/escapes/);
    const outside = path.join(os.tmpdir(), `outside-${Date.now()}.json`);
    fs.writeFileSync(outside, "{}");
    fs.symlinkSync(outside, path.join(root, "link.json"));
    expect(() => resolveSafeFile("link.json", { root })).toThrow(/Symbolic/);
    fs.rmSync(outside);
  });

  it("rejects oversized, binary, malformed and unexpected-extension inputs", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "large.json"), "x".repeat(33));
    expect(() => resolveSafeFile("large.json", { root, maxBytes: 32 })).toThrow(/size/);
    fs.writeFileSync(path.join(root, "binary.json"), Buffer.from([0, 1, 2]));
    expect(() => readSafeJson("binary.json", { root })).toThrow(/Binary/);
    fs.writeFileSync(path.join(root, "bad.json"), "{");
    expect(() => readSafeJson("bad.json", { root })).toThrow(/Malformed/);
    fs.writeFileSync(path.join(root, "input.txt"), "{}");
    expect(() => resolveSafeFile("input.txt", { root })).toThrow(/extension/);
  });
});
