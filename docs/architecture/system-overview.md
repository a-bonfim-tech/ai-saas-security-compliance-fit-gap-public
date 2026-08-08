# System Overview

## Purpose

This document explains the architecture of the AI SaaS Security & Compliance Fit-Gap Analysis Lab.

The repository is designed as a lightweight compliance automation system that maps security, privacy and AI governance requirements to evidence and produces risk-rated reports.

## Core Components

| Component | Purpose |
|---|---|
| Control Catalog | Defines normalized security and compliance controls. |
| Evidence Register | Stores technical, procedural and governance evidence. |
| Evidence Collectors | Collect evidence from local files, GitHub and domain templates. |
| Analysis Engine | Compares expected evidence against available evidence. |
| Reporting Engine | Generates Markdown, JSON and CSV reports. |
| Roadmap Generator | Converts findings into remediation priorities. |
| Executive Report Generator | Produces leadership-readable readiness summaries. |
| Quality Layer | Runs typechecks, tests and repository validation. |

## Data Flow

1. Controls are defined in `controls/control-catalog.json`.
2. Evidence is collected from local repository files, GitHub metadata and domain-specific templates.
3. Evidence is merged into `evidence/evidence-register.json`.
4. The analysis engine compares expected evidence with available evidence.
5. Findings are classified as `Compliant`, `Partial` or `Gap`.
6. Findings receive risk ratings.
7. Reports are generated in Markdown, JSON and CSV.
8. Roadmap and executive reports are generated.
9. Tests and validation scripts check repository integrity.

## Architectural Principle

The system follows this logic:

~~~text
Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap
~~~

## Security and Compliance Relevance

This architecture mirrors practical security compliance work in SaaS environments:

- Frameworks define expectations.
- Controls operationalize expectations.
- Evidence proves whether controls exist.
- Gaps identify missing or weak areas.
- Risk ratings prioritize remediation.
- Reports communicate decisions to technical and executive audiences.
