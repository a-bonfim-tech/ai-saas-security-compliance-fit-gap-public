# Remediation Roadmap

## Purpose

This roadmap prioritizes remediation actions based on fit-gap findings, risk level, missing evidence and estimated implementation effort.

## Priority Definitions

| Priority | Meaning |
|---|---|
| P0 | Immediate remediation required. |
| P1 | High-priority remediation for significant exposure. |
| P2 | Planned remediation for medium-risk issues. |
| P3 | Low-priority improvement or documentation work. |

## Roadmap

| Priority | Control | Domain | Risk | Effort | Remediation |
|---|---|---|---|---|---|
| P1 | LOG-001 | Logging and Monitoring | High | Medium | Implement or document the following missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined. |
| P1 | PRIV-001 | Privacy and Data Protection | High | High | Implement or document the following missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined. |
| P1 | AI-001 | AI Governance | High | High | Implement or document the following missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed. |
| P1 | CLOUD-001 | Cloud Security | High | Medium | Implement or document the following missing evidence: cloud_provider_documented, cloud_iam_review_documented. |
| P1 | CLOUD-002 | Cloud Security | High | High | Implement or document the following missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented. |
| P1 | PRIV-002 | Privacy and Data Protection | High | High | Implement or document the following missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented. |
| P1 | AI-002 | AI Governance | High | Medium | Implement or document the following missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed. |
| P2 | GOV-001 | Governance | Medium | Low | Implement or document the following missing evidence: risk_management_process_defined. |
| P2 | IAM-001 | Identity and Access Management | Medium | Medium | Implement or document the following missing evidence: rbac_defined, privileged_access_reviewed. |
| P2 | VULN-001 | Vulnerability Management | Medium | Low | Implement or document the following missing evidence: dependency_review_enabled. |
| P2 | APP-001 | Application Security | Medium | Medium | Implement or document the following missing evidence: authentication_mechanism_documented, authorization_checks_documented. |
| P2 | APP-002 | Application Security | Medium | Medium | Implement or document the following missing evidence: input_validation_documented, secure_error_handling_documented. |
| P2 | APP-003 | Application Security | Medium | Medium | Implement or document the following missing evidence: secrets_management_documented, rate_limiting_reviewed. |

## Detailed Missing Evidence

### P1 — LOG-001: Security-relevant events are logged and monitored

- Domain: Logging and Monitoring
- Status: Gap
- Risk: High
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined.
- Missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined

### P1 — PRIV-001: Personal data processing is documented and controlled

- Domain: Privacy and Data Protection
- Status: Gap
- Risk: High
- Estimated effort: High
- Remediation: Implement or document the following missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined.
- Missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined

### P1 — AI-001: AI system purpose, data flow and risks are documented

- Domain: AI Governance
- Status: Gap
- Risk: High
- Estimated effort: High
- Remediation: Implement or document the following missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed.
- Missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed

### P1 — CLOUD-001: Cloud provider, IAM and privileged access are reviewed

- Domain: Cloud Security
- Status: Gap
- Risk: High
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: cloud_provider_documented, cloud_iam_review_documented.
- Missing evidence: cloud_provider_documented, cloud_iam_review_documented

### P1 — CLOUD-002: Cloud encryption and backup controls are reviewed

- Domain: Cloud Security
- Status: Gap
- Risk: High
- Estimated effort: High
- Remediation: Implement or document the following missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented.
- Missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented

### P1 — PRIV-002: GDPR roles, agreements and data subject processes are reviewed

- Domain: Privacy and Data Protection
- Status: Gap
- Risk: High
- Estimated effort: High
- Remediation: Implement or document the following missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented.
- Missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented

### P1 — AI-002: AI vendor and transparency obligations are reviewed

- Domain: AI Governance
- Status: Gap
- Risk: High
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed.
- Missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed

### P2 — GOV-001: Security governance responsibilities are defined

- Domain: Governance
- Status: Partial
- Risk: Medium
- Estimated effort: Low
- Remediation: Implement or document the following missing evidence: risk_management_process_defined.
- Missing evidence: risk_management_process_defined

### P2 — IAM-001: Access to systems is controlled using least privilege

- Domain: Identity and Access Management
- Status: Partial
- Risk: Medium
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: rbac_defined, privileged_access_reviewed.
- Missing evidence: rbac_defined, privileged_access_reviewed

### P2 — VULN-001: Dependencies and code are scanned for vulnerabilities

- Domain: Vulnerability Management
- Status: Partial
- Risk: Medium
- Estimated effort: Low
- Remediation: Implement or document the following missing evidence: dependency_review_enabled.
- Missing evidence: dependency_review_enabled

### P2 — APP-001: Authentication and authorization are documented and reviewed

- Domain: Application Security
- Status: Gap
- Risk: Medium
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: authentication_mechanism_documented, authorization_checks_documented.
- Missing evidence: authentication_mechanism_documented, authorization_checks_documented

### P2 — APP-002: Input validation and secure error handling are documented

- Domain: Application Security
- Status: Gap
- Risk: Medium
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: input_validation_documented, secure_error_handling_documented.
- Missing evidence: input_validation_documented, secure_error_handling_documented

### P2 — APP-003: Secrets management and abuse prevention are reviewed

- Domain: Application Security
- Status: Gap
- Risk: Medium
- Estimated effort: Medium
- Remediation: Implement or document the following missing evidence: secrets_management_documented, rate_limiting_reviewed.
- Missing evidence: secrets_management_documented, rate_limiting_reviewed
