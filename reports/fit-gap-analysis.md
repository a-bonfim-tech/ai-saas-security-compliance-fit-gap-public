# Fit-Gap Analysis Report

Generated at: 2026-08-08T15:28:30.833Z

## Methodology

Framework -> Requirement -> Control -> Evidence -> Status -> Gap -> Risk -> Recommendation -> Roadmap

## Executive Summary

- Total controls assessed: 14
- Compliant controls: 1
- Partially covered controls: 3
- Gaps: 10
- High-risk findings: 7
- Medium-risk findings: 6
- Low-risk findings: 1

## Findings

| Control ID | Domain | Status | Risk | Recommendation |
|---|---|---|---|---|
| GOV-001 | Governance | Partial | Medium | Implement or document the following missing evidence: risk_management_process_defined. |
| IAM-001 | Identity and Access Management | Partial | Medium | Implement or document the following missing evidence: rbac_defined, privileged_access_reviewed. |
| SDLC-001 | Secure Software Development | Compliant | Low | Maintain the control and periodically refresh the supporting evidence. |
| VULN-001 | Vulnerability Management | Partial | Medium | Implement or document the following missing evidence: dependency_review_enabled. |
| LOG-001 | Logging and Monitoring | Gap | High | Implement or document the following missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined. |
| PRIV-001 | Privacy and Data Protection | Gap | High | Implement or document the following missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined. |
| AI-001 | AI Governance | Gap | High | Implement or document the following missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed. |
| APP-001 | Application Security | Gap | Medium | Implement or document the following missing evidence: authentication_mechanism_documented, authorization_checks_documented. |
| APP-002 | Application Security | Gap | Medium | Implement or document the following missing evidence: input_validation_documented, secure_error_handling_documented. |
| APP-003 | Application Security | Gap | Medium | Implement or document the following missing evidence: secrets_management_documented, rate_limiting_reviewed. |
| CLOUD-001 | Cloud Security | Gap | High | Implement or document the following missing evidence: cloud_provider_documented, cloud_iam_review_documented. |
| CLOUD-002 | Cloud Security | Gap | High | Implement or document the following missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented. |
| PRIV-002 | Privacy and Data Protection | Gap | High | Implement or document the following missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented. |
| AI-002 | AI Governance | Gap | High | Implement or document the following missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed. |

## Detailed Evidence Mapping

### GOV-001 — Security governance responsibilities are defined

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2

Status: Partial

Risk: Medium

Found evidence: security_owner_defined, security_policy_exists

Missing evidence: risk_management_process_defined

Recommendation: Implement or document the following missing evidence: risk_management_process_defined.

### IAM-001 — Access to systems is controlled using least privilege

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2, GDPR

Status: Partial

Risk: Medium

Found evidence: mfa_enabled

Missing evidence: rbac_defined, privileged_access_reviewed

Recommendation: Implement or document the following missing evidence: rbac_defined, privileged_access_reviewed.

### SDLC-001 — Code changes are reviewed before being merged

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2, OWASP

Status: Compliant

Risk: Low

Found evidence: branch_protection_enabled, pull_request_reviews_required, codeowners_configured

Missing evidence: None

Recommendation: Maintain the control and periodically refresh the supporting evidence.

### VULN-001 — Dependencies and code are scanned for vulnerabilities

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2, OWASP

Status: Partial

Risk: Medium

Found evidence: dependabot_enabled, codeql_enabled

Missing evidence: dependency_review_enabled

Recommendation: Implement or document the following missing evidence: dependency_review_enabled.

### LOG-001 — Security-relevant events are logged and monitored

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2, GDPR

Status: Gap

Risk: High

Found evidence: None

Missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined

Recommendation: Implement or document the following missing evidence: application_logs_enabled, cloud_audit_logs_enabled, alerting_process_defined.

### PRIV-001 — Personal data processing is documented and controlled

Frameworks: GDPR, ISO 27001, SOC 2

Status: Gap

Risk: High

Found evidence: None

Missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined

Recommendation: Implement or document the following missing evidence: data_inventory_exists, privacy_notice_exists, data_retention_defined.

### AI-001 — AI system purpose, data flow and risks are documented

Frameworks: EU AI Act, NIST CSF 2.0, OWASP LLM

Status: Gap

Risk: High

Found evidence: None

Missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed

Recommendation: Implement or document the following missing evidence: ai_system_description_exists, ai_data_flow_documented, human_oversight_defined, prompt_injection_risk_assessed.

### APP-001 — Authentication and authorization are documented and reviewed

Frameworks: OWASP, NIST CSF 2.0, SOC 2, ISO 27001

Status: Gap

Risk: Medium

Found evidence: None

Missing evidence: authentication_mechanism_documented, authorization_checks_documented

Recommendation: Implement or document the following missing evidence: authentication_mechanism_documented, authorization_checks_documented.

### APP-002 — Input validation and secure error handling are documented

Frameworks: OWASP, NIST CSF 2.0, SOC 2

Status: Gap

Risk: Medium

Found evidence: None

Missing evidence: input_validation_documented, secure_error_handling_documented

Recommendation: Implement or document the following missing evidence: input_validation_documented, secure_error_handling_documented.

### APP-003 — Secrets management and abuse prevention are reviewed

Frameworks: OWASP, SOC 2, ISO 27001

Status: Gap

Risk: Medium

Found evidence: None

Missing evidence: secrets_management_documented, rate_limiting_reviewed

Recommendation: Implement or document the following missing evidence: secrets_management_documented, rate_limiting_reviewed.

### CLOUD-001 — Cloud provider, IAM and privileged access are reviewed

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2

Status: Gap

Risk: High

Found evidence: None

Missing evidence: cloud_provider_documented, cloud_iam_review_documented

Recommendation: Implement or document the following missing evidence: cloud_provider_documented, cloud_iam_review_documented.

### CLOUD-002 — Cloud encryption and backup controls are reviewed

Frameworks: NIST CSF 2.0, ISO 27001, SOC 2, GDPR

Status: Gap

Risk: High

Found evidence: None

Missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented

Recommendation: Implement or document the following missing evidence: encryption_at_rest_reviewed, encryption_in_transit_reviewed, backup_recovery_documented.

### PRIV-002 — GDPR roles, agreements and data subject processes are reviewed

Frameworks: GDPR, ISO 27001, SOC 2

Status: Gap

Risk: High

Found evidence: None

Missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented

Recommendation: Implement or document the following missing evidence: controller_processor_roles_reviewed, dpa_reviewed, data_subject_rights_process_documented.

### AI-002 — AI vendor and transparency obligations are reviewed

Frameworks: EU AI Act, GDPR, OWASP LLM

Status: Gap

Risk: High

Found evidence: None

Missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed

Recommendation: Implement or document the following missing evidence: ai_vendor_review_documented, ai_transparency_notice_reviewed.
