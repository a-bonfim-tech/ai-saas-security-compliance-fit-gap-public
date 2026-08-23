import { describe, expect, it } from "vitest";
import { analyzeWorkflowText } from "../scripts/workflow-policy";

describe("GitHub Actions policy", () => {
  it("accepts pinned read-only checkout", () => {
    expect(analyzeWorkflowText(`permissions:\n  contents: read\nsteps:\n  - name: Checkout\n    uses: actions/checkout@${"a".repeat(40)}\n    with:\n      persist-credentials: false\n`)).toEqual([]);
  });

  it.each([
    "permissions: write-all",
    "jobs:\n  build:\n    permissions: write-all",
    "jobs:\n  build:\n    'permissions': 'write-all'"
  ])("detects write-all at relevant indentation", workflow => {
    expect(analyzeWorkflowText(workflow).map(finding => finding.rule)).toContain("write_all_permissions");
  });

  it.each(["|", ">"])("detects untrusted event interpolation in multiline run %s", scalar => {
    const workflow = `steps:\n  - name: Unsafe\n    run: ${scalar}\n      echo "\${{ github.event.issue.title }}"\n`;
    expect(analyzeWorkflowText(workflow).map(finding => finding.rule)).toContain("untrusted_expression_in_run");
  });

  it("does not treat a shell hash inside quotes as a YAML comment", () => {
    const workflow = `steps:\n  - run: echo "# \${{ github.event.issue.title }}"\n`;
    expect(analyzeWorkflowText(workflow).map(finding => finding.rule)).toContain("untrusted_expression_in_run");
  });

  it("accepts safe env indirection and scopes checkout credentials to the same step", () => {
    const safe = `steps:\n  - name: Checkout\n    uses: actions/checkout@${"a".repeat(40)}\n    with:\n      persist-credentials: false\n  - name: Safe\n    env:\n      TITLE: \${{ github.event.issue.title }}\n    run: echo "$TITLE"\n`;
    expect(analyzeWorkflowText(safe)).toEqual([]);
    const misplaced = `steps:\n  - uses: actions/checkout@${"a".repeat(40)}\n  - run: echo ok\n    with:\n      persist-credentials: false\n`;
    expect(analyzeWorkflowText(misplaced).map(finding => finding.rule)).toContain("checkout_credentials_persisted");
  });

  it("detects mutable actions, persisted credentials, dangerous triggers and untrusted run interpolation", () => {
    const findings = analyzeWorkflowText(`on:\n  pull_request_target:\npermissions: write-all\nsteps:\n  - name: Checkout\n    uses: actions/checkout@v4\n  - name: Unsafe\n    run: echo \${{ github.event.pull_request.title }}\n`);
    expect(findings.map(finding => finding.rule)).toEqual(expect.arrayContaining([
      "mutable_action_reference", "checkout_credentials_persisted", "dangerous_trigger",
      "write_all_permissions", "untrusted_expression_in_run"
    ]));
  });

  it("detects inline mutable and artifact-download action steps", () => {
    const findings = analyzeWorkflowText("steps:\n  - uses: owner/action@v1\n  - 'uses': actions/download-artifact@v4\n");
    expect(findings.map(finding => finding.rule)).toEqual(expect.arrayContaining([
      "mutable_action_reference", "artifact_download_requires_review"
    ]));
  });
});
