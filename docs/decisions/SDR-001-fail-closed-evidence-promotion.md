# SDR-001 — Fail-Closed Evidence Promotion

Context: Boolean presence allowed weak evidence to affect control status.
Decision: Runtime promotion is the authoritative trust boundary and validates primitive shapes and a positive status allowlist without depending on JSON Schema execution. Promotion requires a known evidence key classified by central trusted metadata as documentary, repository or external operational; unknown keys fail closed. The evidence input cannot select the class through `source`, `status` or presence of `external_target`. External operational evidence additionally requires its target, freshness, authoritative expected context supplied independently by the caller and explicitly bound to the evidence key, verification metadata and three-way agreement among the recomputed payload SHA-256, the evidence-declared digest and `expectedPayloadDigest`. Metadata is `SELF_DECLARED` until `VERIFIED_AGAINST_EXPECTED_CONTEXT`.
Alternatives: trust collector output; manual-only review; boolean presence.
Consequences: stronger integrity with more explicit rejections and migration work.
Residual risk: semantic ownership still depends on authoritative collection.
Classification: Category C; Evidence Level D; Status: Proposta.
