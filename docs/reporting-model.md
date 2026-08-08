# Reporting Model

## Purpose

This document explains the reporting model used by the fit-gap analysis engine.

The engine generates three report formats:

- Markdown for human-readable technical and executive review.
- JSON for machine-readable integration and future automation.
- CSV for spreadsheet analysis and control tracking.

## Markdown Report

Path:

~~~text
reports/fit-gap-analysis.md
~~~

Use case:

- Security review
- Assessment documentation
- GitHub portfolio presentation
- Executive and technical summaries

## JSON Report

Path:

~~~text
reports/json/fit-gap-analysis.json
~~~

Use case:

- Future API integration
- Automated dashboards
- Evidence processing
- AI-assisted report generation
- Structured compliance workflows

## CSV Report

Path:

~~~text
reports/csv/fit-gap-analysis.csv
~~~

Use case:

- Spreadsheet analysis
- Risk register import
- Control tracking
- Manual audit review

## Reporting Principle

Every finding should preserve the following chain:

~~~text
Control -> Evidence -> Status -> Gap -> Risk -> Recommendation
~~~

A finding without evidence should not be treated as a compliance conclusion.
