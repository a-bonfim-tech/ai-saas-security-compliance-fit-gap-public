# Maintenance Report

## Purpose

This report defines the ongoing maintenance workflow for the AI SaaS Security & Compliance Fit-Gap Analysis repository.

## Maintenance Tasks

| Area | Task | Cadence | Command or Location |
|---|---|---|---|
| Quality | Run full quality check | Before every major commit | `pnpm quality:check` |
| Release | Run release preparation | Before tagging a release | `pnpm release:prepare` |
| Security | Run local secret scan | Before pushing and before publication | `pnpm security:scan-local` |
| Evidence | Refresh evidence and reports | Whenever controls or evidence change | `pnpm evidence:refresh-complete` |
| Reports | Regenerate all reports | Whenever evidence changes | `pnpm reports:all` |
| Handoff | Regenerate security assessment handoff package | Before technical portfolio reviews or presentations | `pnpm handoff:generate` |
| Audit | Run final audit | Before public release or portfolio review | `pnpm audit:final` |
| GitHub | Review GitHub repository settings | Monthly or before publication | `docs/final/github-final-actions.md` |

## Recommended Routine

Before important commits, run:

~~~bash
pnpm quality:check
~~~

Before publication or portfolio sharing, run:

~~~bash
pnpm complete:verify
pnpm security:scan-local
git status
~~~

Before a technical portfolio review or assessment presentation, run:

~~~bash
pnpm evidence:refresh-complete
pnpm handoff:generate
pnpm audit:final
~~~
