# Project Index

## Purpose

This document is the central navigation index for the AI SaaS Security & Compliance Fit-Gap Analysis Lab.

Use it to quickly locate methodology, architecture, controls, evidence, reports, testing, release material and professional handoff documents.

## Core Project Files

| File | Purpose |
|---|---|
| `README.md` | Main project overview. |
| `SECURITY.md` | Security policy. |
| `CONTRIBUTING.md` | Contribution guidance. |
| `CHANGELOG.md` | Project change history. |
| `package.json` | Project scripts and dependencies. |
| `tsconfig.json` | TypeScript configuration. |

## Core Data Model

| File | Purpose |
|---|---|
| `controls/control-catalog.json` | Normalized security and compliance controls. |
| `evidence/evidence-register.json` | Main evidence register. |
| `mappings/framework-control-mapping.csv` | Framework-to-control mapping table. |
| `schemas/control.schema.json` | JSON schema for controls. |
| `schemas/evidence.schema.json` | JSON schema for evidence. |

## Automation Scripts

| File | Purpose |
|---|---|
| `scripts/analysis-core.ts` | Testable core fit-gap analysis logic. |
| `scripts/analyze-fit-gap.ts` | Generates Markdown, JSON and CSV fit-gap reports. |
| `scripts/collect-github-local-evidence.ts` | Collects local repository evidence. |
| `scripts/collect-github-remote-evidence.ts` | Collects selected remote GitHub evidence using GitHub CLI. |
| `scripts/ingest-domain-evidence.ts` | Ingests domain-specific evidence templates. |
| `scripts/generate-remediation-roadmap.ts` | Generates remediation roadmap reports. |
| `scripts/generate-executive-report.ts` | Generates executive readiness report. |
| `scripts/generate-risk-score-report.ts` | Generates numeric risk score report. |
| `scripts/generate-project-summary.ts` | Generates portfolio project summary. |
| `scripts/generate-assessment-handoff.ts` | Generates reusable professional handoff material. |
| `scripts/local-secret-scan.ts` | Runs lightweight local secret scan. |
| `scripts/validate-repository.ts` | Validates repository structure and generated outputs. |
| `scripts/final-release-check.ts` | Runs final release readiness checks. |

## Reports

| File | Purpose |
|---|---|
| `reports/fit-gap-analysis.md` | Main human-readable fit-gap analysis report. |
| `reports/json/fit-gap-analysis.json` | Machine-readable fit-gap analysis report. |
| `reports/csv/fit-gap-analysis.csv` | Spreadsheet-ready fit-gap report. |
| `reports/roadmap/remediation-roadmap.md` | Remediation roadmap. |
| `reports/json/remediation-roadmap.json` | Machine-readable remediation roadmap. |
| `reports/csv/remediation-roadmap.csv` | Spreadsheet-ready remediation roadmap. |
| `reports/executive/executive-readiness-report.md` | Executive readiness summary. |
| `reports/risk-score-report.md` | Numeric risk score report. |
| `reports/json/risk-score-report.json` | Machine-readable risk score report. |
| `reports/security/local-secret-scan-report.md` | Local secret scanning report. |

## Architecture Documents

| File | Purpose |
|---|---|
| `docs/architecture/system-overview.md` | System architecture overview. |
| `docs/architecture/control-architecture.md` | Control model explanation. |
| `docs/architecture/evidence-architecture.md` | Evidence model explanation. |
| `docs/architecture/reporting-architecture.md` | Reporting architecture explanation. |
| `docs/diagrams/system-architecture.mmd` | Mermaid system architecture diagram. |
| `docs/diagrams/evidence-flow.mmd` | Mermaid evidence flow diagram. |
| `docs/diagrams/risk-and-reporting-flow.mmd` | Mermaid risk and reporting flow diagram. |

## Framework Notes

| File | Purpose |
|---|---|
| `frameworks/nist-csf-2.0/notes.md` | NIST CSF 2.0 notes. |
| `frameworks/iso-27001/notes.md` | ISO 27001 notes. |
| `frameworks/soc-2/notes.md` | SOC 2 notes. |
| `frameworks/gdpr/notes.md` | GDPR notes. |
| `frameworks/eu-ai-act/notes.md` | EU AI Act notes. |
| `frameworks/owasp/notes.md` | OWASP notes. |

## Professional Handoff

| File | Purpose |
|---|---|
| `docs/handoff/security-assessment-handoff-package.md` | Reusable handoff package. |
| `docs/handoff/security-assessment-first-week-plan.md` | Reusable first-week assessment plan. |
| `docs/handoff/security-discovery-questionnaire.md` | Organization-neutral security discovery questionnaire. |
| `docs/handoff/assessment-status-template.md` | Weekly status reporting template. |
| `docs/handoff/final-presentation-outline.md` | Final presentation outline. |

## Quality and Release

| File | Purpose |
|---|---|
| `docs/testing-and-quality-model.md` | Testing and quality model. |
| `docs/release/release-notes-v0.1.0.md` | Release notes. |
| `docs/release/release-checklist.md` | Release checklist. |
| `docs/publication-readiness.md` | Public release safety checklist. |
| `docs/github-repository-settings.md` | Recommended GitHub settings. |

## Recommended Commands

| Command | Purpose |
|---|---|
| `pnpm typecheck` | Run TypeScript validation. |
| `pnpm test` | Run automated tests. |
| `pnpm analyze` | Generate fit-gap reports. |
| `pnpm evidence:refresh-complete` | Refresh local/domain evidence and generate reports. |
| `pnpm quality:check` | Run full quality workflow. |
| `pnpm release:prepare` | Run release readiness workflow. |
| `pnpm security:scan-local` | Run lightweight local secret scan. |
| `pnpm final:check` | Run release check, secret scan and handoff generation. |
