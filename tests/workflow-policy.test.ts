import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzePnpmVersionParity, analyzeWorkflowText } from "../scripts/workflow-policy";

const REQUIRED_CI_CHECK_NAME = "Validate TypeScript project";

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function hasPullRequestMainTrigger(workflow: string): boolean {
  const lines = workflow.replace(/\r\n?/g, "\n").split("\n");
  const onIndex = lines.findIndex(line => /^on:\s*$/.test(line));
  if (onIndex < 0) return false;
  const end = lines.findIndex((line, index) => index > onIndex && line.trim() && indentation(line) === 0);
  const triggerLines = lines.slice(onIndex + 1, end < 0 ? undefined : end);
  const pullRequestIndex = triggerLines.findIndex(line => /^  pull_request:\s*/.test(line));
  if (pullRequestIndex < 0) return false;
  const nextTrigger = triggerLines.findIndex((line, index) =>
    index > pullRequestIndex && /^  [A-Za-z0-9_-]+:\s*/.test(line)
  );
  const pullRequest = triggerLines.slice(
    pullRequestIndex,
    nextTrigger < 0 ? undefined : nextTrigger
  ).join("\n");
  return /branches:\s*\[[^\]]*\bmain\b[^\]]*\]/.test(pullRequest) ||
    /branches:\s*\n(?: {6}-\s*.*\n)* {6}-\s*main\s*$/m.test(pullRequest);
}

function requiredPolicyIsStructurallyEnforced(workflows: string[]): boolean {
  const matchingJobs: string[] = [];

  for (const workflow of workflows) {
    if (!hasPullRequestMainTrigger(workflow)) continue;
    const lines = workflow.replace(/\r\n?/g, "\n").split("\n");
    const jobsIndex = lines.findIndex(line => /^jobs:\s*$/.test(line));
    if (jobsIndex < 0) continue;

    for (let index = jobsIndex + 1; index < lines.length;) {
      if (lines[index].trim() && indentation(lines[index]) === 0) break;
      if (!/^  [A-Za-z0-9_-]+:\s*$/.test(lines[index])) { index++; continue; }
      const start = index;
      index++;
      while (index < lines.length && (!lines[index].trim() || indentation(lines[index]) > 2)) index++;
      const job = lines.slice(start, index).join("\n");
      if (/^    name:\s*Validate TypeScript project\s*$/m.test(job)) matchingJobs.push(job);
    }
  }

  if (matchingJobs.length !== 1) return false;
  const job = matchingJobs[0];
  if (/^    if\s*:/m.test(job)) return false;

  const lines = job.split("\n");
  let validPolicySteps = 0;
  let unsafePolicyStep = false;
  for (let index = 0; index < lines.length; index++) {
    if (!/^      -\s+/.test(lines[index])) continue;
    const step = [lines[index].replace(/^      -\s+/, "        ")];
    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      if (/^      -\s+/.test(lines[cursor]) || (lines[cursor].trim() && indentation(lines[cursor]) <= 4)) break;
      step.push(lines[cursor]);
    }
    const stepText = step.join("\n");
    const runValues = [...stepText.matchAll(/^        run:\s*(.*?)\s*$/gm)].map(match => match[1]);
    if (!runValues.some(value => /\bpnpm\s+security:policy\b/.test(value))) continue;

    const directPolicy = runValues.length === 1 && runValues[0] === "pnpm security:policy";
    const continueOnError = /^        continue-on-error:\s*true\s*$/m.test(stepText);
    const conditional = /^        if\s*:/m.test(stepText);
    if (!directPolicy || continueOnError || conditional) unsafePolicyStep = true;
    else validPolicySteps++;
  }
  return validPolicySteps === 1 && !unsafePolicyStep;
}

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

  it("normalizes quoted immutable action references without weakening mutable-ref rejection", () => {
    const immutable = "0123456789012345678901234567890123456789";
    for (const reference of [`owner/action@${immutable}`, `\"owner/action@${immutable}\"`, `'owner/action@${immutable}'`]) {
      expect(analyzeWorkflowText(`steps:\n  - uses: ${reference}\n`)).toEqual([]);
    }
    for (const reference of ["owner/action@v1", "owner/action@main", "owner/action@abc123", `owner/action@${"a".repeat(39)}`, `owner/action@${"a".repeat(41)}`, "owner/action@${{ matrix.ref }}", "null", "\"owner/action@abc123\"", "\"owner/action@abc123'"]) {
      expect(analyzeWorkflowText(`steps:\n  - uses: ${reference}\n`).map(finding => finding.rule)).toContain("mutable_action_reference");
    }
  });
});

