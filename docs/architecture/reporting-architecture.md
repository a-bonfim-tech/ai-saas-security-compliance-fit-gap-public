# Reporting Architecture

## Purpose

This document explains how the repository generates different reports from the same evidence-based fit-gap analysis.

## Source of Truth

The main machine-readable report is:

~~~text
reports/json/fit-gap-analysis.json
~~~

This JSON file is the source for downstream reporting.

## Report Types

| Report | Path | Audience |
|---|---|---|
| Fit-Gap Report | `reports/fit-gap-analysis.md` | Technical reviewers |
| Fit-Gap JSON | `reports/json/fit-gap-analysis.json` | Automation and integrations |
| Fit-Gap CSV | `reports/csv/fit-gap-analysis.csv` | Spreadsheet review |
| Remediation Roadmap | `reports/roadmap/remediation-roadmap.md` | Engineering and security teams |
| Executive Report | `reports/executive/executive-readiness-report.md` | Leadership |
| Risk Score Report | `reports/risk-score-report.md` | Security prioritization |
| Portfolio Summary | `docs/portfolio-project-summary.md` | Interviews and portfolio review |

## Reporting Pipeline

~~~text
Evidence Register
  -> Fit-Gap Analysis
  -> JSON Report
  -> Roadmap + Executive Report + Risk Score Report + Portfolio Summary
~~~

## Design Rationale

Markdown is used for human-readable documentation.

JSON is used for automation.

CSV is used for spreadsheet-based review.

This mirrors real compliance workflows where different stakeholders need different representations of the same evidence.
