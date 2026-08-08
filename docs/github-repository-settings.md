# GitHub Repository Settings Guide

## Purpose

This document lists recommended GitHub repository settings for this portfolio project.

## Repository Description

Use this description:

~~~text
AI-driven security and compliance fit-gap analysis lab for AI-enabled B2B SaaS products.
~~~

## Suggested Topics

Use relevant GitHub topics such as:

~~~text
cybersecurity
compliance
grc
saas-security
ai-governance
nist-csf
iso27001
soc2
gdpr
eu-ai-act
owasp
typescript
devsecops
security-automation
~~~

## Visibility

Recommended initial visibility:

~~~text
Private while developing, public when reviewed and sanitized.
~~~

## Branch Protection

Recommended rules for `main`:

- Require pull request before merge.
- Require at least one approval.
- Require status checks.
- Require branches to be up to date before merging.
- Block force pushes.
- Block branch deletion.
- Review administrator bypass.

## Security Features

Enable where available:

- Dependabot alerts.
- Dependabot security updates.
- CodeQL code scanning.
- Secret scanning.
- Push protection.
- Dependency review.

## Actions

Review GitHub Actions permissions:

- Prefer read-only default permissions where possible.
- Grant write permissions only when required.
- Review third-party actions before use.

## Manual Evidence

Capture screenshots or notes for:

- Branch protection settings.
- Code security settings.
- Dependabot settings.
- Workflow results.
- Repository visibility.
