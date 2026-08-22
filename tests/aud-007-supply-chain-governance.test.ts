import fs from "fs";
import path from "path";
import {
  describe,
  expect,
  it
} from "vitest";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

describe(
  "AUD-007 supply-chain and repository governance",
  () => {
    it(
      "configures Dependency Review on pull requests with least privilege and an immutable SHA",
      () => {
        const workflow = read(
          ".github/workflows/dependency-review.yml"
        );

        expect(workflow).toMatch(
          /pull_request:\s*\n\s+branches:\s*\[main\]/
        );

        expect(workflow).toMatch(
          /permissions:\s*\n\s+contents:\s+read/
        );

        const action = workflow.match(
          /actions\/dependency-review-action@([0-9a-f]{40})/
        );

        expect(action).not.toBeNull();

        expect(action?.[1]).toBe(
          "2031cfc080254a8a887f58cffee85186f0e49e48"
        );
      }
    );

    it(
      "preserves GitHub HTTP status instead of converting every successful API call to 200",
      () => {
        const collector = read(
          "scripts/collect-github-remote-evidence.ts"
        );

        expect(collector).toContain(
          '["api", "--include", endpoint]'
        );

        expect(collector).toMatch(
          /parseHttpStatus\(output\)/
        );

        expect(collector).not.toMatch(
          /execFileSync\("gh", \["api", endpoint\][\s\S]*?return 200;/
        );

        expect(collector).toContain(
          "vulnerabilityAlertsStatus === 204"
        );
      }
    );

    it(
      "derives default-branch status-check enforcement from active rulesets",
      () => {
        const collector = read(
          "scripts/collect-github-remote-evidence.ts"
        );

        expect(collector).toContain(
          "includes_parents=true"
        );

        expect(collector).toContain(
          'rule?.type ===\n              "required_status_checks"'
        );

        expect(collector).toContain(
          "rulesetStatusChecksRequired"
        );

        expect(collector).toContain(
          "activeMainRulesetPresent"
        );
      }
    );

    it(
      "does not treat existence of a pull-request ruleset as an approval requirement",
      () => {
        const collector = read(
          "scripts/collect-github-remote-evidence.ts"
        );

        expect(collector).toContain(
          "required_approving_review_count"
        );

        expect(collector).toMatch(
          /required_approving_review_count[\s\S]*?> 0/
        );

        expect(collector).toContain(
          "rulesetApprovalRequired"
        );
      }
    );

    it(
      "permits fresh remote governance state to replace legacy repository-settings positives",
      () => {
        const merge = read(
          "scripts/merge-remote-evidence.ts"
        );

        expect(merge).toContain(
          "existingIsLegacyRepositorySettingsEvidence"
        );

        expect(merge).toContain(
          'existing.source === "github/repository-settings"'
        );

        expect(merge).toContain(
          "freshRemoteStateIsAuthoritative"
        );
      }
    );
  }
);
