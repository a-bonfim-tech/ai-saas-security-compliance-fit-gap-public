# GitHub Final Actions

## Purpose

This document lists the final manual actions recommended in GitHub after pushing the completed repository.

## Repository Description

Set the GitHub repository description to:

~~~text
AI-driven security and compliance fit-gap analysis lab for AI-enabled B2B SaaS products.
~~~

## Suggested Topics

Add these topics:

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

## Security Settings

Review and enable where available:

- Dependabot alerts
- Dependabot security updates
- CodeQL code scanning
- Secret scanning
- Push protection
- Dependency review

## Branch Protection

For `main`, consider:

- Require pull request before merge.
- Require status checks before merge.
- Require branch to be up to date before merge.
- Block force pushes.
- Block deletion.
- Review administrator bypass.

## Actions Review

Check GitHub Actions results for:

- CI
- CodeQL
- Quality Check
- Release Check
- Validate Reports
- Evidence Refresh

## Visibility Recommendation

Keep the repository private until you confirm:

- No secrets exist.
- No real company data exists.
- No confidential engagement data exists.
- No private security findings exist.
- The repository is safe for portfolio publication.

## Final Local Commands

Run:

~~~bash
pnpm final:check
pnpm release:prepare
pnpm security:scan-local
pnpm quality:check
git status
~~~
