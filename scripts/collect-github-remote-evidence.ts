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

function parseHttpStatus(output: string): number | null {
  const match = output.match(/^HTTP\/\S+\s+(\d{3})/m);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function ghApiStatus(endpoint: string): number | null {
  try {
    const output = execFileSync(
      "gh",
      ["api", "--include", endpoint],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    return parseHttpStatus(output);
  } catch (error: any) {
    const stdout =
      typeof error?.stdout === "string"
        ? error.stdout
        : "";

    const stderr =
      typeof error?.stderr === "string"
        ? error.stderr
        : "";

    return parseHttpStatus(`${stdout}\n${stderr}`);
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

  if (repoInfo?.visibility) {
    evidence.push({
      key: "repository_visibility_reviewed",
      present: true,
      source: "gh repo view --json visibility,isPrivate",
      notes: `Repository visibility detected as ${repoInfo.visibility}. Private: ${repoInfo.isPrivate}.`
    });
  }

  const branchProtectionEndpoint =
    `repos/${repository}/branches/${defaultBranch}/protection`;

  const branchProtectionStatus =
    ghApiStatus(branchProtectionEndpoint);

  const branchProtection =
    ghApiJson<any>(branchProtectionEndpoint);

  const rulesetSummaries =
    ghApiJson<any[]>(
      `repos/${repository}/rulesets?includes_parents=true`
    );

  const activeBranchRulesets =
    (rulesetSummaries ?? []).filter(
      ruleset =>
        ruleset?.target === "branch" &&
        ruleset?.enforcement === "active"
    );

  const activeBranchRulesetDetails = activeBranchRulesets
    .map(ruleset =>
      ghApiJson<any>(
        `repos/${repository}/rulesets/${ruleset.id}`
      )
    )
    .filter((ruleset): ruleset is any =>
      Boolean(ruleset)
    );

  const rulesetDetailsComplete =
    activeBranchRulesetDetails.length === activeBranchRulesets.length;

  const activeMainRulesets = activeBranchRulesetDetails
    .filter(ruleset => {
      const include =
        ruleset?.conditions?.ref_name?.include;

      return (
        Array.isArray(include) &&
        (
          include.includes(
            `refs/heads/${defaultBranch}`
          ) ||
          include.includes("~DEFAULT_BRANCH")
        )
      );
    });

  const rulesetPullRequestRules =
    activeMainRulesets.flatMap(ruleset =>
      Array.isArray(ruleset?.rules)
        ? ruleset.rules.filter(
            (rule: any) =>
              rule?.type === "pull_request"
          )
        : []
    );

  const rulesetStatusCheckRules =
    activeMainRulesets.flatMap(ruleset =>
      Array.isArray(ruleset?.rules)
        ? ruleset.rules.filter(
            (rule: any) =>
              rule?.type ===
              "required_status_checks"
          )
        : []
    );

  const rulesetApprovalRequired =
    rulesetPullRequestRules.some(
      (rule: any) =>
        Number(
          rule?.parameters
            ?.required_approving_review_count ?? 0
        ) > 0
    );

  const rulesetStatusChecksRequired =
    rulesetStatusCheckRules.some(
      (rule: any) =>
        Array.isArray(
          rule?.parameters
            ?.required_status_checks
        ) &&
        rule.parameters.required_status_checks
          .length > 0
    );

  const activeMainRulesetPresent =
    activeMainRulesets.length > 0;

  const branchGovernanceConfirmed =
    branchProtectionStatus === 200 ||
    activeMainRulesetPresent;

  const branchGovernancePresenceComplete =
    branchProtectionStatus === 200 ||
    (
      branchProtectionStatus === 404 &&
      rulesetSummaries !== null &&
      rulesetDetailsComplete
    );

  const branchGovernanceRulesComplete =
    rulesetSummaries !== null &&
    rulesetDetailsComplete &&
    (
      branchProtectionStatus === 404 ||
      (branchProtectionStatus === 200 && branchProtection !== null)
    );

  if (branchGovernanceConfirmed || branchGovernancePresenceComplete) {
    evidence.push({
      key: "branch_protection_enabled",
      present: branchGovernanceConfirmed,
      source: activeMainRulesetPresent
        ? `gh api repos/${repository}/rulesets`
        : branchProtectionEndpoint,
      notes: branchProtectionStatus === 200
        ? `Classic branch protection is enabled for ${defaultBranch}.`
        : activeMainRulesetPresent
          ? `An active GitHub ruleset targets ${defaultBranch}. Classic branch protection remains unconfirmed.`
          : `Neither classic branch protection nor an active ruleset targeting ${defaultBranch} is configured.`
    });
  }

  const classicPullRequestReviewsRequired =
    Boolean(
      branchProtection
        ?.required_pull_request_reviews
    );

  const pullRequestReviewsRequired =
    classicPullRequestReviewsRequired ||
    rulesetApprovalRequired;

  if (pullRequestReviewsRequired || branchGovernanceRulesComplete) {
    evidence.push({
      key: "pull_request_reviews_required",
      present: pullRequestReviewsRequired,
      source: activeMainRulesetPresent
        ? `gh api repos/${repository}/rulesets`
        : branchProtectionEndpoint,
      notes: pullRequestReviewsRequired
        ? "At least one confirmed branch-governance mechanism requires approving pull request reviews."
        : "The confirmed branch-governance configuration does not require an approving pull request review."
    });
  }

  const classicStatusChecksRequired =
    Boolean(
      branchProtection?.required_status_checks
    );

  const statusChecksRequired =
    classicStatusChecksRequired ||
    rulesetStatusChecksRequired;

  if (statusChecksRequired || branchGovernanceRulesComplete) {
    evidence.push({
      key: "status_checks_required",
      present: statusChecksRequired,
      source: activeMainRulesetPresent
        ? `gh api repos/${repository}/rulesets`
        : branchProtectionEndpoint,
      notes: statusChecksRequired
        ? "Required status checks are configured for the default branch."
        : "The confirmed branch-governance configuration does not require status checks."
    });
  }

  const vulnerabilityAlertsStatus = ghApiStatus(`repos/${repository}/vulnerability-alerts`);

  if (vulnerabilityAlertsStatus === 204) {
    evidence.push({
      key: "dependabot_alerts_enabled",
      present: true,
      source: `gh api repos/${repository}/vulnerability-alerts`,
      notes: "Dependabot vulnerability alerts are enabled."
    });
  }

  const securityAndAnalysis = ghApiJson<any>(`repos/${repository}`);

  const secretScanningStatus = securityAndAnalysis?.security_and_analysis?.secret_scanning?.status;
  const pushProtectionStatus = securityAndAnalysis?.security_and_analysis?.secret_scanning_push_protection?.status;
  const advancedSecurityStatus = securityAndAnalysis?.security_and_analysis?.advanced_security?.status;

  if (secretScanningStatus === "enabled" || secretScanningStatus === "disabled") {
    evidence.push({
      key: "secret_scanning_enabled",
      present: secretScanningStatus === "enabled",
      source: `gh api repos/${repository}`,
      notes: `Secret scanning status: ${secretScanningStatus}.`
    });
  }

  if (pushProtectionStatus === "enabled" || pushProtectionStatus === "disabled") {
    evidence.push({
      key: "push_protection_enabled",
      present: pushProtectionStatus === "enabled",
      source: `gh api repos/${repository}`,
      notes: `Secret scanning push protection status: ${pushProtectionStatus}.`
    });
  }

  if (advancedSecurityStatus) {
    evidence.push({
      key: "advanced_security_reviewed",
      present: true,
      source: `gh api repos/${repository}`,
      notes: `GitHub Advanced Security status: ${advancedSecurityStatus}.`
    });
  }

  const collaborators = ghApiJson<any[]>(`repos/${repository}/collaborators?per_page=100`);

  if (Array.isArray(collaborators)) {
    evidence.push({
      key: "collaborators_reviewed",
      present: true,
      source: `gh api repos/${repository}/collaborators`,
      notes: `Collaborator list was accessible. Collaborators found: ${collaborators.length}.`
    });
  }

  if (!repoInfo) {
    warnings.push("Some repository-level evidence may be incomplete because repository metadata was unavailable.");
  }

  if (
    branchProtectionStatus !== 200 &&
    !activeMainRulesetPresent
  ) {
    warnings.push(
      "Neither classic branch protection nor an active ruleset targeting the default branch could be confirmed."
    );
  } else if (
    branchProtectionStatus !== 200 &&
    activeMainRulesetPresent
  ) {
    warnings.push(
      "Classic branch protection is unconfirmed; repository governance is instead evidenced by an active ruleset targeting the default branch."
    );
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
