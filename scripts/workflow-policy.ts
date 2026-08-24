export type WorkflowPolicyFinding = { rule: string; detail: string };

export const WORKFLOW_POLICY_PARSER_SCOPE = "LIMITED" as const;
export const WORKFLOW_YAML_POLICY_SCOPE = "BLOCK_STYLE_EXECUTABLE_STEPS_PLUS_EXPLICIT_FAIL_CLOSED_FOR_UNSUPPORTED_EXECUTABLE_YAML_STRUCTURES" as const;
export const PNPM_SETUP_PARSER_SCOPE = "BOUNDED_DIRECT_SETUP_SUBSET_WITH_FAIL_CLOSED_AMBIGUITY_POLICY" as const;

const untrustedEventExpression = /\$\{\{\s*github\.event\.(?:issue|pull_request|comment|review|head_commit)/;

type RunExtraction = { commands: string[]; findings: WorkflowPolicyFinding[] };
type YamlMappingKey = { key: string | null; value: string; escaped: boolean; malformed: boolean };

function decodeYamlDoubleQuotedScalar(value: string): string | null {
  let decoded = "";
  const escapes: Record<string, string> = {
    "0": "\0", a: "\x07", b: "\b", t: "\t", n: "\n", v: "\v", f: "\f", r: "\r", e: "\x1b",
    " ": " ", '"': '"', "/": "/", "\\": "\\", N: "\u0085", _: "\u00a0", L: "\u2028", P: "\u2029"
  };
  for (let index = 0; index < value.length; index++) {
    if (value[index] !== "\\") { decoded += value[index]; continue; }
    const escape = value[++index];
    if (escape === undefined) return null;
    if (escape in escapes) { decoded += escapes[escape]; continue; }
    const widths: Record<string, number> = { x: 2, u: 4, U: 8 };
    const width = widths[escape];
    if (!width) return null;
    const hexadecimal = value.slice(index + 1, index + 1 + width);
    if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hexadecimal)) return null;
    const codePoint = Number.parseInt(hexadecimal, 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return null;
    decoded += String.fromCodePoint(codePoint);
    index += width;
  }
  return decoded;
}

function parseYamlMappingKey(line: string): YamlMappingKey | null {
  const match = line.match(/^\s*("(?:\\.|[^"\\])*"|'(?:''|[^'])*'|[^\s:#][^:]*?)\s*:\s*(.*)$/);
  if (!match) return null;
  const rawKey = match[1];
  if (rawKey.startsWith('"')) {
    const key = decodeYamlDoubleQuotedScalar(rawKey.slice(1, -1));
    return { key, value: match[2], escaped: rawKey.includes("\\"), malformed: key === null };
  }
  if (rawKey.startsWith("'")) return { key: rawKey.slice(1, -1).replace(/''/g, "'"), value: match[2], escaped: false, malformed: false };
  return { key: rawKey.trim(), value: match[2], escaped: false, malformed: false };
}

function yamlStructuralSyntax(line: string): string {
  let syntax = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (escaped) { syntax += " "; escaped = false; continue; }
    if (character === "\\" && doubleQuoted) { syntax += " "; escaped = true; continue; }
    if (character === "'" && !doubleQuoted) {
      if (singleQuoted && line[index + 1] === "'") { syntax += "  "; index++; continue; }
      singleQuoted = !singleQuoted;
      syntax += " ";
      continue;
    }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; syntax += " "; continue; }
    if (!singleQuoted && !doubleQuoted && character === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      return syntax;
    }
    syntax += singleQuoted || doubleQuoted ? " " : character;
  }
  return syntax;
}

