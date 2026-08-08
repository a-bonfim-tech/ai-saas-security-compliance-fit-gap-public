# Testing and Quality Model

## Purpose

This document explains the testing and quality model used by this repository.

The repository now includes automated tests for the core fit-gap analysis logic and a repository validation script to confirm that critical project files and generated reports exist.

## Test Framework

The project uses Vitest for TypeScript tests.

## Test Command

~~~bash
pnpm test
~~~

## TypeScript Validation

~~~bash
pnpm typecheck
~~~

## Repository Validation

~~~bash
pnpm validate:repo
~~~

## Complete Quality Check

~~~bash
pnpm quality:check
~~~

The quality check runs:

1. TypeScript validation.
2. Automated tests.
3. Evidence refresh and report generation.
4. Repository validation.

## Tested Components

The current test suite validates:

- Control status calculation.
- Risk calculation.
- Control assessment.
- Summary generation.
- CSV escaping.
- CSV generation.

## Quality Workflow

The GitHub Actions workflow is located at:

~~~text
.github/workflows/quality-check.yml
~~~

It runs on push and pull request to the main branch.

## Professional Relevance

Automated testing and validation improve trust in the fit-gap analysis engine. For a cybersecurity and compliance automation project, this matters because incorrect classification can mislead remediation planning.
