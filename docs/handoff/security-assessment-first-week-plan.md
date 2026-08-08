# Security Assessment First Week Plan

## Objective

Use the first week to understand the product, scope the security and compliance problem and avoid making unsupported assumptions.

## Day 1: Product and Scope

Questions to answer:

- What does the product do?
- Who are the customers?
- What business problem does the product solve?
- Is the product B2B SaaS?
- Where is the product hosted?
- What repositories are in scope?
- What environments exist?
- What data is processed?
- Is AI used in production?

Deliverable:

- Product context notes.
- Initial asset and data flow assumptions.
- Open questions list.

## Day 2: Architecture and Data

Questions to answer:

- What is the application architecture?
- What is the cloud architecture?
- What database is used?
- What authentication mechanism is used?
- What external vendors are used?
- What AI providers or models are used?
- Are prompts, outputs or logs stored?

Deliverable:

- Draft architecture summary.
- Draft data inventory.
- AI system description draft.

## Day 3: GitHub and Secure SDLC

Questions to answer:

- Are branch protection rules enabled?
- Are pull request reviews required?
- Is CodeQL enabled?
- Is Dependabot enabled?
- Is secret scanning enabled?
- Are CI workflows secure?
- Who has repository access?

Deliverable:

- GitHub security checklist.
- Initial secure SDLC gaps.

## Day 4: Compliance Mapping

Questions to answer:

- Which frameworks are most relevant?
- Which requirements apply now?
- Which requirements are future-readiness items?
- Which evidence already exists?
- Which evidence is missing?

Deliverable:

- Initial control mapping.
- Evidence register draft.
- Fit-gap assumptions list.

## Day 5: First Fit-Gap Readout

Questions to answer:

- What is already strong?
- What is missing?
- What is high risk?
- What is unclear?
- What should be prioritized first?

Deliverable:

- Initial fit-gap report.
- Remediation roadmap draft.
- Executive summary draft.

## Communication Principle

Do not say "compliant" without evidence.

Use this structure:

The control is partially covered. I found evidence A and B, but evidence C is missing. The risk is medium/high because of X. The recommended remediation is Y.
