# Risk Scoring Model

## Purpose

This document explains the simple scoring model used to prioritize fit-gap findings.

The model is intentionally lightweight. It is designed for security assessment preparation, portfolio demonstration and early-stage SaaS security readiness work.

## Scoring Inputs

The score considers:

- Risk level
- Fit-gap status
- Number of missing evidence items

## Base Scores

| Risk | Base Score |
|---|---:|
| Critical | 100 |
| High | 75 |
| Medium | 50 |
| Low | 25 |

## Status Modifiers

| Status | Modifier |
|---|---:|
| Gap | +20 |
| Partial | +10 |
| Compliant | +0 |

## Missing Evidence Modifier

Each missing evidence item adds 3 points, capped at 15 points.

## Maximum Score

The maximum score is capped at 100.

## Interpretation

| Score Range | Interpretation |
|---|---|
| 90-100 | Immediate priority |
| 70-89 | High priority |
| 40-69 | Planned remediation |
| 0-39 | Low-priority improvement or monitoring |

## Limitation

This scoring model is not formal quantitative risk analysis. It is a prioritization aid for security and compliance readiness.
