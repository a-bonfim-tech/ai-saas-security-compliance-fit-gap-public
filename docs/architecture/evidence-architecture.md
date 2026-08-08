# Evidence Architecture

## Purpose

This document explains how evidence is structured and used in the repository.

## Evidence Item Structure

Each evidence item uses the following structure:

~~~json
{
  "key": "example_evidence_key",
  "present": false,
  "source": "path/or/system",
  "notes": "Explanation of the evidence state."
}
~~~

## Evidence Key

The evidence key is the link between a control and an evidence item.

Example:

~~~json
{
  "id": "SDLC-001",
  "expectedEvidence": [
    "branch_protection_enabled",
    "pull_request_reviews_required",
    "codeowners_configured"
  ]
}
~~~

The analysis engine checks whether those evidence keys exist and are marked as present.

## Evidence Sources

Current evidence sources include:

- Local repository files
- GitHub workflow files
- GitHub CLI remote metadata
- Application security templates
- Cloud security templates
- Privacy templates
- AI governance templates
- Manual review documentation

## Evidence Principle

A compliance conclusion should be based on verifiable evidence.

If evidence is missing, the control should not be considered fully implemented.

## Future Improvements

Future versions can add:

- Evidence owner
- Evidence confidence
- Evidence timestamp
- Evidence expiration date
- Evidence review status
- Evidence source type
- Evidence severity impact
