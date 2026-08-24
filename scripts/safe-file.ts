import fs from "node:fs";
import path from "node:path";

export type SafeFileOptions = {
  root?: string;
  allowedExtensions?: string[];
  maxBytes?: number;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export function resolveSafeFile(relativePath: string, options: SafeFileOptions = {}): string {
  if (relativePath.includes("\0")) throw new Error("File path contains a null byte.");
  const root = path.resolve(options.root ?? process.cwd());
  const realRoot = fs.realpathSync(root);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("File path escapes the allowed root.");
  const extension = path.extname(candidate).toLowerCase();
  const allowedExtensions = options.allowedExtensions ?? [".json"];
  if (!allowedExtensions.includes(extension)) throw new Error(`Unexpected file extension: ${extension || "none"}.`);
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink()) throw new Error("Symbolic links are not accepted as evidence input.");
  if (!stat.isFile()) throw new Error("Evidence input is not a regular file.");
  if (stat.size > (options.maxBytes ?? DEFAULT_MAX_BYTES)) throw new Error("Evidence input exceeds the configured size limit.");
  const real = fs.realpathSync(candidate);
  const realRelative = path.relative(realRoot, real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new Error("Resolved file escapes the allowed root.");
  return real;
}

export function readSafeUtf8(relativePath: string, options: SafeFileOptions = {}): string {
  const file = resolveSafeFile(relativePath, options);
  const data = fs.readFileSync(file);
  if (data.includes(0)) throw new Error("Binary or null-containing input is not accepted.");
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(data);
  return decoded;
}

export function readSafeJson<T>(relativePath: string, options: SafeFileOptions = {}): T {
  const content = readSafeUtf8(relativePath, { ...options, allowedExtensions: [".json"] });
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Malformed JSON input: ${relativePath}`);
  }
}