function analyzeExecutableYamlStructure(content: string): WorkflowPolicyFinding[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const findings: WorkflowPolicyFinding[] = [];
  let stepsIndent: number | null = null;
  let scalarIndent: number | null = null;
  let anchorFindingRecorded = false;
  let flowFindingRecorded = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indent = indentation(line);
    if (scalarIndent !== null) {
      if (indent > scalarIndent) continue;
      scalarIndent = null;
    }

    const syntax = yamlStructuralSyntax(line);
    if (!syntax.trim()) continue;
    if (/:\s*[|>](?:[+-]?[1-9]?|[1-9]?[+-]?)?\s*$/.test(syntax)) scalarIndent = indent;
    const structuralLine = syntax.replace(/^(\s*)-\s*/, "$1");
    const originalStructuralLine = line.replace(/^(\s*)-\s*/, "$1");
    const parsedKey = parseYamlMappingKey(originalStructuralLine);
    const normalizedKey = parsedKey?.key?.toLowerCase() ?? null;
    const structurallyRelevant = normalizedKey !== null && ["steps", "run", "uses", "with", "version"].includes(normalizedKey);
    const executablePosition = normalizedKey === "steps" || (stepsIndent !== null && indent > stepsIndent);
    if (parsedKey?.escaped && structurallyRelevant && executablePosition) {
      findings.push({ rule: "unsupported_escaped_executable_yaml_key", detail: `Limited workflow YAML policy does not accept escaped executable key: ${normalizedKey}` });
    } else if (parsedKey?.malformed && parsedKey.escaped && stepsIndent !== null && indent > stepsIndent) {
      findings.push({ rule: "malformed_executable_yaml_key", detail: "Limited workflow YAML policy cannot classify a malformed escaped key inside executable steps" });
    }
    const stepsValue = keyValue(originalStructuralLine, "steps", true);
    if (stepsValue !== null) {
      stepsIndent = indent;
      const stepsValueSyntax = yamlStructuralSyntax(stepsValue);
      if (/(?:^|[\s[{,])(?:[&*][A-Za-z0-9_][A-Za-z0-9_.-]*|<<\s*:)/.test(stepsValueSyntax) && !anchorFindingRecorded) {
        findings.push({ rule: "unsupported_yaml_anchor_alias_in_executable_workflow_structure", detail: "Limited workflow YAML policy does not expand anchors, aliases or merge keys that can affect executable steps" });
        anchorFindingRecorded = true;
      }
      if (stepsValueSyntax.trim() && !flowFindingRecorded) {
        findings.push({ rule: "unsupported_flow_style_executable_step", detail: "Limited workflow YAML policy does not validate flow-style steps sequences" });
        flowFindingRecorded = true;
      }
      continue;
    }

    if (stepsIndent === null) continue;
    if (indent <= stepsIndent) { stepsIndent = null; continue; }

    if (/^\s*-\s*\{/.test(syntax) && !flowFindingRecorded) {
      findings.push({ rule: "unsupported_flow_style_executable_step", detail: "Limited workflow YAML policy does not validate flow-style executable step mappings" });
      flowFindingRecorded = true;
    }
    if (/(?:^|[\s[{,])(?:[&*][A-Za-z0-9_][A-Za-z0-9_.-]*|<<\s*:)/.test(syntax) && !anchorFindingRecorded) {
      findings.push({ rule: "unsupported_yaml_anchor_alias_in_executable_workflow_structure", detail: "Limited workflow YAML policy does not expand anchors, aliases or merge keys that can affect executable steps" });
      anchorFindingRecorded = true;
    }
  }
  return findings;
}

function extractFlowRunCommands(content: string): RunExtraction {
  const commands: string[] = [];
  const findings: WorkflowPolicyFinding[] = [];
  const mappingEligibility: boolean[] = [];
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && doubleQuoted) { escaped = true; continue; }
    if (character === "'" && !doubleQuoted) { singleQuoted = !singleQuoted; continue; }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; continue; }
    if (singleQuoted || doubleQuoted) continue;
    if (character === "{") {
      const prefix = content.slice(0, index);
      const directSequenceItem = /-\s*$/.test(prefix);
      const stepsFlowStart = [...prefix.matchAll(/\bsteps\s*:\s*\[/g)].at(-1)?.index ?? -1;
      const directFlowStep = mappingEligibility.length === 0 && stepsFlowStart >= 0 && prefix.lastIndexOf("]") < stepsFlowStart;
      mappingEligibility.push(directSequenceItem || directFlowStep);
      continue;
    }
    if (character === "}") { mappingEligibility.pop(); continue; }
    if (!mappingEligibility.at(-1)) continue;

    const key = content.slice(index).match(/^(?:run|"run"|'run')\s*:\s*/);
    if (!key) continue;
    const previous = content.slice(0, index).match(/\S\s*$/)?.[0].trim();
    if (previous !== "{" && previous !== ",") continue;
    let valueStart = index + key[0].length;
    if (["'", '"'].includes(content[valueStart])) {
      const quote = content[valueStart];
      let cursor = valueStart + 1;
      let escapedValue = false;
      for (; cursor < content.length; cursor++) {
        if (escapedValue) { escapedValue = false; continue; }
        if (quote === '"' && content[cursor] === "\\") { escapedValue = true; continue; }
        if (content[cursor] !== quote) continue;
        if (quote === "'" && content[cursor + 1] === "'") { cursor++; continue; }
        break;
      }
      if (cursor >= content.length) {
        if (pnpmSetupIndicator(content.slice(valueStart))) findings.push({ rule: "ambiguous_or_unsupported_workflow_run_structure", detail: "Limited workflow parser could not validate a quoted flow-style run value" });
        continue;
      }
      commands.push(normalizeInlineYamlScalar(content.slice(valueStart, cursor + 1)));
      index = cursor;
      continue;
    }

    let cursor = valueStart;
    while (cursor < content.length && content[cursor] !== "," && content[cursor] !== "}") cursor++;
    const value = content.slice(valueStart, cursor).trim();
    if (value) commands.push(value);
    else if (pnpmSetupIndicator(content.slice(valueStart, cursor + 1))) findings.push({ rule: "ambiguous_or_unsupported_workflow_run_structure", detail: "Limited workflow parser could not validate a flow-style run value" });
    index = cursor - 1;
  }
  if (/(?:\{|,)\s*(?:run|"run"|'run')\s+(?!:)/.test(content) && pnpmSetupIndicator(content)) {
    findings.push({ rule: "ambiguous_or_unsupported_workflow_run_structure", detail: "Limited workflow parser found a pnpm-related flow mapping with an unrecognized run key structure" });
  }
  return { commands, findings };
}

function isDirectStepRunLine(lines: string[], index: number): boolean {
  if (/^\s*-\s*(?:run|"run"|'run')\s*:/.test(lines[index])) return true;
  const runIndent = indentation(lines[index]);
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    if (!lines[cursor].trim() || /^\s*#/.test(lines[cursor])) continue;
    const candidateIndent = indentation(lines[cursor]);
    if (/^\s*-\s+/.test(lines[cursor]) && candidateIndent < runIndent) return runIndent === candidateIndent + 2;
    if (candidateIndent < runIndent - 2) return false;
  }
  return false;
}

export function normalizeInlineYamlScalar(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === "string") return parsed;
    } catch {
      return value;
    }
  }
  return value;
}

