# Evidence Ingestion Model

## Purpose

This document explains how the repository ingests domain-specific evidence templates into the main evidence register.

The objective is to make the fit-gap analysis more scalable by separating evidence into domains while preserving one normalized evidence register for the analysis engine.

## Evidence Sources

The current ingestion process reads the following files:

~~~text
evidence/application/application-evidence-template.json
evidence/cloud/cloud-evidence-template.json
evidence/privacy/privacy-evidence-template.json
evidence/ai-governance/ai-governance-evidence-template.json
~~~

## Main Evidence Register

The main evidence register is:

~~~text
evidence/evidence-register.json
~~~

The fit-gap analysis engine reads this file and compares it against:

~~~text
controls/control-catalog.json
~~~

## Commands

Ingest domain evidence:

~~~bash
pnpm evidence:ingest-domain
~~~

Refresh all local and domain evidence, regenerate reports and generate portfolio summary:

~~~bash
pnpm evidence:refresh-all
~~~

## Evidence Merge Logic

When a domain evidence key already exists in the main register:

- If incoming evidence is present, the main register is updated as present.
- If incoming evidence is not present, the existing status is preserved.
- Notes are appended to preserve traceability.

## Professional Use

This model reflects how compliance automation works in practice:

1. Controls are normalized.
2. Evidence is collected from multiple domains.
3. Evidence is merged into a single register.
4. Reports are generated from evidence, not assumptions.

## Future Improvements

Future versions should:

- Add JSON schema validation.
- Add evidence source confidence scores.
- Add evidence timestamps per item.
- Add owner and remediation fields.
- Add evidence expiry and review dates.
