import { execFileSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

const projectRoot = process.cwd();

const mergeScript = path.join(
  projectRoot,
  "scripts",
  "merge-remote-evidence.ts"
);

const tsxCli = path.join(
  projectRoot,
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs"
);

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true
  });

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

function createFixture(
  origin: string
): {
  directory: string;
  snapshotPath: string;
  registerPath: string;
} {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "aud-008-")
  );

  temporaryDirectories.push(directory);

  execFileSync("git", ["init", "-q"], {
    cwd: directory
  });

  execFileSync(
    "git",
    ["remote", "add", "origin", origin],
    {
      cwd: directory
    }
  );

  const registerPath = path.join(
    directory,
    "evidence",
    "evidence-register.json"
  );

  const snapshotPath = path.join(
    directory,
    "evidence",
    "github",
    "github-remote-evidence.json"
  );

  writeJson(registerPath, [
    {
      key: "unrelated_retained_source",
      present: true,
      source: "manual/security-review",
      notes: "Existing manual evidence.",
      provenance: {
        assessment_repository:
          "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
        source_repository: "manual-source",
        source_collected_at: "2026-01-01T00:00:00.000Z",
        source_collector: "manual-review"
      }
    },
    {
      key: "historical_backfill",
      present: false,
      source:
        "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap",
      notes: "Historical derived evidence."
    },
    {
      key: "remote_replacement",
      present: false,
      source: "older/local/source",
      notes: "Older evidence."
    }
  ]);

  writeJson(snapshotPath, {
    repository:
      "a-bonfim-tech/ai-saas-security-compliance-fit-gap",
    collectedAt: "2026-05-24T04:13:57.734Z",
    collector: "github-remote-evidence-collector",
    evidence: [
      {
        key: "unrelated_retained_source",
        present: false,
        source:
          "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap",
        notes: "Remote control could not be confirmed."
      },
      {
        key: "historical_backfill",
        present: false,
        source:
          "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap",
        notes: "Historical source still not confirmed."
      },
      {
        key: "remote_replacement",
        present: true,
        source:
          "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap/collaborators",
        notes: "Remote evidence confirmed."
      },
      {
        key: "new_remote_item",
        present: true,
        source:
          "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap/branches/main/protection",
        notes: "New remote evidence."
      }
    ],
    warnings: []
  });

  return {
    directory,
    snapshotPath,
    registerPath
  };
}

function executeMerge(directory: string): void {
  execFileSync(
    process.execPath,
    [tsxCli, mergeScript],
    {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();

    if (directory) {
      fs.rmSync(directory, {
        recursive: true,
        force: true
      });
    }
  }
});