describe("pnpm workflow version parity", () => {
  const expected = "pnpm@11.8.0";
  const corepackWorkflow = (version: string) => `steps:\n  - name: Activate pinned pnpm\n    run: corepack prepare pnpm@${version} --activate\n`;
  const denied = (workflow: string, authority = expected) => expect(analyzePnpmVersionParity(workflow, authority).length).toBeGreaterThan(0);
  const accepted = (workflow: string, authority = expected) => expect(analyzePnpmVersionParity(workflow, authority)).toEqual([]);

  it.each([
    ["11.2.2", "pnpm_version_drift"],
    ["latest", "pnpm_version_drift"],
    ["11.8", "pnpm_version_drift"]
  ])("rejects non-equivalent corepack pin %s", (version, rule) => {
    expect(analyzePnpmVersionParity(corepackWorkflow(version), expected).map(finding => finding.rule)).toContain(rule);
  });

  it("accepts the exact packageManager version", () => {
    accepted(corepackWorkflow("11.8.0"));
  });

  it("does not flag a workflow that does not configure or install pnpm", () => {
    accepted("steps:\n  - run: echo ok\n");
    accepted("steps:\n  - run: |\n");
  });

  it("rejects multiple workflows when any configured version diverges", () => {
    const findings = [corepackWorkflow("11.8.0"), corepackWorkflow("11.2.2")]
      .flatMap(workflow => analyzePnpmVersionParity(workflow, expected));
    expect(findings.map(finding => finding.rule)).toEqual(["pnpm_version_drift"]);
  });

  it("rejects pnpm/action-setup without an exact matching version", () => {
    denied("steps:\n  - uses: pnpm/action-setup@v4\n    with:\n      version: 11.8.0\n");
    denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n`);
    denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.2.2\n`);
    accepted(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.8.0\n`);
  });

  it.each(["", "latest", "11.8", "^11.8.0", "~11.8.0", "${{ matrix.pnpm }}", "${PNPM_VERSION}", '""', "null", "11.2.2"])
    ("rejects invalid block-style pnpm/action-setup version %s", version => {
      denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: ${version}\n`);
    });

  it("rejects internally quoted and conflicting action-setup versions", () => {
    denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.\"8\".0\n`);
    denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.8.0\n      version: 11.2.2\n`);
    accepted(`steps:\n  - uses: \"pnpm/action-setup@${"a".repeat(40)}\"\n    with:\n      version: \"11.8.0\"\n`);
  });

  it.each([
    "npm install -g pnpm",
    "npm i -g pnpm",
    "pnpm add -g pnpm",
    "yarn global add pnpm",
    "yarn global add pnpm@11.2.2",
    "corepack install --global pnpm",
    "corepack use pnpm@11.2.2"
  ])("rejects missing or divergent setup: %s", command => denied(`steps:\n  - run: ${command}\n`));

  it.each([
    "npm install -g pnpm@11.8.0",
    "npm i -g pnpm@11.8.0",
    "pnpm add -g pnpm@11.8.0",
    "yarn global add pnpm@11.8.0",
    "corepack install --global pnpm@11.8.0",
    "corepack use pnpm@11.8.0"
  ])("accepts exact setup: %s", command => accepted(`steps:\n  - run: ${command}\n`));

  it("normalizes shell line continuations before checking versions", () => {
    denied("steps:\n  - run: |\n      corepack prepare \\\n        pnpm@11.2.2 --activate\n");
    accepted("steps:\n  - run: |\n      corepack prepare \\\n        pnpm@11.8.0 --activate\n");
  });

  it("ignores non-executable comments and quoted echo arguments", () => {
    accepted("# corepack prepare pnpm@11.2.2 --activate\nsteps:\n  - name: pnpm@11.2.2 documentation\n    env:\n      OLD_VERSION: pnpm@11.2.2\n    run: |\n      # corepack prepare pnpm@11.2.2 --activate\n      echo \"# corepack prepare pnpm@11.2.2 --activate\"\n      echo safe\n");
  });

  it("fails closed for unresolved versions, ranges and malformed packageManager", () => {
    for (const version of ["$PNPM_VERSION", "${{ inputs.pnpm_version }}", "latest", "11.8", "11", "*", "^11.8.0", ">=11.8.0"]) {
      denied(corepackWorkflow(version));
    }
    for (const authority of ["", "pnpm", "pnpm@latest", "pnpm@11.8", "pnpm@^11.8.0", "$PACKAGE_MANAGER"]) {
      denied(corepackWorkflow("11.8.0"), authority);
    }
  });

  it("handles CRLF, unusual whitespace and multiple commands without changing shell command boundaries", () => {
    accepted("steps:\r\n  - run: corepack   prepare   'pnpm@11.8.0'   --activate\r\n");
    accepted("steps:\n  - run: |\n      echo before\n      corepack prepare pnpm@11.8.0 --activate\n      echo after\n");
    accepted("steps:\n  - run: corepack prepare pnpm@11.8.0 --activate && yarn global add pnpm@11.8.0\n");
    denied("steps:\n  - run: corepack prepare pnpm@11.8.0 --activate && yarn global add pnpm@11.2.2\n");
    denied("steps:\n  - run: >\n      echo before\n\n      yarn global add pnpm@11.2.2\n");
  });

  it("resolves supported wrappers and assignments without hiding pnpm setup", () => {
    for (const command of [
      "env CI=1 yarn global add pnpm",
      "env CI=1 yarn global add pnpm@11.2.2",
      "sudo -n yarn global add pnpm",
      "sudo -n yarn global add pnpm@11.2.2",
      "command -- yarn global add pnpm",
      "command -- yarn global add pnpm@11.2.2",
      "exec yarn global add pnpm",
      "exec yarn global add pnpm@11.2.2",
      "env CI=1 sudo -n command -- yarn global add pnpm@11.2.2"
    ]) denied(`steps:\n  - run: ${command}\n`);
    for (const command of [
      "env CI=1 yarn global add pnpm@11.8.0",
      "env -i yarn global add pnpm@11.8.0",
      "sudo -n yarn global add pnpm@11.8.0",
      "sudo -- yarn global add pnpm@11.8.0",
      "sudo -u root yarn global add pnpm@11.8.0",
      "sudo -E yarn global add pnpm@11.8.0",
      "command -- yarn global add pnpm@11.8.0",
      "command -p yarn global add pnpm@11.8.0",
      "exec yarn global add pnpm@11.8.0",
      "CI=1 env FOO=bar yarn global add pnpm@11.8.0",
      "env CI=1 sudo -n command -- yarn global add pnpm@11.8.0"
    ]) accepted(`steps:\n  - run: ${command}\n`);
  });

  it("analyzes pnpm setup in subshells and command substitutions", () => {
    for (const command of [
      "(yarn global add pnpm@11.2.2)",
      "(yarn global add pnpm)",
      "(corepack prepare pnpm@11.2.2 --activate)",
      "echo $(yarn global add pnpm)",
      "echo $(yarn global add pnpm@11.2.2)",
      "echo \"$(yarn global add pnpm@11.2.2)\"",
      "echo `yarn global add pnpm@11.2.2`",
      "printf '%s' \"$(corepack prepare pnpm@11.2.2 --activate)\""
    ]) denied(`steps:\n  - run: ${command}\n`);
    for (const command of [
      "(yarn global add pnpm@11.8.0)",
      "((corepack prepare pnpm@11.8.0 --activate))",
      "echo $(yarn global add pnpm@11.8.0)",
      "echo `yarn global add pnpm@11.8.0`",
      "printf '%s' \"$(corepack prepare pnpm@11.8.0 --activate)\""
    ]) accepted(`steps:\n  - run: ${command}\n`);
  });

  it("keeps non-executable setup text literal", () => {
    accepted("steps:\n  - run: echo \"yarn global add pnpm@11.2.2\"\n");
    accepted("steps:\n  - run: printf '%s\\n' 'corepack prepare pnpm@11.2.2 --activate'\n");
    accepted("steps:\n  - run: echo '$(yarn global add pnpm@11.2.2)'\n");
    accepted("steps:\n  - run: echo '`yarn global add pnpm@11.2.2`'\n");
    accepted("steps:\n  - run: echo \\$(yarn global add pnpm@11.2.2)\n");
  });

  it("fails closed for unsupported wrapper options around pnpm setup", () => {
    for (const command of [
      "sudo --preserve-env=CI yarn global add pnpm@11.8.0",
      "sh -c 'yarn global add pnpm@11.8.0'",
      "eval 'corepack prepare pnpm@11.8.0 --activate'",
      "alias install-pnpm='yarn global add pnpm@11.8.0'"
    ]) {
      const findings = analyzePnpmVersionParity(`steps:\n  - run: ${command}\n`, expected);
      expect(findings.map(finding => finding.rule)).toContain("ambiguous_or_unsupported_pnpm_setup_form");
    }
  });

  it("extracts pnpm setup from supported flow-style YAML", () => {
    denied("steps:\n  - { run: yarn global add pnpm@11.2.2 }\n");
    denied("steps:\n  - { run: yarn global add pnpm@11.8.0 }\n");
    denied('steps: [{run: "corepack prepare pnpm@11.2.2 --activate"}]\n');
    denied('steps: [{ "run": "corepack prepare pnpm@11.8.0 --activate" }]\n');
  });

  it.each([
    "x-step: &p\n  run: yarn global add pnpm@11.2.2\njobs:\n  test:\n    steps:\n      - *p\n",
    "x-step: &p\n  run: corepack use pnpm@11.2.2\njobs:\n  test:\n    steps:\n      - <<: *p\n",
    "x-step: &p { run: npm i -g pnpm@11.2.2 }\nsteps: [*p]\n",
    "x-steps: &1\n  - run: yarn global add pnpm@11.2.2\nsteps: *1\n",
    "x-step: &p\n  run: pnpm add -g pnpm@11.2.2\nsteps:\n  - name: safe\n    run: corepack use pnpm@11.8.0\n  - *p\n",
    "x-step: &p\n  run: yarn global add pnpm@11.2.2\njobs:\n  safe:\n    steps:\n      - run: corepack use pnpm@11.8.0\n  unsafe:\n    steps:\n      - *p\n"
  ])("denies anchors, aliases and merge keys affecting executable steps", workflow => denied(workflow));

  it.each([
    "steps: [{ run: yarn global add pnpm@11.2.2 }]",
    `steps: [{ uses: pnpm/action-setup@${"a".repeat(40)} }]`,
    `steps: [{ uses: pnpm/action-setup@${"a".repeat(40)}, with: { version: 11.2.2 } }]`,
    `steps: [{ uses: pnpm/action-setup@${"a".repeat(40)}, with: { version: 11.8.0 } }]`,
    "steps: [ { name: x, run: corepack use pnpm@11.8.0 } ]",
    "steps:\n  - { name: x, run: npm i -g pnpm@11.8.0 }",
    "steps: [\n  { name: x, run: yarn global add pnpm@11.8.0 }\n]"
  ])("denies unsupported flow-style executable structures", workflow => denied(`${workflow}\n`));

  it("denies mixed supported and unsupported executable representations", () => {
    denied(`steps:\n  - run: corepack use pnpm@11.8.0\n  - { run: yarn global add pnpm@11.2.2 }\n`);
    denied(`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.8.0\n  - { uses: pnpm/action-setup@${"b".repeat(40)}, with: { version: 11.2.2 } }\n`);
  });

  it("ignores anchor-like text outside executable YAML structure", () => {
    accepted("# steps: [*pnpm]\nmetadata: '&anchor *alias <<: run: uses:'\nsteps:\n  - run: echo ok\n");
    accepted("x-doc: &documentation\n  text: harmless\nsteps:\n  - run: echo ok\n");
    accepted("steps:\n  - name: '*alias &anchor'\n    run: echo '&anchor *alias <<:'\n");
    accepted("steps:\n  - run: |\n      cat <<'EOF'\n      steps: [{ run: yarn global add pnpm@11.2.2 }]\n      &anchor *alias <<:\n      EOF\n");
  });

  it("applies structural policy when the steps key is quoted", () => {
    denied("\"steps\": [{ run: yarn global add pnpm@11.2.2 }]\n");
    denied("'steps':\n  - *pnpm-step\n");
  });

  it("does not treat run-named action inputs as executable step commands", () => {
    accepted(`steps:\n  - uses: owner/action@${"a".repeat(40)}\n    with:\n      run: yarn global add pnpm@11.2.2\n`);
    accepted(`steps:\n  - uses: owner/action@${"a".repeat(40)}\n    with: { run: "yarn global add pnpm@11.2.2" }\n`);
  });

  it("fails closed for shell functions containing pnpm setup", () => {
    for (const command of [
      "f() { yarn global add pnpm@11.2.2; }; f",
      "f() { yarn global add pnpm@11.8.0; }; f",
      "function f() { corepack prepare pnpm@11.2.2 --activate; }; f",
      "f() { env CI=1 yarn global add pnpm@11.2.2; }; f"
    ]) denied(`steps:\n  - run: ${command}\n`);
  });

  it("fails closed for variable executables used for pnpm setup", () => {
    for (const command of [
      "YARN=yarn; $YARN global add pnpm@11.2.2",
      "YARN=yarn; \"$YARN\" global add pnpm@11.2.2",
      "CMD=corepack; $CMD prepare pnpm@11.2.2 --activate",
      "CMD=yarn; ${CMD} global add pnpm@11.2.2",
      "env YARN=yarn $YARN global add pnpm@11.2.2"
    ]) denied(`steps:\n  - run: ${command}\n`);
    accepted("steps:\n  - run: echo '$YARN global add pnpm@11.2.2'\n");
  });

  it("fails closed when inline pnpm setup payload is piped to an interpreter", () => {
    for (const command of [
      "printf 'yarn global add pnpm@11.2.2' | sh",
      "printf 'corepack prepare pnpm@11.2.2 --activate' | bash",
      "echo 'yarn global add pnpm@11.2.2' | zsh",
      "echo 'yarn global add pnpm@11.8.0' | dash"
    ]) denied(`steps:\n  - run: ${command}\n`);
    accepted("steps:\n  - run: cat script.sh | sh\n");
  });

  it("fails closed for pnpm setup combined with shell control flow", () => {
    for (const command of [
      "if true; then yarn global add pnpm@11.2.2; fi",
      "if false; then echo no; else yarn global add pnpm@11.2.2; fi",
      "for x in 1; do yarn global add pnpm@11.2.2; done",
      "while true; do corepack prepare pnpm@11.2.2 --activate; break; done",
      "until false; do npm i -g pnpm@11.2.2; break; done",
      "case x in x) yarn global add pnpm@11.2.2 ;; esac",
      "false || if true; then yarn global add pnpm@11.2.2; fi"
    ]) denied(`steps:\n  - run: ${command}\n`);
  });

  it("fails closed for cross-command dynamic execution of pnpm setup", () => {
    for (const command of [
      "CMD='yarn global add pnpm@11.2.2'; eval \"$CMD\"",
      "CMD='yarn global add pnpm@11.2.2'; ev\\al \"$CMD\"",
      "CMD='corepack prepare pnpm@11.2.2 --activate'; echo hello; eval \"$CMD\"",
      "PAYLOAD='yarn global add pnpm@11.2.2'; sh -c \"$PAYLOAD\"",
      "PAYLOAD='corepack prepare pnpm@11.2.2 --activate'; env bash -c \"$PAYLOAD\"",
      "source <(printf 'yarn global add pnpm@11.2.2')",
      ". <(echo 'pnpm add -g pnpm@11.2.2')",
      "CMD='yarn global add pnpm@11.2.2'; env X=1 eval \"$CMD\""
    ]) denied(`steps:\n  - run: ${command}\n`);
  });

  it("keeps control-flow and dynamic-execution examples literal without execution", () => {
    for (const command of [
      "echo 'if true; then yarn global add pnpm@11.2.2; fi'",
      "printf '%s' 'for x in 1; do yarn global add pnpm@11.2.2; done'",
      "NOTE='case x in x) yarn global add pnpm@11.2.2 ;; esac'; echo \"$NOTE\"",
      "echo \"CMD='yarn global add pnpm@11.2.2'; eval \\\"\\$CMD\\\"\"",
      "echo 'source <(printf yarn global add pnpm@11.2.2)'",
      "source ./known-static-script.sh"
    ]) accepted(`steps:\n  - run: ${command}\n`);
  });

  it.each([
    "/bin/sh -c 'yarn global add pnpm@11.2.2'",
    "\"/bin/sh\" -c 'yarn global add pnpm@11.2.2'",
    "/usr/bin/env sh -c 'yarn global add pnpm@11.2.2'",
    "builtin eval 'yarn global add pnpm@11.2.2'",
    "command builtin eval 'yarn global add pnpm@11.2.2'",
    "printf 'yarn global add pnpm@11.2.2' | xargs sh -c",
    "printf 'yarn global add pnpm@11.2.2' | xargs -I{} sh -c '{}'",
    "find . -exec sh -c 'yarn global add pnpm@11.2.2' \\;",
    "find . -execdir sh -c 'yarn global add pnpm@11.2.2' \\;",
    "timeout 5 sh -c 'yarn global add pnpm@11.2.2'",
    "nice sh -c 'yarn global add pnpm@11.2.2'",
    "nohup sh -c 'yarn global add pnpm@11.2.2'",
    "python -c 'import os; os.system(\"yarn global add pnpm@11.2.2\")'",
    "python3 -c 'import os; os.system(\"yarn global add pnpm@11.2.2\")'",
    "node -e 'require(\"child_process\").execSync(\"npm i -g pnpm@11.2.2\")'",
    "perl -e 'system(\"corepack prepare pnpm@11.2.2 --activate\")'",
    "awk 'BEGIN { system(\"yarn global add pnpm@11.2.2\") }'",
    "make -f - <<< 'all:; yarn global add pnpm@11.2.2'",
    "env builtin eval 'yarn global add pnpm@11.2.2'",
    "env -i /bin/sh -c 'yarn global add pnpm@11.2.2'",
    "sudo -n /bin/sh -c 'yarn global add pnpm@11.2.2'",
    "command -- /bin/sh -c 'yarn global add pnpm@11.2.2'",
    "s\\h -c 'yarn global add pnpm@11.2.2'",
    "\"/bin/\"sh -c 'yarn global add pnpm@11.2.2'",
    "SHELL=/bin/sh; \"$SHELL\" -c 'yarn global add pnpm@11.2.2'",
    "X=eval; builtin \"$X\" 'yarn global add pnpm@11.2.2'",
    "Y='yarn global add pnpm@11.2.2'; builtin eval \"$Y\""
  ])("denies setup outside the bounded direct subset: %s", command => {
    denied(`steps:\n  - run: ${command}\n`);
  });

  it.each([
    "function f { npm i -g pnpm@11.2.2; }; f",
    "function f() { npm i -g pnpm@11.2.2; }; f",
    "f() { npm i -g pnpm@11.2.2; }; f",
    "function f\n{\n  npm i -g pnpm@11.2.2\n}\nf",
    "function f { if true; then yarn global add pnpm@11.2.2; fi; }; f"
  ])("denies every supported function declaration form: %s", command => {
    denied(`steps:\n  - run: |\n${command.split("\n").map(line => `      ${line}`).join("\n")}\n`);
  });

  it("distinguishes literal heredoc data from executable heredoc content", () => {
    for (const command of [
      "cat <<'EOF'\nyarn global add pnpm@11.2.2\nEOF",
      "cat <<\"EOF\"\ncorepack prepare pnpm@11.2.2 --activate\nEOF",
      "cat <<EOF\nnpm i -g pnpm@11.2.2\nEOF",
      "cat <<-EOF\n\tyarn global add pnpm@11.2.2\nEOF"
    ]) accepted(`steps:\n  - run: |\n${command.split("\n").map(line => `      ${line}`).join("\n")}\n`);

    for (const command of [
      "sh <<'EOF'\nyarn global add pnpm@11.2.2\nEOF",
      "bash <<EOF\ncorepack prepare pnpm@11.2.2 --activate\nEOF",
      "env sh <<'EOF'\nnpm i -g pnpm@11.2.2\nEOF",
      "cat <<'EOF' | sh\nyarn global add pnpm@11.2.2\nEOF",
      "PAYLOAD=$(cat <<'EOF'\nyarn global add pnpm@11.2.2\nEOF\n)\neval \"$PAYLOAD\"",
      "cat <<'EOF' > payload.sh\nyarn global add pnpm@11.2.2\nEOF\nsh payload.sh",
      "cat <<'EOF' > payload.sh\nyarn global add pnpm@11.2.2\nEOF\nchmod +x payload.sh\n./payload.sh"
    ]) denied(`steps:\n  - run: |\n${command.split("\n").map(line => `      ${line}`).join("\n")}\n`);
  });

  it("validates every pnpm pin present in a direct setup command", () => {
    denied("steps:\n  - run: npm i -g pnpm@11.8.0 pnpm@11.2.2\n");
    denied("steps:\n  - run: corepack prepare pnpm@11.8.0 pnpm@11.2.2 --activate\n");
  });

  it("preserves execution-safe setup text controls", () => {
    for (const command of [
      "echo \"/bin/sh -c 'yarn global add pnpm@11.2.2'\"",
      "printf '%s' 'builtin eval yarn global add pnpm@11.2.2'",
      "NOTE='xargs sh -c yarn global add pnpm@11.2.2'; echo \"$NOTE\"",
      "python -c 'print(\"hello\")'",
      "pnpm install --frozen-lockfile"
    ]) accepted(`steps:\n  - run: ${command}\n`);
    accepted("steps:\n  - run: echo 'function f { npm i -g pnpm@11.2.2; }'\n");
    accepted("steps:\n  - uses: owner/action@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    with:\n      run: xargs sh -c yarn global add pnpm@11.2.2\n");
  });

  it("keeps current workflow job and required check names unchanged while all repository workflows pass", () => {
    const workflowDirectory = path.join(process.cwd(), ".github/workflows");
    const workflows = fs.readdirSync(workflowDirectory).filter(file => /\.ya?ml$/.test(file));
    const findings = workflows.flatMap(file => analyzePnpmVersionParity(
      fs.readFileSync(path.join(workflowDirectory, file), "utf8"), expected
    ));
    expect(findings).toEqual([]);

    const requiredNames = [
      ["ci.yml", "name: Validate TypeScript project"],
      ["quality-check.yml", "  quality-check:"],
      ["evidence-refresh.yml", "  evidence-refresh:"],
      ["validate-reports.yml", "  validate-reports:"],
      ["release-check.yml", "  release-check:"],
      ["codeql.yml", "name: CodeQL eligibility gate"],
      ["codeql.yml", "name: Analyze TypeScript (javascript-typescript)"]
    ];
    for (const [file, name] of requiredNames) {
      expect(fs.readFileSync(path.join(workflowDirectory, file), "utf8")).toContain(name);
    }
  });

  const requiredWorkflow = (jobBody: string, checkName = REQUIRED_CI_CHECK_NAME) => `name: CI
on:
  pull_request:
    branches: [main]
jobs:
  validate:
    name: ${checkName}
${jobBody}
`;

  it("structurally enforces the production security policy gate in the real required pull-request job", () => {
    const requiredWorkflowFiles = [
      "ci.yml", "quality-check.yml", "evidence-refresh.yml",
      "validate-reports.yml", "release-check.yml", "codeql.yml"
    ];
    const requiredWorkflowText = requiredWorkflowFiles.map(file =>
      fs.readFileSync(path.join(process.cwd(), ".github/workflows", file), "utf8")
    );
    expect(requiredPolicyIsStructurallyEnforced(requiredWorkflowText)).toBe(true);
  });

  it.each([
    ["missing policy", `    steps:\n      - run: pnpm test`],
    ["renamed policy", `    steps:\n      - run: pnpm security:polic`],
    ["continue-on-error after run", `    steps:\n      - run: pnpm security:policy\n        continue-on-error: true`],
    ["continue-on-error before run", `    steps:\n      - continue-on-error: true\n        run: pnpm security:policy`],
    ["named continue-on-error before run", `    steps:\n      - name: policy\n        continue-on-error: true\n        run: pnpm security:policy`],
    ["continue-on-error before name and run", `    steps:\n      - continue-on-error: true\n        name: policy\n        run: pnpm security:policy`],
    ["job condition", `    if: github.event_name != 'pull_request'\n    steps:\n      - run: pnpm security:policy`],
    ["step condition after run", `    steps:\n      - run: pnpm security:policy\n        if: false`],
    ["step condition before run", `    steps:\n      - if: false\n        run: pnpm security:policy`],
    ["named step condition before run", `    steps:\n      - name: policy\n        if: false\n        run: pnpm security:policy`],
    ["step condition before name and run", `    steps:\n      - if: false\n        name: policy\n        run: pnpm security:policy`],
    ["dead shell branch", `    steps:\n      - run: false && pnpm security:policy`],
    ["ignored shell failure", `    steps:\n      - run: pnpm security:policy || true`],
    ["weakened then valid policy step", `    steps:\n      - continue-on-error: true\n        run: pnpm security:policy\n      - run: pnpm security:policy`],
    ["valid then weakened policy step", `    steps:\n      - run: pnpm security:policy\n      - if: false\n        run: pnpm security:policy`]
  ])("rejects non-enforcing required CI variant: %s", (_label, jobBody) => {
    expect(requiredPolicyIsStructurallyEnforced([requiredWorkflow(jobBody)])).toBe(false);
  });

  it("rejects policy execution in another job or another workflow", () => {
    const requiredWithoutPolicy = requiredWorkflow(`    steps:\n      - run: pnpm test`);
    const otherJob = `name: CI\non:\n  pull_request:\n    branches: [main]\njobs:\n  optional:\n    name: Optional\n    steps:\n      - run: pnpm security:policy\n`;
    const otherWorkflow = requiredWorkflow(`    steps:\n      - run: pnpm security:policy`, "Optional policy check");
    expect(requiredPolicyIsStructurallyEnforced([requiredWithoutPolicy, otherJob])).toBe(false);
    expect(requiredPolicyIsStructurallyEnforced([requiredWithoutPolicy, otherWorkflow])).toBe(false);
  });

  it.each([
    ["direct", `    steps:\n      - run: pnpm security:policy`],
    ["name before run", `    steps:\n      - name: policy\n        run: pnpm security:policy`],
    ["name after run", `    steps:\n      - run: pnpm security:policy\n        name: policy`],
    ["shell before run", `    steps:\n      - shell: bash\n        run: pnpm security:policy`],
    ["shell after run", `    steps:\n      - run: pnpm security:policy\n        shell: bash`],
    ["env and comments around run", `    steps:\n      - env:\n          CI: true\n\n        # policy remains direct\n        run: pnpm security:policy`],
    ["policy after another step", `    steps:\n      - run: pnpm test\n      - run: pnpm security:policy`],
    ["policy before another step", `    steps:\n      - run: pnpm security:policy\n      - run: pnpm test`]
  ])("accepts fail-closed policy ordering: %s", (_label, jobBody) => {
    expect(requiredPolicyIsStructurallyEnforced([requiredWorkflow(jobBody)])).toBe(true);
  });

  it("fails closed for escaped executable YAML keys without flagging escaped metadata values", () => {
    const cases = [
      ["steps:\n  - \"r\\u0075n\": yarn global add pnpm@11.2.2\n", "unsupported_escaped_executable_yaml_key"],
      ["\"st\\u0065ps\":\n  - run: yarn global add pnpm@11.2.2\n", "unsupported_escaped_executable_yaml_key"],
      ["\"st\\u0065ps\":\n  - \"r\\u0075n\": yarn global add pnpm@11.2.2\n", "unsupported_escaped_executable_yaml_key"],
      [`steps:\n  - \"u\\u0073es\": pnpm/action-setup@${"a".repeat(40)}\n    with:\n      version: 11.8.0\n`, "unsupported_escaped_executable_yaml_key"],
      [`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    \"w\\u0069th\":\n      version: 11.8.0\n`, "unsupported_escaped_executable_yaml_key"],
      [`steps:\n  - uses: pnpm/action-setup@${"a".repeat(40)}\n    with:\n      \"vers\\u0069on\": 11.8.0\n`, "unsupported_escaped_executable_yaml_key"],
      ["steps:\n  - \"\\u0072\\u0075\\u006e\": yarn global add pnpm@11.2.2\n", "unsupported_escaped_executable_yaml_key"],
      ["steps:\n  - \"r\\x75n\": yarn global add pnpm@11.2.2\n", "unsupported_escaped_executable_yaml_key"],
      ["steps:\n  - \"r\\uZZZZn\": yarn global add pnpm@11.2.2\n", "malformed_executable_yaml_key"]
    ];
    for (const [workflow, rule] of cases) {
      expect(analyzePnpmVersionParity(workflow, expected).map(finding => finding.rule)).toContain(rule);
    }
    accepted("metadata:\n  \"cust\\u006fm\": value\nsteps:\n  - run: echo ok\n");
    accepted("name: \"literal r\\u0075n steps: value\"\nsteps:\n  - run: echo ok\n");
    accepted("steps:\n  - 'run': corepack prepare pnpm@11.8.0 --activate\n");
  });

  it("ignores flow-like YAML comments while preserving real block run commands", () => {
    accepted("# steps: [{ run: yarn global add pnpm@11.2.0 }]\nsteps:\n  - run: echo 'yarn global add pnpm@11.2.0'\n");
    accepted("# steps: [{ uses: pnpm/action-setup@deadbeef }]\n# { run: corepack prepare pnpm@11.2.2 --activate }\n# arbitrary prefix steps: [{ run: yarn global add pnpm@11.2.2 }]\nname: safe # steps: [{ run: yarn global add pnpm@11.2.2 }]\nsteps:\n  - run: echo safe # YAML trailing comment\n");
    accepted("name: \"# steps: [{ run: bad }]\"\nurl: \"https://example.invalid/#fragment\"\ndescription: 'literal # text'\nsteps:\n  - run: echo ok\n");
    expect(analyzePnpmVersionParity("steps:\n  - run: |\n      echo \"# not a YAML comment here\"\n      yarn global add pnpm@11.2.2\n", expected).map(finding => finding.rule)).toContain("pnpm_version_drift");
  });

  it("keeps quoted immutable action references equivalent in the integrated gate", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-policy-integrated-"));
    fs.mkdirSync(path.join(temporaryRoot, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(temporaryRoot, "package.json"), JSON.stringify({ packageManager: expected }));
    fs.writeFileSync(path.join(temporaryRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    fs.writeFileSync(path.join(temporaryRoot, ".github/workflows/test.yml"), `name: test\non: workflow_dispatch\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: \"owner/action@${"a".repeat(40)}\"\n      - uses: 'owner/action@${"b".repeat(40)}'\n      - uses: owner/action@${"c".repeat(40)}\n`);
    const result = spawnSync(path.join(process.cwd(), "node_modules/.bin/tsx"), [path.join(process.cwd(), "scripts/security-policy-check.ts")], { cwd: temporaryRoot, encoding: "utf8" });
    expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toMatchObject({ status: 0 });
  });

  it("denies escaped executable keys in the integrated gate", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-policy-escaped-"));
    fs.mkdirSync(path.join(temporaryRoot, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(temporaryRoot, "package.json"), JSON.stringify({ packageManager: expected }));
    fs.writeFileSync(path.join(temporaryRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    fs.writeFileSync(path.join(temporaryRoot, ".github/workflows/test.yml"), "name: test\non: workflow_dispatch\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - \"r\\u0075n\": yarn global add pnpm@11.2.2\n");
    const result = spawnSync(path.join(process.cwd(), "node_modules/.bin/tsx"), [path.join(process.cwd(), "scripts/security-policy-check.ts")], { cwd: temporaryRoot, encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain("unsupported_escaped_executable_yaml_key");
  });
});
