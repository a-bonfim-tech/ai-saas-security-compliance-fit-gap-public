import fs from "fs";
import path from "path";
import {
  describe,
  expect,
  it
} from "vitest";
import { mergeEvidenceBatch, type MergeableEvidence } from "../scripts/evidence-merge";

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

    it("rejects provenance-less or foreign authority state changes without mutation", () => {
      const provenance = {
        assessment_repository: "a-bonfim-tech/assessment",
        source_repository: "a-bonfim-tech/source-a",
        source_collected_at: "2026-08-23T00:00:00Z",
        source_collector: "github-remote-evidence-collector"
      };
      const base: MergeableEvidence[] = [{
        key: "pull_request_reviews_required", present: true,
        source: "github/repository-settings", notes: "legacy positive"
      }];
      const before = JSON.stringify(base);
      expect(() => mergeEvidenceBatch(base, [{
        key: "pull_request_reviews_required", present: false,
        source: "github/repository-settings", notes: "new negative", provenance
      }])).toThrow(/lacks existing provenance/);
      expect(JSON.stringify(base)).toBe(before);

      const foreignBase: MergeableEvidence[] = [{ ...base[0], provenance }];
      const foreignBefore = JSON.stringify(foreignBase);
      expect(() => mergeEvidenceBatch(foreignBase, [{
        key: "pull_request_reviews_required", present: false,
        source: "github/repository-settings", notes: "foreign negative",
        provenance: { ...provenance, source_repository: "a-bonfim-tech/source-b", source_collected_at: "2026-08-24T00:00:00Z" }
      }])).toThrow(/Conflicting authoritative sources/);
      expect(JSON.stringify(foreignBase)).toBe(foreignBefore);
    });
  }
);
