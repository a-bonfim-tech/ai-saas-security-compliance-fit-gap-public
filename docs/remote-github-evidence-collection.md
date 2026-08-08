# Remote GitHub Evidence Collection

## Purpose

This document explains how the repository collects remote GitHub evidence using the GitHub CLI.

The objective is to collect evidence that cannot be reliably determined from local files alone, such as branch protection, required pull request reviews, vulnerability alerts, repository visibility and selected repository security settings.

## Requirements

The collector requires:

- GitHub CLI installed
- Authenticated GitHub CLI session
- Repository pushed to GitHub
- Sufficient token permissions for repository security settings

Check authentication:

~~~bash
gh auth status
~~~

## Commands

Collect remote GitHub evidence:

~~~bash
pnpm collect:github-remote
~~~

Merge remote GitHub evidence into the main evidence register:

~~~bash
pnpm evidence:merge-remote
~~~

Refresh local and remote evidence, then regenerate reports:

~~~bash
pnpm evidence:refresh-remote
~~~

## Output Files

Remote evidence is written to:

~~~text
evidence/github/github-remote-evidence.json
~~~

The merged evidence register is written to:

~~~text
evidence/evidence-register.json
~~~

The fit-gap reports are regenerated at:

~~~text
reports/fit-gap-analysis.md
reports/json/fit-gap-analysis.json
reports/csv/fit-gap-analysis.csv
~~~

## Evidence Collected

The remote collector attempts to collect:

- Repository visibility
- Branch protection status
- Required pull request review status
- Required status checks
- Dependabot vulnerability alerts
- Secret scanning status
- Secret scanning push protection status
- GitHub Advanced Security status
- Collaborator list accessibility

## Important Limitations

Some GitHub evidence depends on account type, repository plan, organization policy, token scopes or admin permissions.

If evidence cannot be confirmed, the collector records a warning. Lack of confirmation should not automatically be treated as proof that a control is absent.

## Compliance Interpretation

Remote GitHub evidence should support, not replace, human review.

A strong compliance conclusion requires:

- Technical evidence
- Configuration review
- Documented process
- Ownership
- Repeatable validation
