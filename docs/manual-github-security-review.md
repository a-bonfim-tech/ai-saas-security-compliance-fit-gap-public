# Manual GitHub Security Review

## Purpose

This checklist supports manual validation of GitHub security settings that may not be fully available through local files or API permissions.

## Repository Settings

- [ ] Repository visibility reviewed.
- [ ] Repository description is accurate.
- [ ] Repository topics are appropriate.
- [ ] Default branch is `main`.
- [ ] Features not needed are disabled.

## Branch Protection

- [ ] Branch protection is enabled for `main`.
- [ ] Pull request before merge is required.
- [ ] At least one approving review is required.
- [ ] Stale approvals are dismissed when new commits are pushed.
- [ ] Status checks are required before merge.
- [ ] Force pushes are blocked.
- [ ] Branch deletion is blocked.
- [ ] Administrator bypass is reviewed.

## Secure SDLC

- [ ] CODEOWNERS exists.
- [ ] CI workflow runs on pull request.
- [ ] TypeScript typecheck runs in CI.
- [ ] CodeQL runs on push and pull request.
- [ ] Report validation workflow runs successfully.

## Dependency Security

- [ ] Dependabot alerts are enabled.
- [ ] Dependabot security updates are enabled.
- [ ] Dependabot version updates are configured.
- [ ] Dependency review is configured where available.

## Secret Protection

- [ ] Secret scanning is enabled where available.
- [ ] Push protection is enabled where available.
- [ ] `.env` files are ignored.
- [ ] No secrets exist in committed files.
- [ ] Repository secrets are reviewed.

## Access Control

- [ ] Collaborators are reviewed.
- [ ] Admin access is minimized.
- [ ] MFA is enabled for privileged users.
- [ ] Access is removed when no longer needed.

## Evidence to Capture

- Screenshot of branch protection.
- Screenshot of code security settings.
- Screenshot of Dependabot settings.
- Screenshot of Actions workflow results.
- Screenshot or export of collaborators.
- Notes on unavailable settings or plan limitations.