function foldYamlRunLines(lines: string[]): string {
  let folded = "";
  for (const line of lines) {
    if (!line) {
      folded += "\n";
    } else {
      if (folded && !folded.endsWith("\n")) folded += " ";
      folded += line;
    }
  }
  return folded;
}

function maskYamlBlockScalarBodies(content: string): string {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let scalarIndent: number | null = null;
  return lines.map(line => {
    if (scalarIndent !== null) {
      if (!line.trim() || indentation(line) > scalarIndent) return "";
      scalarIndent = null;
    }
    const syntax = yamlStructuralSyntax(line);
    if (/:\s*[|>](?:[+-]?[1-9]?|[1-9]?[+-]?)?\s*$/.test(syntax)) scalarIndent = indentation(line);
    return line;
  }).join("\n");
}

function maskYamlComments(content: string): string {
  return content.split("\n").map(line => {
    let singleQuoted = false;
    let doubleQuoted = false;
    let escaped = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index];
      if (escaped) { escaped = false; continue; }
      if (character === "\\" && doubleQuoted) { escaped = true; continue; }
      if (character === "'" && !doubleQuoted) {
        if (singleQuoted && line[index + 1] === "'") { index++; continue; }
        singleQuoted = !singleQuoted;
        continue;
      }
      if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; continue; }
      if (character === "#" && !singleQuoted && !doubleQuoted && (index === 0 || /\s/.test(line[index - 1]))) return line.slice(0, index);
    }
    return line;
  }).join("\n");
}

