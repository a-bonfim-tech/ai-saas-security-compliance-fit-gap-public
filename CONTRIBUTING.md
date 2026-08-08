# Contributing

## Purpose

This repository is a cybersecurity, compliance and AI governance learning project.

Contributions should improve the repository as a practical, evidence-based fit-gap analysis lab for AI-enabled B2B SaaS products.

## Contribution Areas

Useful contributions include:

- Improved framework mappings.
- Better evidence models.
- Additional tests.
- Improved TypeScript code quality.
- New evidence collectors.
- Better reporting formats.
- Clearer documentation.
- Safer security assumptions.
- Better AI governance templates.
- Better privacy and GDPR review templates.

## Contribution Principles

1. Do not add secrets, credentials, tokens or private customer data.
2. Do not claim formal compliance certification.
3. Keep legal and audit limitations clear.
4. Prefer evidence-based statements.
5. Keep controls traceable to frameworks or technical security practices.
6. Keep generated reports reproducible through scripts.

## Local Development

Install dependencies:

~~~bash
pnpm install
~~~

Run typecheck:

~~~bash
pnpm typecheck
~~~

Run tests:

~~~bash
pnpm test
~~~

Run full quality check:

~~~bash
pnpm quality:check
~~~

## Pull Request Expectations

Before opening a pull request:

- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm evidence:refresh-complete`.
- Run `pnpm validate:repo`.
- Confirm no secrets are committed.
- Update documentation if behavior changes.

## Security

If you find a security issue, do not open a public issue with sensitive details. Follow the guidance in `SECURITY.md`.
