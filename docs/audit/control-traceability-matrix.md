# Control Traceability Matrix

| Control | Requirement | Evidence | Implementation | Tests | Residual gap | Status |
|---|---|---|---|---|---|---|
| AUD-001 | AI governance example must remain explicitly non-production | `docs/examples/ai-governance-example.md` | documentation boundary | `tests/aud-001-ai-governance-example.test.ts` | External AI system evidence absent | Closed for repository artifact |
| AUD-002 | Runtime authentication and authorization effectiveness | None sufficient in repository | external evidence validator only | `tests/evidence-validation.test.ts` | Primary application/runtime evidence required | UNVERIFIED |
| AUD-004 | Repository assessment outputs and claims reconciled | canonical audit and remediation plan | report generation | analysis tests | Independent review absent | Closed for repository artifact |
| AUD-005 | Runtime/cloud audit logging effectiveness | None sufficient in repository | external evidence validator only | `tests/evidence-validation.test.ts` | Primary product-bound logging evidence required | UNVERIFIED |
| AUD-006 | Privacy example claim boundary | `docs/examples/privacy-processing-example.md` | documentation boundary | `tests/aud-006-privacy-processing-example.test.ts` | Production processing evidence absent | Closed for repository artifact |
| AUD-007 | Supply-chain governance | workflows, lockfile, Dependabot | `scripts/security-policy-check.ts` | `tests/aud-007-supply-chain-governance.test.ts` | Release provenance absent | Implemented locally |
| AUD-008 | Remote evidence provenance | remote evidence snapshot and provenance fields | `scripts/merge-remote-evidence.ts` | `tests/merge-remote-evidence.test.ts` | Fresh remote access may be unavailable | Implemented locally |

Invariant: administrative closure never promotes `AUD-002` or `AUD-005`. Their technical states remain `UNVERIFIED` until new primary evidence passes target, binding, verification and integrity checks.

Classification: Category C — Architectural Proposals. Evidence level: Level D. Approval status: Proposta. Origin: source-backed traceability review. Justification: auditable navigation from conclusion to evidence, code and test.
