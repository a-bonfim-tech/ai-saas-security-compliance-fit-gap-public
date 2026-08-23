export type EvidenceRequirement = "documentary" | "repository" | "external_operational";

/**
 * Authoritative evidence classification used by promotion decisions.
 * Input-provided source, status and target fields never select a requirement.
 */
export const EVIDENCE_REQUIREMENTS = {
  security_owner_defined: "documentary",
  security_policy_exists: "repository",
  risk_management_process_defined: "documentary",
  mfa_enabled: "external_operational",
  rbac_defined: "documentary",
  privileged_access_reviewed: "external_operational",
  branch_protection_enabled: "repository",
  pull_request_reviews_required: "repository",
  codeowners_configured: "repository",
  dependabot_enabled: "repository",
  codeql_enabled: "repository",
  dependency_review_enabled: "repository",
  application_logs_enabled: "external_operational",
  cloud_audit_logs_enabled: "external_operational",
  alerting_process_defined: "documentary",
  data_inventory_exists: "documentary",
  privacy_notice_exists: "documentary",
  data_retention_defined: "documentary",
  ai_system_description_exists: "documentary",
  ai_data_flow_documented: "documentary",
  human_oversight_defined: "documentary",
  prompt_injection_risk_assessed: "documentary",
  authentication_mechanism_documented: "documentary",
  authorization_checks_documented: "documentary",
  input_validation_documented: "documentary",
  secure_error_handling_documented: "documentary",
  secrets_management_documented: "documentary",
  rate_limiting_reviewed: "documentary",
  cloud_provider_documented: "documentary",
  cloud_iam_review_documented: "documentary",
  encryption_at_rest_reviewed: "documentary",
  encryption_in_transit_reviewed: "documentary",
  backup_recovery_documented: "documentary",
  controller_processor_roles_reviewed: "documentary",
  dpa_reviewed: "documentary",
  data_subject_rights_process_documented: "documentary",
  ai_vendor_review_documented: "documentary",
  ai_transparency_notice_reviewed: "documentary"
} as const satisfies Readonly<Record<string, EvidenceRequirement>>;

export function getEvidenceRequirement(key: string | undefined): EvidenceRequirement | undefined {
  if (!key) return undefined;
  return (EVIDENCE_REQUIREMENTS as Readonly<Record<string, EvidenceRequirement>>)[key];
}
