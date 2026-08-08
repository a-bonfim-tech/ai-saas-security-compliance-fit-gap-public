# AI Risk Assessment Template

## Purpose

This template supports the assessment of security, privacy, operational and governance risks in AI-enabled B2B SaaS products.

## Risk Scoring Model

Risk rating should consider:

- Likelihood
- Impact
- Data sensitivity
- User impact
- Legal or regulatory relevance
- Customer trust impact
- Technical exploitability

## Risk Register

| Risk ID | Category | Risk Scenario | Likelihood | Impact | Rating | Existing Controls | Gaps | Recommended Treatment |
|---|---|---|---|---|---|---|---|---|
| AI-RISK-001 | Prompt Injection | A user manipulates prompts to override intended system behavior. | Medium | High | High | TBD | TBD | Add prompt injection testing and output validation. |
| AI-RISK-002 | Data Leakage | Sensitive or personal data is exposed through prompts, outputs or logs. | Medium | High | High | TBD | TBD | Implement data minimization, redaction and logging controls. |
| AI-RISK-003 | Insecure Output Handling | AI output is trusted without validation and causes unsafe downstream action. | Medium | High | High | TBD | TBD | Validate outputs before use in business logic. |
| AI-RISK-004 | Overreliance | Users treat AI-generated output as authoritative without human review. | Medium | Medium | Medium | TBD | TBD | Add user notices and human oversight rules. |
| AI-RISK-005 | Third-Party Model Risk | Model provider processing creates privacy, security or contractual exposure. | Medium | High | High | TBD | TBD | Review vendor terms, DPA and data processing boundaries. |
| AI-RISK-006 | Inadequate Logging | AI interactions are not sufficiently logged for investigation or monitoring. | Medium | Medium | Medium | TBD | TBD | Define logging events and retention rules. |
| AI-RISK-007 | Unclear Ownership | No owner is responsible for AI system risk decisions. | Medium | Medium | Medium | TBD | TBD | Assign business and technical owners. |

## Treatment Options

- Avoid the risk
- Reduce the risk
- Transfer the risk
- Accept the risk

## Evidence Requirements

Each AI risk assessment should produce:

- AI system description
- Data flow documentation
- Risk register
- Human oversight description
- Logging and monitoring requirements
- Vendor/model provider review
- Remediation roadmap
