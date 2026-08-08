# Release Notes v0.1.0

## Release Name

Initial Portfolio Release

## Summary

Version 0.1.0 establishes the project as a practical AI SaaS security and compliance fit-gap automation lab.

It provides a working TypeScript analysis engine, structured control and evidence models, report generation, remediation roadmap generation, executive reporting, risk scoring, evidence collection, tests and architecture documentation.

## Main Capabilities

- Map frameworks to normalized controls.
- Map controls to expected evidence.
- Collect local GitHub evidence.
- Collect selected remote GitHub evidence using GitHub CLI.
- Ingest domain-specific evidence templates.
- Generate fit-gap reports.
- Generate risk score reports.
- Generate remediation roadmap.
- Generate executive readiness report.
- Generate portfolio project summary.
- Run automated tests.
- Validate repository structure.

## Frameworks Represented

- NIST CSF 2.0
- ISO/IEC 27001
- SOC 2
- GDPR
- EU AI Act
- OWASP Web and LLM guidance

## Domains Represented

- Governance
- Identity and access management
- Secure software development
- Vulnerability management
- Logging and monitoring
- Application security
- Cloud security
- Privacy and data protection
- AI governance

## Generated Outputs

~~~text
reports/fit-gap-analysis.md
reports/json/fit-gap-analysis.json
reports/csv/fit-gap-analysis.csv
reports/roadmap/remediation-roadmap.md
reports/json/remediation-roadmap.json
reports/csv/remediation-roadmap.csv
reports/executive/executive-readiness-report.md
reports/risk-score-report.md
reports/json/risk-score-report.json
docs/portfolio-project-summary.md
~~~

## Quality Commands

~~~bash
pnpm typecheck
pnpm test
pnpm validate:repo
pnpm quality:check
~~~

## Limitations

This release is not a formal audit tool. It is a structured learning, portfolio and security assessment preparation project.

Compliance and legal conclusions must be validated by qualified professionals.
