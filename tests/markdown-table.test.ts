import { describe, expect, it } from "vitest";
import { escapeMarkdownTableCell } from "../scripts/markdown-table";

describe("escapeMarkdownTableCell", () => {
  it("encodes backslashes before table delimiters", () => {
    expect(escapeMarkdownTableCell("\\")).toBe("&#92;");
    expect(escapeMarkdownTableCell("|")).toBe("&#124;");
    expect(escapeMarkdownTableCell("\\|")).toBe("&#92;&#124;");
  });

  it("encodes Markdown and HTML-significant characters", () => {
    expect(escapeMarkdownTableCell("`<&>")).toBe("&#96;&lt;&amp;&gt;");
  });

  it("normalizes line breaks inside a table cell", () => {
    expect(escapeMarkdownTableCell("line1\nline2\r\nline3\rline4"))
      .toBe("line1<br>line2<br>line3<br>line4");
  });

  it("encodes ampersands before introducing entities", () => {
    expect(escapeMarkdownTableCell("A & B | C\\D"))
      .toBe("A &amp; B &#124; C&#92;D");
  });
});
