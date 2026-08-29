# Cybersecurity Evidence Engineering Case Study

## Context and problem

Security assessments often confuse a documented intention with an observed control. This repository models a reproducible path from requirements to evidence, findings, risk and reports while preserving uncertainty.

## Security objective and constraints

The objective is to prevent false control promotion and produce traceable assessment artifacts. No production runtime, cloud account, customer environment or external audit evidence is assumed.

## Architecture and threats

Structured evidence enters a validation boundary before control evaluation. The principal threats are poisoned evidence, placeholder targets, stale or tampered exports, unsafe repository metadata, supply-chain compromise and unauthorized publication. See [`../security/threat-model.md`](../security/threat-model.md).

## Decisions and controls

- Fail closed when evidence is absent, artificial, incompatible or insufficiently bound to a product.
- Separate `documented`, `implemented`, `tested`, `observed`, `operationally_proven`, `unavailable`, `not_applicable` and `unverified`.
- Pin GitHub Actions by full SHA and minimize workflow permissions.
- Use read-only collection and preserve source provenance.
- Keep `AUD-002` and `AUD-005` technically `UNVERIFIED` without primary runtime evidence.

## Evidence strategy, automation and testing

The project generates Markdown, JSON and CSV outputs from a control catalog and evidence register. Automated tests cover analysis, escaping, provenance merge and adversarial external-target validation. Defined CI workflows perform type checks, tests, evidence refresh, repository validation, secret scanning and release checks; current remote execution remains separately evidenced.

## CAND-001: Authoritative evidence revocation

A historical confirmed-positive observation could previously remain effective after a newer authoritative confirmed-negative observation. This stale positive evidence could distort assessment outputs and downstream security or compliance decisions.

The remediation introduced explicit temporal and state-transition semantics: a newer confirmed authoritative negative revokes an older confirmed positive. Unavailable or indeterminate acquisition is not treated as a confirmed negative and cannot fabricate revocation. Authority identity remains stable across equivalent GitHub branch-governance acquisition paths, while each acquisition path retains its own provenance. Ambiguous or foreign authority fails closed instead of changing trusted state.

Two material P1 review findings were remediated before merge. Regression coverage exercised confirmed positive to confirmed negative; confirmed positive to unavailable or indeterminate; unavailable without prior state; classic protection to ruleset and ruleset to classic protection; foreign-authority separation; and fail-closed ambiguous-authority behavior. On the integrated main commit, 318 of 318 tests and all 7 required post-merge checks passed, with CAND-001 remaining non-regressed. These results demonstrate the repository-level fix and verification cycle; they do not establish production control effectiveness, independent audit, or verification of `AUD-002` or `AUD-005`.

## Findings and limitations

The repository demonstrates assessment engineering, not production control effectiveness. External GitHub settings can be unavailable due to permissions, and the lightweight local secret scanner is not equivalent to a full historical scan. Runtime IAM and logging remain unverified.

## Lessons learned and production extension

Evidence presence is weaker than evidence quality. This repository implements freshness rules and bounded repository-local JSON ingestion, but production use would still require authenticated read-only provider collectors, signed evidence manifests, isolated parsers, independent review, release provenance and a documented vulnerability-response lifecycle.

## Interview discussion

The hardest decision was preserving `UNVERIFIED` even when that lowers an apparent readiness score. The alternative—promoting documentation or a syntactically valid cloud identifier—would create a stronger-looking but methodologically false result.

The most important trade-off is strictness versus operability. A fail-closed gate can reject incomplete but legitimate evidence; the repository therefore preserves rejected or stale records for review while preventing them from changing control status.

The review found that `present: true` could previously promote weak evidence, that an external operational key could omit `external_target`, that invalid runtime primitive/status values could bypass schema-only constraints, and that authoritative context was not bound to its evidence key. Runtime validation now enforces primitive shapes and a positive status allowlist independently of JSON Schema, while caller-supplied context explicitly identifies the authorized evidence key. Centralized per-key requirement metadata denies unknown keys and requires the full external validation path for keys classified as external operational; adversarial tests cover the observed bypasses. This narrows the demonstrated false-positive paths but does not prove that no other path exists. A separate self-identified issue allowed the secret scanner to follow symlinks; it now uses bounded, regular-file-only traversal and masks detections.

In production I would use short-lived read-only provider identities, signed collection contexts, freshness SLAs by evidence class, transparency logs or Sigstore attestations, isolated parsing workers, artifact provenance and independent control-owner approval. Remaining risks include unavailable runtime evidence, unverified external IAM/logging effectiveness and dependence on remote platform capabilities.

Classification: Category C — Architectural Proposals. Evidence level: Level D. Approval status: Proposta. Origin: repository implementation and review. Justification: recruiter-oriented technical account of observed artifacts.
