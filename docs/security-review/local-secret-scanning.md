# Local Secret Scanning

## Purpose

This document explains the lightweight local secret scanning helper included in the repository.

## Command

Run:

~~~bash
pnpm security:scan-local
~~~

## Output

The scanner generates:

~~~text
reports/security/local-secret-scan-report.md
reports/json/local-secret-scan-report.json
~~~

## What It Checks

The scanner searches for common patterns such as:

- GitHub tokens
- OpenAI-style API keys
- AWS access keys
- Private key blocks
- Generic password assignments
- Generic secret, token or API key assignments

## Important Limitation

This scanner is intentionally lightweight. It is not a replacement for:

- GitHub Secret Scanning
- Gitleaks
- TruffleHog
- Enterprise DLP tools
- Professional repository history review

## Response Procedure

If a real secret is detected:

1. Stop publishing or pushing the repository.
2. Revoke or rotate the secret.
3. Remove the secret from the working tree.
4. Review whether the secret entered Git history.
5. If needed, clean Git history using an approved procedure.
6. Force-push only when appropriate and understood.
7. Document the incident and remediation.
