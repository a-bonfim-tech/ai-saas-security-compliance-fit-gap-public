# SDR-003 — Secret-Safe Scanning

Context: Security tooling must not amplify a secret exposure or escape repository scope.
Decision: Reject symlinks, devices, binary/null-containing and oversized inputs; mask all detected values.
Alternatives: unrestricted recursive scanning; full matching excerpts.
Consequences: some excluded files require a stronger external scanner.
Residual risk: regex coverage is incomplete and Git history is not scanned locally. Symlink, oversized and binary exclusions are reported as partial coverage rather than a complete clean scan.
Classification: Category C; Evidence Level D; Status: Proposta.
