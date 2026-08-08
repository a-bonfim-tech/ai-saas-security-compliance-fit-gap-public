export function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/\\/g, "&#92;")
    .replace(/\|/g, "&#124;")
    .replace(/`/g, "&#96;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
}
