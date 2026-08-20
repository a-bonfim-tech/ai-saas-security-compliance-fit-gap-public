# Risk Score Report

## Purpose

This report adds a simple numeric risk score to each fit-gap finding. The score is intended for prioritization, not formal quantitative risk analysis.

## Scoring Logic

- Critical risk starts at 100.
- High risk starts at 75.
- Medium risk starts at 50.
- Low risk starts at 25.
- Evidence Gap status adds 20.
- Evidence Partial status adds 10.
- Missing evidence adds up to 15 additional points.
- Maximum score is capped at 100.

## Scored Findings

| Score | Control | Domain | Status | Risk | Missing Evidence |
|---|---|---|---|---|---|
| 100 | LOG-001 | Logging and Monitoring | Evidence Gap | High | 3 |
| 100 | PRIV-001 | Privacy and Data Protection | Evidence Gap | High | 3 |
| 100 | AI-001 | AI Governance | Evidence Gap | High | 4 |
| 100 | CLOUD-001 | Cloud Security | Evidence Gap | High | 2 |
| 100 | CLOUD-002 | Cloud Security | Evidence Gap | High | 3 |
| 100 | PRIV-002 | Privacy and Data Protection | Evidence Gap | High | 3 |
| 100 | AI-002 | AI Governance | Evidence Gap | High | 2 |
| 76 | APP-001 | Application Security | Evidence Gap | Medium | 2 |
| 76 | APP-002 | Application Security | Evidence Gap | Medium | 2 |
| 76 | APP-003 | Application Security | Evidence Gap | Medium | 2 |
| 66 | IAM-001 | Identity and Access Management | Evidence Partial | Medium | 2 |
| 63 | GOV-001 | Governance | Evidence Partial | Medium | 1 |
| 63 | VULN-001 | Vulnerability Management | Evidence Partial | Medium | 1 |
| 25 | SDLC-001 | Secure Software Development | Evidence Sufficient | Low | 0 |