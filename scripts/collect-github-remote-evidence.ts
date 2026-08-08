import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

type Evidence = {
  key: string;
  present: boolean;
  source: string | null;
  notes: string;
};

type RemoteEvidenceReport = {
  repository: string;
  collectedAt: string;
  collector: string;
  evidence: Evidence[];
  warnings: string[];
};

function run(command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}

function runJson<T>(command: string, args: string[]): T | null {
  const output = run(command, args);
  if (!output) return null;

  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
}

function getRepository(): string {
  const repo = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!repo) {
    throw new Error("Unable to determine GitHub repository. Ensure gh is authenticated and the repository has an origin remote.");
  }
  return repo;
}

function ghApiJson<T>(endpoint: string): T | null {
  return runJson<T>("gh", ["api", endpoint]);
}

function ghApiStatus(endpoint: string): number | null {
  try {
    execFileSync("gh", ["api", endpoint], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return 200;
  } catch (error: any) {
    return error?.status ?? null;
  }
}

function collectRemoteEvidence(repository: string): RemoteEvidenceReport {
  const warnings: string[] = [];
  const evidence: Evidence[] = [];

  const repoInfo = runJson<{
    nameWithOwner: string;
    visibility: string;
    isPrivate: boolean;
    defaultBranchRef: { name: string } | null;
  }>("gh", ["repo", "view", repository, "--json", "nameWithOwner,visibility,isPrivate,defaultBranchRef"]);

  const defaultBranch = repoInfo?.defaultBranchRef?.name ?? "main";

  if (!repoInfo) {
    warnings.push("Repository metadata could not be collected.");
  }

  evidence.push({
    key: "repository_visibility_reviewed",
    present: Boolean(repoInfo?.visibility),
    source: "gh repo view --json visibility,isPrivate",
    notes: repoInfo
      ? `Repository visibility detected as ${repoInfo.visibility}. Private: ${repoInfo.isPrivate}.`
      : "Repository visibility could not be determined."
  });

  const branchProtectionStatus = ghApiStatus(`repos/${repository}/branches/${defaultBranch}/protection`);

  evidence.push({
    key: "branch_protection_enabled",
    present: branchProtectionStatus === 200,
    source: `gh api repos/${repository}/branches/${defaultBranch}/protection`,
    notes: branchProtectionStatus === 200
      ? `Branch protection is enabled for ${defaultBranch}.`
      : `Branch protection could not be confirmed for ${defaultBranch}. This may mean it is disabled or the token lacks permission.`
  });

  const branchProtection = ghApiJson<any>(`repos/${repository}/branches/${defaultBranch}/protection`);

  evidence.push({
    key: "pull_request_reviews_required",
    present: Boolean(branchProtection?.required_pull_request_reviews),
    source: `gh api repos/${repository}/branches/${defaultBranch}/protection`,
    notes: branchProtection?.required_pull_request_reviews
      ? "Required pull request reviews are configured in branch protection."
      : "Required pull request reviews could not be confirmed."
  });

  evidence.push({
    key: "status_checks_required",
    present: Boolean(branchProtection?.required_status_checks),
    source: `gh api repos/${repository}/branches/${defaultBranch}/protection`,
    notes: branchProtection?.required_status_checks
      ? "Required status checks are configured in branch protection."
      : "Required status checks could not be confirmed."
  });

  const vulnerabilityAlertsStatus = ghApiStatus(`repos/${repository}/vulnerability-alerts`);

  evidence.push({
    key: "dependabot_alerts_enabled",
    present: vulnerabilityAlertsStatus === 204,
    source: `gh api repos/${repository}/vulnerability-alerts`,
    notes: vulnerabilityAlertsStatus === 204
      ? "Dependabot vulnerability alerts are enabled."
      : "Dependabot vulnerability alerts could not be confirmed. This may require repository admin permissions."
  });

  const securityAndAnalysis = ghApiJson<any>(`repos/${repository}`);

  const secretScanningStatus = securityAndAnalysis?.security_and_analysis?.secret_scanning?.status;
  const pushProtectionStatus = securityAndAnalysis?.security_and_analysis?.secret_scanning_push_protection?.status;
  const advancedSecurityStatus = securityAndAnalysis?.security_and_analysis?.advanced_security?.status;

  evidence.push({
    key: "secret_scanning_enabled",
    present: secretScanningStatus === "enabled",
    source: `gh api repos/${repository}`,
    notes: secretScanningStatus
      ? `Secret scanning status: ${secretScanningStatus}.`
      : "Secret scanning status could not be determined."
  });

  evidence.push({
    key: "push_protection_enabled",
    present: pushProtectionStatus === "enabled",
    source: `gh api repos/${repository}`,
    notes: pushProtectionStatus
      ? `Secret scanning push protection status: ${pushProtectionStatus}.`
      : "Push protection status could not be determined."
  });

  evidence.push({
    key: "advanced_security_reviewed",
    present: Boolean(advancedSecurityStatus),
    source: `gh api repos/${repository}`,
    notes: advancedSecurityStatus
      ? `GitHub Advanced Security status: ${advancedSecurityStatus}.`
      : "GitHub Advanced Security status could not be determined."
  });

  const collaborators = ghApiJson<any[]>(`repos/${repository}/collaborators?per_page=100`);

  evidence.push({
    key: "collaborators_reviewed",
    present: Array.isArray(collaborators),
    source: `gh api repos/${repository}/collaborators`,
    notes: Array.isArray(collaborators)
      ? `Collaborator list was accessible. Collaborators found: ${collaborators.length}.`
      : "Collaborator list could not be accessed. This may require repository admin permissions."
  });

  if (!repoInfo) {
    warnings.push("Some repository-level evidence may be incomplete because repository metadata was unavailable.");
  }

  if (branchProtectionStatus !== 200) {
    warnings.push("Branch protection evidence is not confirmed. Review repository settings manually.");
  }

  if (vulnerabilityAlertsStatus !== 204) {
    warnings.push("Dependabot alert status is not confirmed. Review repository security settings manually.");
  }

  return {
    repository,
    collectedAt: new Date().toISOString(),
    collector: "github-remote-evidence-collector",
    evidence,
    warnings
  };
}

function main(): void {
  const repository = getRepository();
  const report = collectRemoteEvidence(repository);

  const outputDir = path.join(process.cwd(), "evidence/github");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "github-remote-evidence.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("Remote GitHub evidence collection completed.");
  console.log(`Repository: ${repository}`);
  console.log(`Evidence written to ${path.relative(process.cwd(), outputPath)}`);

  if (report.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
