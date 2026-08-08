# Maintenance Workflow

## Purpose

This document defines how to maintain the repository after the initial portfolio release.

## Routine Commands

Run before important commits:

~~~bash
pnpm quality:check
~~~

Run before release or public sharing:

~~~bash
pnpm complete:verify
pnpm security:scan-local
pnpm github:publication-check
~~~

Run before a technical portfolio presentation:

~~~bash
pnpm evidence:refresh-complete
pnpm handoff:generate
pnpm audit:final
~~~

Run the final portfolio verification:

~~~bash
pnpm portfolio:final
~~~

## Maintenance Areas

| Area | Action |
|---|---|
| Controls | Review `controls/control-catalog.json` when adding frameworks or domains. |
| Evidence | Update `evidence/evidence-register.json` when new proof is collected. |
| Reports | Regenerate reports after changing controls or evidence. |
| Tests | Add tests when changing analysis logic. |
| Documentation | Update README and index files when structure changes. |
| Security | Run local secret scan before pushing or publishing. |
| GitHub | Review security settings manually after major changes. |

## Monthly Review

Recommended monthly actions:

1. Run `pnpm portfolio:final`.
2. Review GitHub Actions status.
3. Review Dependabot alerts.
4. Review repository visibility.
5. Review generated reports.
6. Review documentation freshness.
7. Update technical notes based on repository evolution.
