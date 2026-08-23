export const secretPatterns: { name: string; regex: RegExp }[] = [
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { name: "OpenAI API key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "AWS access key", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g },
  { name: "Private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "Database URL", regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@]+:[^\s@]+@[^\s]+/gi },
  { name: "Bearer token", regex: /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*/gi },
  { name: "Credential assignment", regex: /\b(password|passwd|pwd|secret|token|api_key|apikey|client_secret|webhook_secret)\s*[:=]\s*["'][^"']{12,}["']/gi }
];

function maskPattern(input: string, regex: RegExp): string {
  regex.lastIndex = 0;
  return input.replace(regex, match => {
    const visiblePrefix = match.slice(0, Math.min(4, match.length));
    return `${visiblePrefix}[REDACTED:${match.length}]`;
  });
}

export function sanitizeSecretExcerpt(input: string): string {
  const sanitized = secretPatterns.reduce(
    (current, pattern) => maskPattern(current, pattern.regex),
    input
  );
  return sanitized.length > 180 ? `${sanitized.slice(0, 180)}...` : sanitized;
}

export function detectAndMaskSecrets(line: string): Array<{ pattern: string; excerpt: string }> {
  const detected: Array<{ pattern: string; excerpt: string }> = [];
  const excerpt = sanitizeSecretExcerpt(line);
  for (const pattern of secretPatterns) {
    pattern.regex.lastIndex = 0;
    if (!pattern.regex.test(line)) continue;
    detected.push({ pattern: pattern.name, excerpt });
  }
  return detected;
}
