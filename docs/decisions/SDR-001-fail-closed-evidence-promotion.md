# SDR-001 — Fail-Closed Evidence Promotion

Context: Boolean presence allowed weak evidence to affect control status.
Decision: Promotion requires semantic source validation; external evidence additionally requires freshness, authoritative expected context supplied independently by the caller, verification metadata and three-way agreement among the recomputed payload SHA-256, the evidence-declared digest and `expectedPayloadDigest`. Metadata is `SELF_DECLARED` until `VERIFIED_AGAINST_EXPECTED_CONTEXT`.
Alternatives: trust collector output; manual-only review; boolean presence.
Consequences: stronger integrity with more explicit rejections and migration work.
Residual risk: semantic ownership still depends on authoritative collection.
Classification: Category C; Evidence Level D; Status: Proposta.
