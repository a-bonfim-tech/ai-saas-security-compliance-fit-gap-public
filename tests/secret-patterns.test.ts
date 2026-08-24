import { describe, expect, it } from "vitest";
import { detectAndMaskSecrets, sanitizeSecretExcerpt } from "../scripts/secret-patterns";

describe("secret detection and redaction", () => {
  it.each([
    ["AKIA", "ABCDEFGHIJKLMNOP"].join(""),
    ["ghp_", "abcdefghijklmnopqrstuvwxyz123456"].join(""),
    ["eyJhbGciOiJIUzI1NiJ9", "abcdefghijk", "abcdefghijklmnop"].join("."),
    ["postgresql://admin:", "supersecretvalue", "@db.internal/app"].join(""),
    ["Bearer ", "abcdefghijklmnopqrstuvwxyz123456"].join(""),
    ["client_secret='", "abcdefghijklmnopqrstuvwxyz", "'"].join("")
  ])("detects and masks supported secret shape", value => {
    const findings = detectAndMaskSecrets(value);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(finding => !finding.excerpt.includes(value))).toBe(true);
    expect(findings.every(finding => finding.excerpt.includes("[REDACTED:"))).toBe(true);
  });

  it("does not flag ordinary documentation", () => {
    expect(detectAndMaskSecrets("Set the secret through the CI environment.")).toEqual([]);
  });

  it.each([
    [["AKIA", "ABCDEFGHIJKLMNOP"].join(""), ["ghp_", "abcdefghijklmnopqrstuvwxyz123456"].join("")],
    [["eyJhbGciOiJIUzI1NiJ9", "abcdefghijk", "abcdefghijklmnop"].join("."), ["Bearer ", "abcdefghijklmnopqrstuvwxyz123456"].join("")],
    [["postgresql://admin:", "supersecretvalue", "@db.internal/app"].join(""), ["client_secret='", "abcdefghijklmnopqrstuvwxyz", "'"].join("")],
    [["-----BEGIN ", "PRIVATE KEY-----"].join(""), ["ghp_", "abcdefghijklmnopqrstuvwxyz123456"].join("")]
  ])("redacts every secret family from one persisted excerpt", (first, second) => {
    const findings = detectAndMaskSecrets(`${first} ${second}`);
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings.every(finding => !finding.excerpt.includes(first) && !finding.excerpt.includes(second))).toBe(true);
  });

  it("redacts multiple secrets of the same type and preserves classification", () => {
    const first = ["ghp_", "abcdefghijklmnopqrstuvwxyz123456"].join("");
    const second = ["gho_", "zyxwvutsrqponmlkjihgfedcba654321"].join("");
    const findings = detectAndMaskSecrets(`${first} ${second}`);
    expect(findings.map(finding => finding.pattern)).toContain("GitHub token");
    expect(sanitizeSecretExcerpt(`${first} ${second}`)).not.toMatch(/gh[pousr]_[A-Za-z0-9_]{20,}/);
  });
});
