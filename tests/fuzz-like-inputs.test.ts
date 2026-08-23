import { describe, expect, it } from "vitest";
import { csvEscape } from "../scripts/analysis-core";
import { escapeMarkdownTableCell } from "../scripts/markdown-table";
import { isArtificialValue, isValidPublicHttpsUrl } from "../scripts/evidence-validation";

function deterministicMutations(value: string): string[] {
  return [
    value.toLowerCase(), value.toUpperCase(), ` ${value} `, `${value}\r\n`,
    value.split("").join("\u200b"), `\ufeff${value}`, `${value}\u0000`
  ];
}

describe("deterministic fuzz-like hostile inputs", () => {
  it("rejects case, whitespace and invisible-character placeholder mutations", () => {
    for (const placeholder of ["TBD", "PLACEHOLDER", "VALOR_REAL", "DEMO"]) {
      for (const mutation of deterministicMutations(placeholder)) {
        expect(isArtificialValue(mutation)).toBe(true);
      }
    }
  });

  it.each([
    "https://%65xample.com/path",
    "https://example.com%2f.attacker.invalid",
    "https://localhost./",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://exa mple.com/",
    "not a uri",
    `https://${"a".repeat(300)}.com/`
  ])("rejects malformed, reserved or encoded URL %s", value => {
    expect(isValidPublicHttpsUrl(value)).toBe(false);
  });

  it("contains long and delimiter-heavy CSV and Markdown inputs", () => {
    const hostile = `=cmd|\`<script>\r\n${"x".repeat(10_000)}`;
    expect(csvEscape(hostile).startsWith("'")).toBe(true);
    const markdown = escapeMarkdownTableCell(hostile);
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("|");
    expect(markdown).not.toContain("\n");
  });
});
