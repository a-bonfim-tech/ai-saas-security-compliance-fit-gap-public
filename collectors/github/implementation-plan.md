# GitHub Evidence Collector Implementation Plan

## Current Phase

The current collector is local and file-based. It checks repository files and workflow definitions.

## Next Phase

The next phase should use the GitHub CLI or GitHub API to collect remote repository settings.

## Evidence That Requires Remote GitHub API Access

Some evidence cannot be reliably collected from local files alone.

Examples:

- Branch protection actually enabled on GitHub
- Required pull request reviews enforced remotely
- Secret scanning enabled
- Push protection enabled
- Repository visibility
- Collaborator permissions
- Organization MFA enforcement
- Advanced Security availability
- Rulesets
- Repository security settings

## Candidate GitHub CLI Commands

~~~bash
gh repo view --json name,visibility,isPrivate
gh api repos/OWNER/REPO/branches/main/protection
gh api repos/OWNER/REPO/collaborators
gh api repos/OWNER/REPO/vulnerability-alerts
~~~

## Caution

GitHub API access may depend on repository ownership, token scope, organization settings and plan availability.

The collector should handle missing permissions gracefully and classify such evidence as Unknown rather than Gap.

## Desired Future Output

The future collector should produce a normalized evidence file:

~~~text
evidence/github/github-remote-evidence.json
~~~

The file should use the same evidence format:

~~~json
[
  {
    "key": "branch_protection_enabled",
    "present": true,
    "source": "github-api:/branches/main/protection",
    "notes": "Branch protection is enabled on the main branch."
  }
]
~~~
