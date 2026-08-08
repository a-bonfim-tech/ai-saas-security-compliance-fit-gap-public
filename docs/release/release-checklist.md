# Release Checklist

## Pre-Release

- [ ] README reviewed.
- [ ] CHANGELOG updated.
- [ ] Release notes updated.
- [ ] TypeScript validation passes.
- [ ] Tests pass.
- [ ] Evidence refresh completes.
- [ ] Reports are regenerated.
- [ ] Repository validation passes.
- [ ] Quality check passes.
- [ ] No secrets are committed.
- [ ] Git status is clean.

## Commands

Run:

~~~bash
pnpm typecheck
pnpm test
pnpm evidence:refresh-complete
pnpm validate:repo
pnpm quality:check
git status
~~~

## Generated Reports to Check

- [ ] `reports/fit-gap-analysis.md`
- [ ] `reports/json/fit-gap-analysis.json`
- [ ] `reports/csv/fit-gap-analysis.csv`
- [ ] `reports/roadmap/remediation-roadmap.md`
- [ ] `reports/executive/executive-readiness-report.md`
- [ ] `reports/risk-score-report.md`
- [ ] `docs/portfolio-project-summary.md`

## GitHub Settings to Review Manually

- [ ] Repository description.
- [ ] Repository topics.
- [ ] Branch protection.
- [ ] Pull request review rules.
- [ ] Dependabot alerts.
- [ ] Secret scanning, if available.
- [ ] Push protection, if available.
- [ ] CodeQL workflow status.
- [ ] Quality check workflow status.

## Post-Release

- [ ] Create Git tag.
- [ ] Push tag.
- [ ] Confirm GitHub Actions status.
- [ ] Review repository page.
