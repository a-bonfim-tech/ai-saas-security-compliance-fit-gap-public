import { RELEASE_ARTIFACTS, verifyReleaseManifest, type ReleaseManifest } from "./release-integrity";
import { readSafeJson } from "./safe-file";

const manifest = readSafeJson<ReleaseManifest>("reports/release/release-manifest.json");
const errors = verifyReleaseManifest(process.cwd(), manifest, RELEASE_ARTIFACTS);
if (errors.length) {
  console.error(`Release integrity validation failed: ${errors.join(", ")}`);
  process.exit(1);
}
console.log("Worktree-local integrity manifest validated against its base commit.");
