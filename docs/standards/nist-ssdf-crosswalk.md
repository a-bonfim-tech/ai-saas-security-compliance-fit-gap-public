# NIST SSDF Repository Crosswalk

Reference: NIST SP 800-218, Secure Software Development Framework (SSDF) Version 1.1. This is an evidence mapping, not a claim of formal conformance.

| Practice | Task area | Repository evidence | Status | Gap | Recommended next evidence |
|---|---|---|---|---|---|
| PO | Prepare the Organization | `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, control catalog | Observed | Organizational roles and training are outside repository evidence | Approved role matrix and training records |
| PS | Protect the Software | pinned Actions, read-only permissions, lockfile, secret scan | Observed | Signing and build provenance are not implemented | Signed release, provenance attestation, protected environment evidence |
| PW | Produce Well-Secured Software | TypeScript strict checking, tests, evidence validation, threat model | Observed | Review coverage and input hardening are incomplete | Coverage report, fuzz/property tests, approved security review |
| RV | Respond to Vulnerabilities | `SECURITY.md`, Dependabot, dependency review, CodeQL | Partially observed | No repository evidence of triage history or response performance | Sanitized vulnerability lifecycle records |

Classification: Category A — Recognized Standards, Frameworks, and References. Evidence level: Level A for the SSDF reference; repository mappings are Level D internal assessment. Approval status: Proposta.
