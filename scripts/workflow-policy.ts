export type WorkflowPolicyFinding = { rule: string; detail: string };

export const WORKFLOW_POLICY_PARSER_SCOPE = "LIMITED" as const;

const untrustedEventExpression = /\$\{\{\s*github\.event\.(?:issue|pull_request|comment|review|head_commit)/;

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].replace(/\t/g, "  ").length ?? 0;
}

function keyValue(line: string, key: string, preserveHash = false): string | null {
  const match = line.match(new RegExp(`^\\s*(?:${key}|["']${key}["'])\\s*:\\s*(.*)$`, "i"));
  if (!match) return null;
  return (preserveHash ? match[1] : match[1].replace(/\s+#.*$/, "")).trim();
}

function checkoutStep(lines: string[], usesIndex: number): string[] {
  const usesIndent = indentation(lines[usesIndex]);
  let start = usesIndex;
  if (!/^\s*-\s+/.test(lines[start])) {
    while (start > 0) {
      start--;
      if (/^\s*-\s+/.test(lines[start]) && indentation(lines[start]) < usesIndent) break;
    }
  }
  const stepIndent = indentation(lines[start]);
  let end = usesIndex + 1;
  while (end < lines.length && !(/^\s*-\s+/.test(lines[end]) && indentation(lines[end]) === stepIndent)) end++;
  return lines.slice(start, end);
}

export function analyzeWorkflowText(content: string): WorkflowPolicyFinding[] {
  const findings: WorkflowPolicyFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const structuralLine = line.replace(/^(\s*)-\s*/, "$1");
    if (keyValue(structuralLine, "permissions")?.replace(/["']/g, "").toLowerCase() === "write-all") {
      findings.push({ rule: "write_all_permissions", detail: "permissions: write-all" });
    }

    const runValue = keyValue(structuralLine, "run", true);
    if (runValue !== null) {
      let command = runValue;
      if (/^[|>][+-]?\s*$/.test(runValue)) {
        const baseIndent = indentation(line);
        let cursor = index + 1;
        const block: string[] = [];
        while (cursor < lines.length && (lines[cursor].trim() === "" || indentation(lines[cursor]) > baseIndent)) {
          block.push(lines[cursor]);
          cursor++;
        }
        command = block.join("\n");
      }
      if (untrustedEventExpression.test(command)) {
        findings.push({ rule: "untrusted_expression_in_run", detail: "github.event data interpolated directly into run" });
      }
    }

    const uses = keyValue(structuralLine, "uses");
    if (uses && !uses.startsWith("./") && !/^[^@]+@[a-f0-9]{40}$/i.test(uses)) {
      findings.push({ rule: "mutable_action_reference", detail: uses });
    }
    if (uses?.startsWith("actions/checkout@")) {
      const step = checkoutStep(lines, index);
      const safe = step.some(stepLine => keyValue(stepLine, "persist-credentials")?.toLowerCase() === "false");
      if (!safe) findings.push({ rule: "checkout_credentials_persisted", detail: "actions/checkout lacks persist-credentials: false in the same step" });
    }
    if (uses?.startsWith("actions/download-artifact@")) {
      findings.push({ rule: "artifact_download_requires_review", detail: "Downloaded artifacts require producer and integrity review" });
    }
  }

  for (const trigger of ["pull_request_target", "issue_comment", "workflow_run"]) {
    if (new RegExp(`^\\s*(?:${trigger}|["']${trigger}["'])\\s*:`, "m").test(content)) {
      findings.push({ rule: "dangerous_trigger", detail: trigger });
    }
  }
  return findings;
}
