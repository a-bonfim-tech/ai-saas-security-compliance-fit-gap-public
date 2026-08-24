# SDR-005 — Freshness and Replay Resistance

Context: Authentic evidence can become stale or be replayed into another target or environment.
Decision: Calculate freshness with an injected clock; reject missing, expired or future-skewed timestamps; compare provider, environment, context, target fingerprint, binding digest, collector version, expected payload digest and applicable repository revision with caller-supplied authoritative expected context. The expected payload digest must originate independently of the evidence; self-consistency is insufficient.
Alternatives: timestamp-only checks; indefinite validity; manual freshness review.
Consequences: clock and lifecycle policies must be explicit, and stale evidence remains visible but non-promotable.
Residual risk: unsigned local metadata cannot prove collector identity.
Classification: Category C; Evidence Level D; Status: Proposta.
