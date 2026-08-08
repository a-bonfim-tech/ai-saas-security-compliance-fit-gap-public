# Remote Collector Notes

## Current Implementation

The remote GitHub evidence collector uses GitHub CLI commands to query repository metadata and selected repository security endpoints.

## Collector File

~~~text
scripts/collect-github-remote-evidence.ts
~~~

## Merge File

~~~text
scripts/merge-remote-evidence.ts
~~~

## Evidence Output

~~~text
evidence/github/github-remote-evidence.json
~~~

## Current Evidence Keys

- repository_visibility_reviewed
- branch_protection_enabled
- pull_request_reviews_required
- status_checks_required
- dependabot_alerts_enabled
- secret_scanning_enabled
- push_protection_enabled
- advanced_security_reviewed
- collaborators_reviewed

## Interpretation Rules

If a key is present and true, the collector found evidence supporting the control.

If a key is false, it may mean:

1. The control is not enabled.
2. The API endpoint is unavailable.
3. The authenticated token lacks permission.
4. The feature is unavailable for the repository plan.
5. The repository is not owned by the authenticated user.

Manual review may still be required.

## Next Improvements

Future versions should:

- Add ruleset collection.
- Add repository environments collection.
- Add GitHub Actions permissions review.
- Add secret scanning alerts summary.
- Add pull request review policy parsing.
- Add organization-level MFA verification where permissions allow.
- Export collector warnings into the main report.
