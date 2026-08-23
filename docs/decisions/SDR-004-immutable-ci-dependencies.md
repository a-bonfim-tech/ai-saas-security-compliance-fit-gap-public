# SDR-004 — Immutable CI Dependencies

Context: Mutable Action tags can change without repository review.
Decision: Pin external Actions to full commit SHAs, disable persisted checkout credentials and default workflows to read-only permissions.
Alternatives: semantic tags; organization allowlist only.
Implementation scope: `WORKFLOW_POLICY_PARSER_SCOPE=LIMITED`; this is indentation-aware lexical analysis for enumerated controls, not full semantic YAML parsing.
Consequences: automated update tooling is needed to maintain freshness.
Residual risk: a pinned upstream commit or runner image can still be compromised.
Classification: Category C; Evidence Level D; Status: Proposta.