export function extractWorkflowRunCommands(content: string): RunExtraction {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const commands: string[] = [];
  const findings: WorkflowPolicyFinding[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (/^\s*#/.test(lines[index])) continue;
    const structuralLine = lines[index].replace(/^(\s*)-\s*/, "$1");
    const runValue = keyValue(structuralLine, "run", true);
    if (runValue === null) continue;
    if (!isDirectStepRunLine(lines, index)) continue;
    const block = runValue.match(/^([|>])(?:[+-]?[1-9]?|[1-9]?[+-]?)?\s*(?:#.*)?$/);
    if (!block) {
      commands.push(normalizeInlineYamlScalar(runValue));
      continue;
    }

    const baseIndent = indentation(lines[index]);
    const rawBlock: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && (lines[cursor].trim() === "" || indentation(lines[cursor]) > baseIndent)) {
      rawBlock.push(lines[cursor]);
      cursor++;
    }
    const contentIndents = rawBlock.filter(line => line.trim()).map(indentation);
    if (contentIndents.length > 0) {
      const blockIndent = Math.min(...contentIndents);
      const dedented = rawBlock.map(line => line.trim() ? line.slice(blockIndent) : "");
      commands.push(block[1] === ">" ? foldYamlRunLines(dedented) : dedented.join("\n"));
    }
    index = cursor - 1;
  }
  const flow = extractFlowRunCommands(maskYamlComments(maskYamlBlockScalarBodies(content)));
  return { commands: [...commands, ...flow.commands], findings: [...findings, ...flow.findings] };
}

function normalizeRunCommand(command: string): string {
  const continued = command.replace(/\\\r?\n[ \t]*/g, "");
  return continued.split(/\r?\n/).map(line => {
    let singleQuoted = false;
    let doubleQuoted = false;
    let escaped = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\" && !singleQuoted) {
        escaped = true;
        continue;
      }
      if (character === "'" && !doubleQuoted) singleQuoted = !singleQuoted;
      else if (character === '"' && !singleQuoted) doubleQuoted = !doubleQuoted;
      else if (character === "#" && !singleQuoted && !doubleQuoted && (index === 0 || /\s/.test(line[index - 1]))) {
        return line.slice(0, index).trim();
      }
    }
    return line.trim();
  }).filter(Boolean).join("\n");
}

function tokenizeShellCommands(command: string): string[][] {
  const commands: string[][] = [];
  let tokens: string[] = [];
  let token = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  const flushToken = () => { if (token) tokens.push(token); token = ""; };
  const flushCommand = () => { flushToken(); if (tokens.length) commands.push(tokens); tokens = []; };

  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (escaped) { token += character; escaped = false; continue; }
    if (character === "\\" && !singleQuoted) { escaped = true; continue; }
    if (character === "'" && !doubleQuoted) { singleQuoted = !singleQuoted; continue; }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; continue; }
    if (!singleQuoted && !doubleQuoted && /\s/.test(character)) {
      if (character === "\n") flushCommand(); else flushToken();
      continue;
    }
    if (!singleQuoted && !doubleQuoted && (character === ";" || character === "|" || character === "&")) {
      flushCommand();
      while (command[index + 1] === character) index++;
      continue;
    }
    token += character;
  }
  flushCommand();
  return commands;
}

function configuredPnpmVersion(token: string | undefined): string | null | undefined {
  if (token === "pnpm") return null;
  if (token?.startsWith("pnpm@")) return token.slice("pnpm@".length) || null;
  return undefined;
}

type ExecutableResolution = { index: number; ambiguous: boolean };

function commandExecutableIndex(tokens: string[]): ExecutableResolution {
  let index = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) index++;
  while (["env", "exec", "command", "sudo"].includes(tokens[index] ?? "")) {
    const wrapper = tokens[index++];
    if (wrapper === "env") {
      while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) index++;
      while ((tokens[index] ?? "").startsWith("-")) {
        const option = tokens[index++];
        if (option === "--") break;
        if (["-i", "--ignore-environment"].includes(option)) continue;
        if (["-u", "--unset", "-C", "--chdir"].includes(option)) {
          if (!tokens[index]) return { index, ambiguous: true };
          index++;
          continue;
        }
        if (/^--(?:unset|chdir)=/.test(option)) continue;
        return { index, ambiguous: true };
      }
      while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) index++;
    } else if (wrapper === "sudo") {
      while ((tokens[index] ?? "").startsWith("-")) {
        const option = tokens[index++];
        if (option === "--") break;
        if (["-n", "--non-interactive", "-E", "--preserve-env"].includes(option)) continue;
        if (["-u", "--user"].includes(option)) {
          if (!tokens[index]) return { index, ambiguous: true };
          index++;
          continue;
        }
        if (/^(?:-u.+|--user=.+)$/.test(option)) continue;
        return { index, ambiguous: true };
      }
    } else {
      if (tokens[index] === "--") index++;
      else if (wrapper === "command" && tokens[index] === "-p") index++;
      else if ((tokens[index] ?? "").startsWith("-")) return { index, ambiguous: true };
    }
    while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) index++;
  }
  return { index, ambiguous: false };
}

