# Methodology

## Purpose

This methodology defines how this repository performs a security and compliance fit-gap analysis for an AI-enabled B2B SaaS product.

The objective is to translate security, privacy and AI governance requirements into verifiable controls, map those controls to technical or procedural evidence, identify gaps, classify risk and produce remediation recommendations.

## Core Analysis Chain

Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap

## Analysis Principles

1. Compliance conclusions must be evidence-based.
2. A control is not considered implemented unless there is technical, procedural or documentary evidence.
3. AI-generated conclusions must be reviewed and traceable to reliable sources.
4. Risk classification must consider business impact, security exposure, privacy impact and customer trust.
5. Findings must be actionable for engineering, security, product and leadership teams.

## Evidence Categories

Evidence may come from the following areas:

- GitHub repository configuration
- Source code and application architecture
- CI/CD workflows
- Dependency management
- Secrets management
- Cloud identity and access management
- Cloud logging and monitoring
- Database configuration
- Security policies
- Privacy documentation
- AI system documentation
- Incident response procedures
- Risk management records

## Status Definitions

| Status | Meaning |
|---|---|
| Evidence Sufficient | All expected repository evidence items for the modeled control are present. |
| Evidence Partial | Some but not all expected repository evidence items for the modeled control are present. |
| Evidence Gap | No expected repository evidence items for the modeled control are present. |
| Unknown | The current state cannot be determined from available evidence. |

## Risk Rating Criteria

| Risk | Description |
|---|---|
| Critical | Immediate business, legal, operational, security or customer-trust impact. |
| High | Significant exposure requiring near-term remediation. |
| Medium | Relevant weakness requiring planned remediation. |
| Low | Minor improvement, documentation gap or low-impact issue. |

## Fit-Gap Workflow

1. Define the product context.
2. Identify applicable frameworks.
3. Normalize requirements into controls.
4. Define expected evidence for each control.
5. Collect available evidence.
6. Compare expected evidence against found evidence.
7. Assign control status.
8. Assign risk rating.
9. Write remediation recommendations.
10. Generate executive and technical reports.

## Limitations

## Evidence-status semantics

The analysis engine reports repository evidence state, not compliance or control effectiveness.

- `Evidence Sufficient`: all expected repository evidence items for the modeled control are present.
- `Evidence Partial`: some but not all expected repository evidence items for the modeled control are present.
- `Evidence Gap`: no expected repository evidence items for the modeled control are present.

These statuses do not establish formal compliance, control implementation, operational effectiveness, certification or audit readiness. They also do not establish evidence authenticity beyond the provenance represented by the repository.

This methodology does not provide formal legal advice, audit certification or regulatory assurance. It is a technical and educational model for structuring security and compliance readiness work.
