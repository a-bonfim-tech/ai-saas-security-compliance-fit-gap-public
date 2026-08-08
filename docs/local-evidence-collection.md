# Local Evidence Collection

## Purpose

This document explains how the repository collects local GitHub-related evidence and merges it into the main evidence register.

The objective is to move from static sample evidence toward an evidence-driven workflow.

## Collector

The local collector is located at:

~~~text
scripts/collect-github-local-evidence.ts
~~~

It checks the local repository for evidence such as:

- SECURITY.md
- Dependabot configuration
- CodeQL workflow
- Dependency review workflow
- CODEOWNERS
- CI workflow
- Report validation workflow
- .env ignore rules
- Package manager lockfile
- TypeScript typecheck script
- Fit-gap analysis script

## Commands

Collect local GitHub evidence:

~~~bash
pnpm collect:github-local
~~~

Merge local GitHub evidence into the main evidence register:

~~~bash
pnpm evidence:merge-local
~~~

Refresh evidence and regenerate reports:

~~~bash
pnpm evidence:refresh
~~~

## Output Files

The collector writes to:

~~~text
evidence/github/github-local-evidence.json
~~~

The merge command updates:

~~~text
evidence/evidence-register.json
~~~

The analysis engine regenerates:

~~~text
reports/fit-gap-analysis.md
reports/json/fit-gap-analysis.json
reports/csv/fit-gap-analysis.csv
~~~

## Evidence Principle

The fit-gap analysis should not rely only on assumptions. Evidence should be collected from actual files, configurations, workflows and documented practices whenever possible.