function pnpmSetupIndicator(value: string): boolean {
  return /(?:\bcorepack\b[\s\S]*\bpnpm(?:@|\b)|\b(?:npm|yarn)\b[\s\S]*\bpnpm(?:@|\b)|\bpnpm\b[\s\S]*\badd\b[\s\S]*(?:-g|--global))/.test(value);
}

type HeredocAnalysis = {
  command: string;
  executableSetupSignal: boolean;
  textSetupSignal: boolean;
};

function analyzeHeredocs(command: string): HeredocAnalysis {
  const lines = command.split("\n");
  const retained: string[] = [];
  let executableSetupSignal = false;
  let textSetupSignal = false;

  for (let index = 0; index < lines.length; index++) {
    const opener = lines[index].match(/^(.*?)(<<-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\3(.*)$/);
    if (!opener) {
      retained.push(lines[index]);
      continue;
    }

    const stripTabs = opener[2] === "<<-";
    const delimiter = opener[4];
    const body: string[] = [];
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const candidate = stripTabs ? lines[cursor].replace(/^\t+/, "") : lines[cursor];
      if (candidate === delimiter) break;
      body.push(lines[cursor]);
    }

    if (cursor >= lines.length) {
      retained.push(lines[index]);
      if (pnpmSetupIndicator(body.join("\n"))) executableSetupSignal = true;
      continue;
    }

    const bodyHasSignal = pnpmSetupIndicator(body.join("\n"));
    const prefixTokens = tokenizeShellCommands(opener[1])[0] ?? [];
    const resolution = commandExecutableIndex(prefixTokens);
    const consumer = prefixTokens[resolution.index]?.split("/").at(-1);
    const suffixHasPipe = /^\s*\|/.test(opener[5]);
    const isPlainCat = !resolution.ambiguous && consumer === "cat" && !suffixHasPipe;
    if (bodyHasSignal) {
      if (isPlainCat) textSetupSignal = true;
      else executableSetupSignal = true;
    }

    retained.push(`${opener[1]}${opener[5]}`.trimEnd());
    index = cursor;
  }

  return { command: retained.join("\n"), executableSetupSignal, textSetupSignal };
}

function executableShellSyntax(command: string): string {
  let syntax = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  for (const character of command) {
    if (escaped) { syntax += " "; escaped = false; continue; }
    if (character === "\\" && !singleQuoted) { escaped = true; syntax += " "; continue; }
    if (character === "'" && !doubleQuoted) { singleQuoted = !singleQuoted; syntax += " "; continue; }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; syntax += " "; continue; }
    syntax += singleQuoted || doubleQuoted ? " " : character;
  }
  return syntax;
}

function containsUnsupportedControlFlow(command: string): boolean {
  return /\b(?:if|then|elif|else|fi|for|select|while|until|do|done|case|esac)\b/.test(executableShellSyntax(command));
}

function containsExecutablePipeline(command: string): boolean {
  return /(^|[^|])\|([^|]|$)/.test(executableShellSyntax(command));
}

function containsDynamicExecutionSink(command: string): boolean {
  const syntax = executableShellSyntax(command);
  if (/[<>]\s*\(/.test(syntax)) return true;
  for (const tokens of tokenizeShellCommands(command)) {
    const resolution = commandExecutableIndex(tokens);
    if (resolution.ambiguous) continue;
    const executable = tokens[resolution.index];
    const basename = executable?.split("/").at(-1);
    if (["eval", "source", ".", "builtin", "xargs", "find"].includes(basename ?? "")) return true;
    if (["sh", "bash", "zsh", "dash"].includes(basename ?? "") && (tokens.slice(resolution.index + 1).includes("-c") || /<<-?/.test(syntax))) return true;
  }
  return false;
}

function variableExecutablePnpmSetup(tokens: string[], start: number): boolean {
  if (!/^\$(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})$/.test(tokens[start] ?? "")) return false;
  const tail = tokens.slice(start + 1);
  return (tail[0] === "global" && tail[1] === "add" && tail.some(token => configuredPnpmVersion(token) !== undefined))
    || (["prepare", "install", "use"].includes(tail[0]) && tail.some(token => configuredPnpmVersion(token) !== undefined))
    || (["install", "i"].includes(tail[0]) && tail.some(token => token === "-g" || token === "--global") && tail.some(token => configuredPnpmVersion(token) !== undefined))
    || (tail[0] === "add" && tail.some(token => token === "-g" || token === "--global") && tail.some(token => configuredPnpmVersion(token) !== undefined));
}

