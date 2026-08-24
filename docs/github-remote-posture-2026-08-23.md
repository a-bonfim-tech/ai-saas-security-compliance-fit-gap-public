# GitHub Remote Security Posture — 2026-08-23

Read-only API observations:

| Area | State | Evidence boundary |
|---|---|---|
| Visibility | ENABLED / PUBLIC | Authoritative repository metadata |
| Active ruleset for `main` | ENABLED | Ruleset API; classic branch protection remains unconfirmed |
| Required status checks | ENABLED | Active ruleset |
| Required approving reviews | DISABLED | Authoritative active-ruleset response |
| Dependabot alerts | ENABLED | Vulnerability-alert endpoint |
| Dependabot open alerts | 0 observed | Aggregated read-only alert query |
| Secret scanning | ENABLED | Repository security-and-analysis metadata |
| Push protection | ENABLED | Repository security-and-analysis metadata |
| Code scanning | ENABLED / 3 fixed alerts | Aggregated read-only alert query; no open alert observed |
| Actions | ENABLED; selected actions; SHA pinning required | Actions permissions API |
| Default workflow token | READ | Workflow permissions API |
| Workflow PR approval | DISABLED | Workflow permissions API |
| Collaborator list | ACCESSIBLE; count 1 | No identity reproduced in this report |
| Environments | 0 observed | Environments API |
| Deployments | 0 observed | Deployments API |
| Releases | 0 observed | Releases API |
| GitHub Advanced Security plan/status | UNVERIFIED | API did not return an authoritative state |

No token value or sensitive scope was collected. Absence of environments, deployments or releases describes the API response at collection time and is not a vulnerability conclusion.

Classification: Category A for GitHub API evidence and Category C for this assessment. Evidence level: Level A for official API responses; approval status: Proposta.
