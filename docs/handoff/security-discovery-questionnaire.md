# Security Discovery Questionnaire

## Product Scope

1. What is the primary product or platform in scope for the assessment?
2. What are the main customer segments?
3. Is the product already used by paying B2B customers?
4. Are enterprise customers asking for security or compliance evidence?
5. Are there existing security questionnaires or customer requirements?

## Technical Stack

1. Which repositories are in scope?
2. What is the primary application and data stack?
3. Which cloud providers are used?
4. Which hosting, database and platform services are used?
5. Are there separate development, staging and production environments?

## Security and DevOps

1. Is branch protection enabled?
2. Are pull request reviews required?
3. Is CodeQL or another SAST tool used?
4. Is Dependabot enabled?
5. Is secret scanning enabled?
6. Are CI/CD secrets reviewed?
7. How are production deployment permissions controlled?

## Privacy and Data Protection

1. What personal data is processed?
2. Is the organization acting as controller, processor or both?
3. Is a data processing agreement available?
4. Are subprocessors documented?
5. Are data retention rules defined?
6. Are deletion requests supported?
7. Are logs reviewed for personal data exposure?

## AI Governance

1. Which AI models or providers are used?
2. Are user or customer inputs sent to external AI providers?
3. Are prompts or outputs stored?
4. Is personal data sent to AI models?
5. Is customer data used for model training?
6. Is human oversight required for AI outputs?
7. Has prompt injection risk been assessed?
8. Are AI limitations communicated to users?

## Compliance Priorities

1. Is the goal internal security improvement, customer readiness or audit preparation?
2. Which frameworks are highest priority: NIST CSF 2.0, ISO 27001, SOC 2, GDPR, EU AI Act?
3. Are there target customers requiring SOC 2 or ISO 27001?
4. Are there existing policies or previous assessments?
5. What would a successful assessment deliverable look like?

## Deliverables

1. Should the final output be a report, tool, dashboard, backlog or a combination of these?
2. Should evidence collection be automated?
3. Should the project integrate with GitHub, cloud APIs or documentation systems?
4. Who will review the findings?
5. What format is preferred for executive reporting?

## Public Repository Boundary

This questionnaire is intentionally organization-neutral. Do not commit real customer data, confidential architecture details, credentials, internal findings or other non-public information to this repository.