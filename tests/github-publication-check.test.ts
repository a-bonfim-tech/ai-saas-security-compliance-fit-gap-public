import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyMarkdownTarget, decodeMarkdownTarget } from "../scripts/github-publication-check";

describe("Markdown target decoding", () => {
  it.each(["%ZZ", "%A"])("classifies malformed encoding %s without throwing", target => {
    expect(decodeMarkdownTarget(target)).toEqual({ error: "BROKEN_OR_MALFORMED_MARKDOWN_LINK" });
  });
  it("decodes valid encoded relative links", () => {
    expect(decodeMarkdownTarget("docs/My%20File.md")).toEqual({ decoded: "docs/My File.md" });
  });
  it.each(["#section", "https://example.invalid"])("does not fail on a non-decoded target %s", target => {
    expect(classifyMarkdownTarget(target, process.cwd())).toBe("IGNORED");
  });
  it("distinguishes existing and missing relative links", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "publication-link-"));
    try {
      fs.writeFileSync(path.join(root, "present.md"), "ok");
      expect(classifyMarkdownTarget("present.md", root)).toBe("VALID");
      expect(classifyMarkdownTarget("missing.md", root)).toBe("MISSING");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