function pipelineToInterpreterHasPnpmSetup(command: string): boolean {
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && !singleQuoted) { escaped = true; continue; }
    if (character === "'" && !doubleQuoted) { singleQuoted = !singleQuoted; continue; }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; continue; }
    if (singleQuoted || doubleQuoted || character !== "|" || command[index + 1] === "|") continue;
    const left = command.slice(0, index);
    const right = command.slice(index + 1);
    const rightTokens = tokenizeShellCommands(right)[0] ?? [];
    const resolution = commandExecutableIndex(rightTokens);
    const interpreter = rightTokens[resolution.index];
    if (pnpmSetupIndicator(left) && (resolution.ambiguous || ["sh", "bash", "zsh", "dash"].includes(interpreter) || /^\$/.test(interpreter ?? ""))) return true;
  }
  return false;
}

function functionBodyHasPnpmSetup(command: string): boolean {
  const header = /(?:^|[;\n]\s*)(?:(?:function\s+)[A-Za-z_][A-Za-z0-9_]*(?:\s*\(\s*\))?|[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\))\s*(?:\n\s*)?\{/.exec(command);
  if (!header) return false;
  const bodyStart = header.index + header[0].lastIndexOf("{") + 1;
  const bodyEnd = command.indexOf("}", bodyStart);
  if (bodyEnd < 0) return pnpmSetupIndicator(command.slice(bodyStart));
  const body = command.slice(bodyStart, bodyEnd);
  const executable = executableShellSegments(body);
  if (executable.ambiguous) return pnpmSetupIndicator(body);
  for (const segment of executable.segments) for (const tokens of tokenizeShellCommands(segment)) {
    const resolution = commandExecutableIndex(tokens);
    if (resolution.ambiguous && pnpmSetupIndicator(tokens.join(" "))) return true;
    const start = resolution.index;
    const name = tokens[start];
    if (name === "yarn" && tokens[start + 1] === "global" && tokens[start + 2] === "add" && tokens.slice(start + 3).some(token => configuredPnpmVersion(token) !== undefined)) return true;
    if (name === "corepack" && ["prepare", "install", "use"].includes(tokens[start + 1]) && tokens.slice(start + 2).some(token => configuredPnpmVersion(token) !== undefined)) return true;
    if (name === "npm" && ["install", "i"].includes(tokens[start + 1]) && tokens.slice(start + 2).some(token => configuredPnpmVersion(token) !== undefined)) return true;
    if (name === "pnpm" && tokens[start + 1] === "add" && tokens.slice(start + 2).some(token => configuredPnpmVersion(token) !== undefined)) return true;
    if (variableExecutablePnpmSetup(tokens, start)) return true;
  }
  return false;
}

type ExecutableSegments = { segments: string[]; ambiguous: boolean };

function executableShellSegments(command: string): ExecutableSegments {
  const nested: string[] = [];
  let outer = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  let escapedDollar = false;
  let ambiguous = false;

  const matchingParen = (start: number): number => {
    let depth = 1;
    let single = false;
    let double = false;
    let escapedInner = false;
    for (let cursor = start; cursor < command.length; cursor++) {
      const character = command[cursor];
      if (escapedInner) { escapedInner = false; continue; }
      if (character === "\\" && !single) { escapedInner = true; continue; }
      if (character === "'" && !double) { single = !single; continue; }
      if (character === '"' && !single) { double = !double; continue; }
      if (single) continue;
      if (character === "(" && !double) depth++;
      else if (character === ")" && !double && --depth === 0) return cursor;
    }
    return -1;
  };

  const matchingBacktick = (start: number): number => {
    let escapedInner = false;
    for (let cursor = start; cursor < command.length; cursor++) {
      const character = command[cursor];
      if (escapedInner) { escapedInner = false; continue; }
      if (character === "\\") { escapedInner = true; continue; }
      if (character === "`") return cursor;
    }
    return -1;
  };

  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (escaped) { outer += `\\${character}`; escapedDollar = character === "$"; escaped = false; continue; }
    if (character === "\\" && !singleQuoted) { escaped = true; continue; }
    if (character === "'" && !doubleQuoted) { singleQuoted = !singleQuoted; outer += character; continue; }
    if (character === '"' && !singleQuoted) { doubleQuoted = !doubleQuoted; outer += character; continue; }

    if (!singleQuoted && character === "`") {
      const end = matchingBacktick(index + 1);
      if (end < 0) {
        if (pnpmSetupIndicator(command.slice(index))) ambiguous = true;
        outer += command.slice(index);
        break;
      }
      const child = executableShellSegments(command.slice(index + 1, end));
      nested.push(...child.segments);
      ambiguous ||= child.ambiguous;
      outer += " ";
      index = end;
      continue;
    }

    const substitution = !singleQuoted && character === "$" && command[index + 1] === "(";
    const subshell = !singleQuoted && !doubleQuoted && character === "(" && !escapedDollar;
    escapedDollar = false;
    if (substitution || subshell) {
      const contentStart = index + (substitution ? 2 : 1);
      const end = matchingParen(contentStart);
      if (end < 0) {
        if (pnpmSetupIndicator(command.slice(index))) ambiguous = true;
        outer += command.slice(index);
        break;
      }
      const content = command.slice(contentStart, end);
      const child = executableShellSegments(content);
      nested.push(...child.segments);
      ambiguous ||= child.ambiguous;
      outer += " ";
      index = end;
      continue;
    }
    outer += character;
  }
  return { segments: [outer, ...nested], ambiguous };
}

