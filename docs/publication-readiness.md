# Publication Readiness

## Purpose

This document helps decide whether the repository is ready to be made public as a portfolio project.

## Public Release Criteria

The repository should only be public if:

- [ ] It contains no secrets.
- [ ] It contains no real customer data.
- [ ] It contains no confidential employer or engagement data.
- [ ] It contains no private security findings from a real company.
- [ ] It clearly states that it is a portfolio and technical demonstration project.
- [ ] It does not claim formal certification readiness.
- [ ] It does not provide legal advice.
- [ ] It has a clear README.
- [ ] It has a SECURITY.md file.
- [ ] Tests and quality checks pass.

## Sensitive Content Review

Before publication, review:

- `.env` files
- Git history
- Screenshots
- Reports
- Evidence files
- GitHub Actions logs
- Documentation
- Commit messages

## Command Review

Run:

~~~bash
git status
find . -name ".env*" -not -name ".env.example" -print
grep -R "ghp_\|gho_\|sk-\|AKIA\|PRIVATE KEY\|password\|secret" . --exclude-dir=.git --exclude-dir=node_modules || true
pnpm quality:check
~~~

## Recommendation

Keep the repository private while it is being prepared and reviewed for publication.

Make it public only after removing or generalizing any company-specific information.
