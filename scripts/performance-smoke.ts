import { performance } from "node:perf_hooks";
import { isArtificialValue, isValidPublicHttpsUrl } from "./evidence-validation";
import { detectAndMaskSecrets } from "./secret-patterns";

function measure(name: string, iterations: number, operation: (index: number) => void): void {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) operation(index);
  const elapsedMs = performance.now() - started;
  console.log(`${name}: iterations=${iterations} observed_ms=${elapsedMs.toFixed(2)}`);
}

measure("placeholder_validation", 50_000, index => {
  isArtificialValue(index % 2 ? `service-${index}` : "T\u200bBD");
});
measure("url_validation", 20_000, index => {
  isValidPublicHttpsUrl(index % 2 ? `https://service-${index}.security.example.org/path` : "https://localhost/");
});
measure("secret_line_scan", 20_000, index => {
  detectAndMaskSecrets(`ordinary repository line ${index}`);
});

console.log("Observed timings are regression diagnostics, not performance guarantees or release targets.");
