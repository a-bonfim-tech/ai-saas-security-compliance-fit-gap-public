import { writeReleaseManifest } from "./release-integrity";

writeReleaseManifest(process.cwd());
console.log("Unsigned worktree-local integrity manifest generated against the current base commit.");
console.log("Output: reports/release/release-manifest.json");
