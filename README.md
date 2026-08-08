# AI SaaS Security & Compliance Fit-Gap Analysis

A TypeScript-based security, compliance and AI governance engineering project for evidence-driven fit-gap assessment of AI-enabled B2B SaaS environments.

The repository translates security, privacy and AI governance requirements into normalized controls, expected evidence, risk-rated findings and prioritized remediation outputs. It is designed around auditable evidence handling rather than checklist-only compliance claims.

## Problem Statement

AI-enabled SaaS teams must often determine whether technical and governance practices are sufficiently aligned with multiple frameworks at the same time. The difficult part is not listing requirements; it is connecting each requirement to verifiable evidence, identifying where evidence is incomplete, and turning gaps into prioritized remediation actions.

This project implements that workflow as:

~~~text
Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap
~~~

## Scope

The project models and evaluates controls across:

- security governance;
- identity and access management;
- secure software development;
- vulnerability management;
- logging and monitoring;
- application security;
- cloud security;
- privacy and data protection;
- AI governance.

Framework and reference coverage includes:

- NIST Cybersecurity Framework 2.0;
- ISO/IEC 27001;
- SOC 2 Trust Services Criteria;
- GDPR;
- EU AI Act;
- OWASP Web Application Security guidance;
- OWASP guidance for LLM and AI security.

## Engineering Approach

The repository is organized around six layers:

1. Framework and control modeling.
2. Evidence collection and ingestion.
3. Fit-gap analysis.
4. Risk scoring and remediation planning.
5. Executive and technical reporting.
6. Automated testing, validation and repository security controls.

Architecture documentation:

~~~text
docs/architecture/system-overview.md
docs/architecture/control-architecture.md
docs/architecture/evidence-architecture.md
docs/architecture/reporting-architecture.md
~~~

Mermaid diagrams:

~~~text
docs/diagrams/system-architecture.mmd
docs/diagrams/evidence-flow.mmd
docs/diagrams/risk-and-reporting-flow.mmd
~~~

## Repository Structure

~~~text
frameworks/
  Source-specific notes and structured requirements by framework.

controls/
  Normalized control catalog used for mapping requirements to evidence.

evidence/
  Technical, procedural and governance evidence grouped by source.

mappings/
  Cross-framework mapping between requirements, controls and expected evidence.

collectors/
  Documentation and templates for evidence collectors.

schemas/
  JSON schemas for control and evidence structures.

reports/
  Executive, technical, JSON, CSV, risk score, security scan, final audit,
  maintenance and remediation roadmap reports.

scripts/
  TypeScript automation for fit-gap analysis, evidence collection, reporting,
  repository validation, security checks and portfolio summaries.

docs/
  Methodology, architecture, assumptions, glossary, handoff material,
  implementation notes, technical reference material and project summaries.

tests/
  Automated tests and validation notes.
~~~

## Implemented Capabilities

The current TypeScript analysis engine can:

1. Read a normalized control catalog.
2. Read a structured evidence register.
3. Ingest domain evidence from application, cloud, privacy and AI governance templates.
4. Match expected evidence against available evidence.
5. Classify controls as `Compliant`, `Partial`, or `Gap`.
6. Assign a basic risk rating.
7. Generate Markdown, JSON and CSV fit-gap reports.
8. Collect local GitHub repository evidence from files and workflows.
9. Merge local evidence into the main evidence register.
10. Collect selected remote GitHub evidence using GitHub CLI.
11. Generate a remediation roadmap.
12. Generate an executive readiness report.
13. Generate a numeric risk score report.
14. Generate a portfolio project summary.
15. Run automated tests for the analysis engine.
16. Validate repository structure and generated outputs.
17. Run release-readiness checks.
18. Run a lightweight local secret scan.
19. Generate a project handoff package.
20. Generate a final project audit report.
21. Generate maintenance and GitHub publication-readiness reports.

## Security and Repository Controls

The repository includes:

- `CODEOWNERS` coverage for security- and governance-sensitive paths;
- Dependabot configuration for npm and GitHub Actions;
- GitHub Actions pinned to full commit SHAs;
- read-only workflow permissions by default;
- deterministic `pnpm` activation and frozen-lockfile installation;
- CI validation for type safety, tests, repository structure, fit-gap analysis, local secret scanning and release readiness;
- active CodeQL analysis for JavaScript and TypeScript on the public repository;
- GitHub Secret Scanning and push protection;
- an active `Protect main` ruleset requiring the repository validation and CodeQL checks before merge.

## Running the Project

Install the locked dependency set:

~~~bash
pnpm install --frozen-lockfile
~~~

Run type validation:

~~~bash
pnpm typecheck
~~~

Run tests:

~~~bash
pnpm test
~~~

Run the complete local evidence refresh and reporting workflow:

~~~bash
pnpm evidence:refresh-complete
~~~

Run the quality gate:

~~~bash
pnpm quality:check
~~~

Run release-readiness validation:

~~~bash
pnpm release:prepare
~~~

Run the local secret scan:

~~~bash
pnpm security:scan-local
~~~

Run complete verification:

~~~bash
pnpm complete:verify
~~~

Run final portfolio verification:

~~~bash
pnpm portfolio:final
~~~

## Key Generated Outputs

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
reports/security/local-secret-scan-report.md
reports/json/local-secret-scan-report.json
reports/final/final-project-audit.md
reports/json/final-project-audit.json
reports/final/maintenance-report.md
reports/json/maintenance-report.json
reports/final/github-publication-check.md
reports/json/github-publication-check.json
docs/portfolio-project-summary.md
docs/handoff/security-assessment-handoff-package.md
docs/final/project-completion-summary.md
~~~

## Example Assessment Flow

For an AI-enabled B2B SaaS environment, the project can be used to:

1. identify applicable security, privacy and AI governance requirements;
2. map requirements to normalized controls;
3. define and collect expected technical or procedural evidence;
4. classify controls according to available evidence;
5. assign risk to identified gaps;
6. generate remediation recommendations and a prioritized roadmap;
7. produce technical and executive outputs for review.

## Current Analysis Snapshot

The current generated fit-gap report records:

- 14 controls assessed;
- 1 compliant control;
- 3 partially covered controls;
- 10 gaps;
- 7 high-risk findings;
- 6 medium-risk findings;
- 1 low-risk finding.

These results reflect the evidence set contained in this repository and should not be interpreted as a real-world certification or audit conclusion.

## Quick Navigation

~~~text
docs/index/project-index.md
docs/portfolio-project-summary.md
docs/final/project-completion-summary.md
reports/final/final-project-audit.md
reports/fit-gap-analysis.md
reports/roadmap/remediation-roadmap.md
reports/executive/executive-readiness-report.md
~~~

## Status Labels

~~~text
Compliant   - Expected evidence exists and is sufficient.
Partial     - Some evidence exists, but the control is incomplete.
Gap         - Required evidence or implementation is missing.
Unknown     - The current state cannot be determined from available evidence.
~~~

## Risk Levels

~~~text
Critical - Immediate business, legal, security or customer trust impact.
High     - Significant exposure requiring near-term remediation.
Medium   - Relevant weakness requiring planned remediation.
Low      - Minor improvement or documentation gap.
~~~

## Limitations

This repository is an engineering project and assessment lab, not a legal opinion, accredited audit tool, certification service or production compliance platform.

Its findings are only as reliable as the modeled requirements and evidence supplied to the analysis engine. Real-world compliance and assurance decisions require authoritative source review, current organizational evidence and qualified security, legal and compliance judgment.