describe("AUD-008 remote evidence provenance", () => {
  it("keeps assessment and historical source repositories distinct", () => {
    const fixture = createFixture(
      "https://github.com/a-bonfim-tech/ai-saas-security-compliance-fit-gap-public.git"
    );

    const snapshotBefore = fs.readFileSync(
      fixture.snapshotPath
    );

    executeMerge(fixture.directory);

    const snapshotAfter = fs.readFileSync(
      fixture.snapshotPath
    );

    expect(sha256(snapshotAfter)).toBe(
      sha256(snapshotBefore)
    );

    expect(snapshotAfter.equals(snapshotBefore)).toBe(true);

    const evidence = JSON.parse(
      fs.readFileSync(
        fixture.registerPath,
        "utf8"
      )
    ) as Array<any>;

    const byKey = new Map(
      evidence.map(item => [item.key, item])
    );

    const newRemote = byKey.get("new_remote_item");

    expect(newRemote.source).toBe(
      "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap/branches/main/protection"
    );

    expect(newRemote.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap",
      source_collected_at:
        "2026-05-24T04:13:57.734Z",
      source_collector:
        "github-remote-evidence-collector"
    });

    expect(
      newRemote.provenance.assessment_repository
    ).not.toBe(
      newRemote.provenance.source_repository
    );

    const replacement = byKey.get(
      "remote_replacement"
    );

    expect(replacement.source).toBe(
      "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap/collaborators"
    );

    expect(
      replacement.provenance.source_repository
    ).toBe(
      "a-bonfim-tech/ai-saas-security-compliance-fit-gap"
    );

    const backfill = byKey.get(
      "historical_backfill"
    );

    expect(backfill.source).toBe(
      "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap"
    );

    expect(backfill.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap",
      source_collected_at:
        "2026-05-24T04:13:57.734Z",
      source_collector:
        "github-remote-evidence-collector"
    });

    const unrelated = byKey.get(
      "unrelated_retained_source"
    );

    expect(unrelated.source).toBe(
      "manual/security-review"
    );

    expect(unrelated.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository: "manual-source",
      source_collected_at:
        "2026-01-01T00:00:00.000Z",
      source_collector: "manual-review"
    });
  });

  it("replaces foreign remote evidence even when the fresh state is unconfirmed", () => {
    const fixture = createFixture(
      "https://github.com/a-bonfim-tech/ai-saas-security-compliance-fit-gap-public.git"
    );

    const register = JSON.parse(
      fs.readFileSync(
        fixture.registerPath,
        "utf8"
      )
    ) as Array<any>;

    register.push({
      key: "foreign_remote_state",
      present: true,
      source:
        "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap/branches/main/protection",
      notes: "Previously confirmed against another repository.",
      provenance: {
        assessment_repository:
          "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
        source_repository:
          "a-bonfim-tech/ai-saas-security-compliance-fit-gap",
        source_collected_at:
          "2026-01-01T00:00:00.000Z",
        source_collector:
          "github-remote-evidence-collector"
      }
    });

    writeJson(
      fixture.registerPath,
      register
    );

    const snapshot = JSON.parse(
      fs.readFileSync(
        fixture.snapshotPath,
        "utf8"
      )
    ) as any;

    snapshot.repository =
      "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public";

    snapshot.collectedAt =
      "2026-08-21T18:30:00.000Z";

    snapshot.evidence.push({
      key: "foreign_remote_state",
      present: false,
      source:
        "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap-public/branches/main/protection",
      notes: "Fresh state could not be confirmed."
    });

    writeJson(
      fixture.snapshotPath,
      snapshot
    );

    executeMerge(fixture.directory);

    const evidence = JSON.parse(
      fs.readFileSync(
        fixture.registerPath,
        "utf8"
      )
    ) as Array<any>;

    const item = evidence.find(
      entry => entry.key === "foreign_remote_state"
    );

    expect(item.present).toBe(false);

    expect(item.source).toBe(
      "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap-public/branches/main/protection"
    );

    expect(item.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_collected_at:
        "2026-08-21T18:30:00.000Z",
      source_collector:
        "github-remote-evidence-collector"
    });
  });

  it("is byte-for-byte idempotent for identical remote input", () => {
    const fixture = createFixture(
      "https://github.com/a-bonfim-tech/ai-saas-security-compliance-fit-gap-public.git"
    );

    const snapshotBefore = fs.readFileSync(
      fixture.snapshotPath
    );

    executeMerge(fixture.directory);

    const registerAfterFirstMerge = fs.readFileSync(
      fixture.registerPath
    );

    executeMerge(fixture.directory);

    const registerAfterSecondMerge = fs.readFileSync(
      fixture.registerPath
    );

    expect(
      registerAfterSecondMerge.equals(
        registerAfterFirstMerge
      )
    ).toBe(true);

    expect(
      sha256(registerAfterSecondMerge)
    ).toBe(
      sha256(registerAfterFirstMerge)
    );

    const snapshotAfter = fs.readFileSync(
      fixture.snapshotPath
    );

    expect(snapshotAfter.equals(snapshotBefore)).toBe(true);

    const evidence = JSON.parse(
      registerAfterSecondMerge.toString("utf8")
    ) as Array<any>;

    const byKey = new Map(
      evidence.map(item => [item.key, item])
    );

    const historicalBackfill = byKey.get(
      "historical_backfill"
    );

    expect(
      historicalBackfill.notes.match(
        /Remote collector note: Historical source still not confirmed\./g
      )?.length
    ).toBe(1);

    const replacement = byKey.get(
      "remote_replacement"
    );

    expect(
      replacement.notes.match(
        /Updated by remote collector: Remote evidence confirmed\./g
      )?.length
    ).toBe(1);

    const unrelated = byKey.get(
      "unrelated_retained_source"
    );

    expect(
      unrelated.notes.match(
        /Remote collector note: Remote control could not be confirmed\./g
      )?.length
    ).toBe(1);

    expect(unrelated.source).toBe(
      "manual/security-review"
    );

    expect(unrelated.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository: "manual-source",
      source_collected_at:
        "2026-01-01T00:00:00.000Z",
      source_collector: "manual-review"
    });

    expect(historicalBackfill.source).toBe(
      "gh api repos/a-bonfim-tech/ai-saas-security-compliance-fit-gap"
    );

    expect(historicalBackfill.provenance).toEqual({
      assessment_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap-public",
      source_repository:
        "a-bonfim-tech/ai-saas-security-compliance-fit-gap",
      source_collected_at:
        "2026-05-24T04:13:57.734Z",
      source_collector:
        "github-remote-evidence-collector"
    });
  });

  it.each([
    "https://github.com/acme/current.git",
    "https://github.com/acme/current",
    "git@github.com:acme/current.git",
    "git@github.com:acme/current"
  ])(
    "resolves supported origin format: %s",
    origin => {
      const fixture = createFixture(origin);

      executeMerge(fixture.directory);

      const evidence = JSON.parse(
        fs.readFileSync(
          fixture.registerPath,
          "utf8"
        )
      ) as Array<any>;

      const item = evidence.find(
        entry => entry.key === "new_remote_item"
      );

      expect(
        item.provenance.assessment_repository
      ).toBe("acme/current");
    }
  );

  it("fails closed when origin cannot identify a GitHub repository", () => {
    const fixture = createFixture(
      "https://example.com/acme/current.git"
    );

    expect(() => {
      executeMerge(fixture.directory);
    }).toThrow();

    const register = JSON.parse(
      fs.readFileSync(
        fixture.registerPath,
        "utf8"
      )
    ) as Array<any>;

    expect(
      register.find(
        item => item.key === "new_remote_item"
      )
    ).toBeUndefined();
  });
});