export function analyzePnpmVersionParity(content: string, packageManager: string): WorkflowPolicyFinding[] {
  const expected = packageManager.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1];
  if (!expected) return [{ rule: "invalid_package_manager_pin", detail: `Expected an exact pnpm packageManager pin, received: ${packageManager}` }];

  const extraction = extractWorkflowRunCommands(content);
  const findings = [...analyzeExecutableYamlStructure(content), ...extraction.findings];
  const recordVersion = (version: string | null | undefined, mechanism: string) => {
    if (version === null) findings.push({ rule: "pnpm_setup_missing_version", detail: `${mechanism} configures pnpm without an exact version` });
    else if (version !== undefined && version !== expected) findings.push({ rule: "pnpm_version_drift", detail: `${mechanism} uses pnpm@${version}; expected pnpm@${expected}` });
  };

  for (const runCommand of extraction.commands) {
    const heredoc = analyzeHeredocs(runCommand);
    const normalized = normalizeRunCommand(heredoc.command);
    const hasPnpmSetupSignal = pnpmSetupIndicator(normalized) || heredoc.executableSetupSignal || heredoc.textSetupSignal;
    let ambiguousRecorded = false;
    const recordAmbiguous = (detail: string) => {
      if (ambiguousRecorded) return;
      findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail });
      ambiguousRecorded = true;
    };
    if (heredoc.executableSetupSignal) recordAmbiguous("Limited pnpm setup parser cannot safely validate executable heredoc content");
    if (hasPnpmSetupSignal && containsUnsupportedControlFlow(normalized)) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser cannot safely validate pnpm setup combined with shell control flow" });
    if (hasPnpmSetupSignal && containsExecutablePipeline(normalized)) recordAmbiguous("Limited pnpm setup parser cannot safely validate pnpm setup combined with an executable pipeline");
    if (hasPnpmSetupSignal && containsDynamicExecutionSink(normalized)) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser cannot safely validate cross-command dynamic execution of pnpm setup" });
    if (functionBodyHasPnpmSetup(normalized)) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser cannot safely validate a shell function containing pnpm setup" });
    if (pipelineToInterpreterHasPnpmSetup(normalized)) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser cannot safely validate pnpm setup piped to a shell interpreter" });
    if (heredoc.textSetupSignal && containsDynamicExecutionSink(normalized)) recordAmbiguous("Limited pnpm setup parser cannot safely validate later execution of heredoc-derived setup text");
    const executable = executableShellSegments(normalized);
    if (executable.ambiguous) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser could not safely validate an executable shell construction" });
    for (const segment of executable.segments) for (const tokens of tokenizeShellCommands(segment)) {
      const resolution = commandExecutableIndex(tokens);
      if (resolution.ambiguous) {
        if (pnpmSetupIndicator(tokens.join(" "))) findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser could not safely resolve wrapper options" });
        continue;
      }
      const start = resolution.index;
      const executable = tokens[start];
      if (variableExecutablePnpmSetup(tokens, start)) {
        findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: "Limited pnpm setup parser cannot safely resolve a variable executable used for pnpm setup" });
        continue;
      }
      if (["sh", "bash", "zsh", "dash", "eval", "alias"].includes(executable) && pnpmSetupIndicator(tokens.slice(start + 1).join(" "))) {
        findings.push({ rule: "ambiguous_or_unsupported_pnpm_setup_form", detail: `Limited pnpm setup parser cannot safely validate indirect execution through ${executable}` });
        continue;
      }
      const directSetup = (executable === "corepack" && ["prepare", "install", "use"].includes(tokens[start + 1]))
        || (executable === "npm" && ["install", "i"].includes(tokens[start + 1]) && tokens.slice(start + 2).some(token => token === "-g" || token === "--global"))
        || (executable === "pnpm" && tokens[start + 1] === "add" && tokens.slice(start + 2).some(token => token === "-g" || token === "--global"))
        || (executable === "yarn" && tokens[start + 1] === "global" && tokens[start + 2] === "add");
      const assignmentOnly = tokens.every(token => /^[A-Za-z_][A-Za-z0-9_]*=/.test(token));
      const textProducer = ["echo", "printf"].includes(executable ?? "");
      if (heredoc.textSetupSignal && !assignmentOnly && !["cat", "echo", "printf"].includes(executable ?? "")) {
        recordAmbiguous("Workflow run continues outside the non-executable heredoc text subset after pnpm setup text");
        continue;
      }
      if (pnpmSetupIndicator(tokens.join(" ")) && !directSetup && !assignmentOnly && !textProducer) {
        recordAmbiguous("Workflow run contains plausible pnpm setup outside the directly validated command subset");
        continue;
      }
      if (directSetup && executable === "corepack") {
        const versions = tokens.slice(start + 2).map(configuredPnpmVersion).filter(value => value !== undefined);
        if (versions.length === 0) recordVersion(null, `corepack ${tokens[start + 1]}`);
        else for (const version of versions) recordVersion(version, `corepack ${tokens[start + 1]}`);
      } else if (directSetup && executable === "npm") {
        const versions = tokens.slice(start + 2).map(configuredPnpmVersion).filter(value => value !== undefined);
        if (versions.length === 0) recordVersion(null, `npm ${tokens[start + 1]}`);
        else for (const version of versions) recordVersion(version, `npm ${tokens[start + 1]}`);
      } else if (directSetup && executable === "pnpm") {
        const versions = tokens.slice(start + 2).map(configuredPnpmVersion).filter(value => value !== undefined);
        if (versions.length === 0) recordVersion(null, "pnpm add");
        else for (const version of versions) recordVersion(version, "pnpm add");
      } else if (directSetup && executable === "yarn") {
        const versions = tokens.slice(start + 3).map(configuredPnpmVersion).filter(value => value !== undefined);
        if (versions.length === 0) recordVersion(null, "yarn global add");
        else for (const version of versions) recordVersion(version, "yarn global add");
      }
    }
  }

  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*#/.test(lines[index])) continue;
    const rawUses = keyValue(lines[index].replace(/^(\s*)-\s*/, "$1"), "uses");
    const uses = rawUses === null ? null : normalizeInlineYamlScalar(rawUses);
    if (!uses?.startsWith("pnpm/action-setup@")) continue;
    if (!/^pnpm\/action-setup@[a-f0-9]{40}$/i.test(uses)) {
      findings.push({ rule: "pnpm_action_setup_requires_immutable_sha", detail: `pnpm/action-setup must use a full commit SHA, received: ${uses}` });
    }
    const step = checkoutStep(lines, index);
    const versions = step.map(line => keyValue(line, "version")).filter((value): value is string => value !== null);
    if (versions.length === 0) recordVersion(null, "pnpm/action-setup");
    else for (const version of versions) recordVersion(normalizeInlineYamlScalar(version), "pnpm/action-setup");
  }
  return findings;
}

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

    const rawUses = keyValue(structuralLine, "uses");
    const uses = rawUses === null ? null : normalizeInlineYamlScalar(rawUses);
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
