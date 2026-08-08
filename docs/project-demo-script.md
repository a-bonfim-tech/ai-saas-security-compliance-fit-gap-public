# Project Demo Script

## Purpose

This script provides a concise explanation for presenting the repository in a technical review or portfolio discussion.

## 30-Second Version

This project is an AI SaaS security and compliance fit-gap automation lab. It maps frameworks such as NIST CSF 2.0, ISO 27001, SOC 2, GDPR, the EU AI Act and OWASP to technical evidence across GitHub, application security, cloud, privacy and AI governance. The TypeScript engine classifies controls as compliant, partial or gap, assigns risk and generates Markdown, JSON and CSV reports.

## 90-Second Version

I built this repository to prepare for cybersecurity work in an AI-enabled B2B SaaS environment. The main idea is to treat compliance as an evidence-based engineering process.

The methodology is:

Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap.

The project contains a normalized control catalog, an evidence register, domain evidence templates and a TypeScript analysis engine. It can generate fit-gap reports in Markdown for human review, JSON for automation and CSV for spreadsheet analysis.

The current scope includes GitHub security, secure SDLC, application security, cloud security, privacy and AI governance. This is directly relevant to SaaS companies that need to prepare for enterprise customers, security questionnaires, audits or internal compliance readiness.

## Technical Walkthrough

1. Show `controls/control-catalog.json`.
2. Explain that each control has expected evidence.
3. Show `evidence/evidence-register.json`.
4. Explain that evidence items are matched by key.
5. Show `scripts/analyze-fit-gap.ts`.
6. Explain how the engine classifies status and risk.
7. Run `pnpm evidence:refresh-all`.
8. Show generated reports:
   - `reports/fit-gap-analysis.md`
   - `reports/json/fit-gap-analysis.json`
   - `reports/csv/fit-gap-analysis.csv`
9. Show `docs/portfolio-project-summary.md`.

## Key Message

The project demonstrates that I can connect cybersecurity frameworks to real technical evidence and produce actionable risk-based recommendations for a B2B SaaS product.

## Strong Technical Positioning Sentence

I do not treat compliance as abstract paperwork. I translate requirements into controls, controls into evidence, and evidence into prioritized remediation work.
