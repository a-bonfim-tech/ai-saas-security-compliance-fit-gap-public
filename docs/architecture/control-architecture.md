# Control Architecture

## Purpose

This document explains how controls are modeled in the repository.

## Control Structure

Each control includes:

~~~json
{
  "id": "CONTROL-ID",
  "domain": "Domain Name",
  "title": "Control title",
  "frameworks": ["Framework A", "Framework B"],
  "expectedEvidence": ["evidence_key_1", "evidence_key_2"]
}
~~~

## Control ID

The control ID is a stable identifier used in reports, mappings and remediation roadmaps.

Examples:

- GOV-001
- IAM-001
- SDLC-001
- PRIV-001
- AI-001

## Domain

The domain groups controls by security or compliance area.

Examples:

- Governance
- Identity and Access Management
- Secure Software Development
- Vulnerability Management
- Logging and Monitoring
- Privacy and Data Protection
- AI Governance
- Application Security
- Cloud Security

## Frameworks

The frameworks field links a control to one or more standards, regulations or guidance sources.

Examples:

- NIST CSF 2.0
- ISO 27001
- SOC 2
- GDPR
- EU AI Act
- OWASP

## Expected Evidence

Expected evidence defines what should exist for the control to be considered implemented.

The fit-gap engine compares expected evidence against the evidence register.

## Design Principle

Controls should be normalized. One control may map to multiple frameworks when the operational security expectation is similar.
