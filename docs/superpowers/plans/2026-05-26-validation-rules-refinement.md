# Validation Rules Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine three MVP-era validation rules (license-edition, global-encryption, agent-workload) per `docs/superpowers/specs/2026-05-26-validation-rules-refinement-design.md`. Add a new `skipped` ValidationStatus and dashboard Notes panel to surface `info` + `skipped` results that are currently dropped from the UI.

**Architecture:** Strict TDD per project standards: write failing test → run → minimal implementation → run → commit. Each rule change is its own task to keep diffs small and reviewable. Rule count goes from 11 → 12 (agent-workload removed, agent-standalone-unsupported + agent-policy-gateway-required added; license + config-backup-encryption rules updated in place).

**Tech Stack:** TypeScript 5.9 strict, Vitest, React 19, Tailwind 4, shadcn/ui (`new-york`), lucide-react icons. Project follows Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`).

**Spec:** [`docs/superpowers/specs/2026-05-26-validation-rules-refinement-design.md`](../specs/2026-05-26-validation-rules-refinement-design.md)

---

## Pre-flight

- Working branch: `fix/validation-rules-refinement` (already created, spec already committed).
- Verify clean state before starting:

```bash
git status
git log --oneline -3
```

Expected output: branch `fix/validation-rules-refinement`, latest commit `docs(validation): spec for refining license, encryption, agent rules`.

Run the full suite once at start to confirm a green baseline:

```bash
npm run test:run
```

Expected: all tests pass (this is the baseline; subsequent task work must keep us green at every commit).

---

## Task 1: Add `skipped` to `ValidationStatus`

**Files:**
- Modify: `src/types/validation.ts`

Trivial type-only change. No test changes required at this point — the new variant is just added to the union; existing rules don't produce it yet. Validator and dashboard code will start using it in later tasks.

- [ ] **Step 1: Update the union type**

Replace the contents of `src/types/validation.ts` with:

```typescript
export type ValidationStatus = "pass" | "fail" | "warning" | "info" | "skipped";

export interface ValidationResult {
  ruleId: string;
  title: string;
  status: ValidationStatus;
  message: string;
  affectedItems: string[];
}
```

- [ ] **Step 2: Confirm TypeScript still compiles**

Run: `npm run build`
Expected: build succeeds. Adding a union variant is non-breaking for existing code.

- [ ] **Step 3: Commit**

```bash
git add src/types/validation.ts
git commit -m "feat(types): add 'skipped' to ValidationStatus union"
```

---

## Task 2: Add `getNoteValidations` selector

**Files:**
- Modify: `src/lib/validation-selectors.ts`
- Modify: `src/__tests__/validation-selectors.test.ts`

Selector for the new Notes panel: returns `info` + `skipped` validations in their original order.

- [ ] **Step 1: Write the failing tests**

Open `src/__tests__/validation-selectors.test.ts` and replace its contents with:

```typescript
import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/types/validation";
import {
  getBlockerValidations,
  getPassingValidations,
  getNoteValidations,
  getBlockerCount,
  hasBlockers,
} from "@/lib/validation-selectors";
import { FAIL_RESULT, PASS_RESULT, WARNING_RESULT } from "./fixtures";

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: [],
};

const SKIPPED_RESULT: ValidationResult = {
  ruleId: "config-backup-encryption",
  title: "Configuration Backup Encryption",
  status: "skipped",
  message: "Check skipped — security summary missing.",
  affectedItems: [],
};

describe("validation selectors", () => {
  it("returns blocker validations sorted fail before warning", () => {
    const blockers = getBlockerValidations([
      WARNING_RESULT,
      PASS_RESULT,
      FAIL_RESULT,
    ]);

    expect(blockers.map((blocker) => blocker.ruleId)).toEqual([
      "job-encryption",
      "agent-policy-gateway-required",
    ]);
  });

  it("returns only passing validations", () => {
    const passing = getPassingValidations([
      PASS_RESULT,
      FAIL_RESULT,
      WARNING_RESULT,
      INFO_RESULT,
      SKIPPED_RESULT,
    ]);

    expect(passing.map((result) => result.ruleId)).toEqual(["vbr-version"]);
  });

  it("returns info and skipped validations in original order", () => {
    const notes = getNoteValidations([
      PASS_RESULT,
      INFO_RESULT,
      FAIL_RESULT,
      SKIPPED_RESULT,
      WARNING_RESULT,
    ]);

    expect(notes.map((result) => result.ruleId)).toEqual([
      "license-edition",
      "config-backup-encryption",
    ]);
  });

  it("returns empty array when no info or skipped validations present", () => {
    const notes = getNoteValidations([PASS_RESULT, FAIL_RESULT, WARNING_RESULT]);
    expect(notes).toEqual([]);
  });

  it("reports blocker presence and count", () => {
    const validations = [PASS_RESULT, WARNING_RESULT];

    expect(hasBlockers(validations)).toBe(true);
    expect(getBlockerCount(validations)).toBe(1);
  });
});
```

Note: the assertion `["job-encryption", "agent-policy-gateway-required"]` anticipates the fixture update in Task 6. We'll also need to update `WARNING_RESULT` in `src/__tests__/fixtures.ts` in this task (next step) so this test passes.

- [ ] **Step 2: Update the WARNING_RESULT fixture**

In `src/__tests__/fixtures.ts`, find the `WARNING_RESULT` export (around line 120) and update its `ruleId` and `title`:

```typescript
export const WARNING_RESULT: ValidationResult = {
  ruleId: "agent-policy-gateway-required",
  title: "Managed Agent Policies",
  status: "warning",
  message: "Managed agent policies detected.",
  affectedItems: ["Job B"],
};
```

- [ ] **Step 3: Run tests to verify they fail in the right place**

Run: `npx vitest run src/__tests__/validation-selectors.test.ts`
Expected: tests fail with `getNoteValidations is not a function` (import error).

- [ ] **Step 4: Implement `getNoteValidations`**

Update `src/lib/validation-selectors.ts` to:

```typescript
import type { ValidationResult } from "@/types/validation";

const isBlocker = (result: ValidationResult) =>
  result.status === "fail" || result.status === "warning";

export const getBlockerValidations = (validations: ValidationResult[]) =>
  validations.filter(isBlocker).sort((a, b) => {
    if (a.status === "fail" && b.status !== "fail") return -1;
    if (a.status !== "fail" && b.status === "fail") return 1;
    return 0;
  });

export const getPassingValidations = (validations: ValidationResult[]) =>
  validations.filter((result) => result.status === "pass");

export const getNoteValidations = (validations: ValidationResult[]) =>
  validations.filter(
    (result) => result.status === "info" || result.status === "skipped",
  );

export const hasBlockers = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length > 0;

export const getBlockerCount = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length;
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/__tests__/validation-selectors.test.ts`
Expected: all selector tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation-selectors.ts src/__tests__/validation-selectors.test.ts src/__tests__/fixtures.ts
git commit -m "feat(selectors): add getNoteValidations for info+skipped results"
```

---

## Task 3: Reword `license-edition` info message

**Files:**
- Modify: `src/lib/validator.ts`
- Modify: `src/__tests__/validator.test.ts`

Status logic stays the same (pass / info). Only the info message text changes per spec.

- [ ] **Step 1: Update the failing tests**

In `src/__tests__/validator.test.ts`, replace the "Rule 6: License/Edition Check" describe block. Find the test `"reports info when Community edition is detected"` and:

- Change the `expect(licenseCheck?.message).toContain("SOBR limitations");` assertion to:

```typescript
expect(licenseCheck?.message).toContain("Vault is fully supported");
expect(licenseCheck?.message).toContain("Scale-Out Backup Repository");
```

- Keep the existing `affectedItems` assertion.
- Apply the same message updates to the "reports info when Free edition is detected" test if it also asserted on the old "SOBR limitations" string. (It currently does not, but verify after editing.)

After the edit, the relevant block looks like:

```typescript
describe("Rule 6: License/Edition Check", () => {
  it("reports info when Community edition is detected", () => {
    const data: NormalizedDataset = {
      backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: true,
        },
      ],
      jobInfo: [],
      Licenses: [{ Edition: "Community", Status: "Active" }],
      dataErrors: [],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      repos: [],
    };

    const results = validateHealthcheck(data);
    const licenseCheck = results.find((r) => r.ruleId === "license-edition");

    expect(licenseCheck).toBeDefined();
    expect(licenseCheck?.status).toBe("info");
    expect(licenseCheck?.title).toBe("License/Edition Notes");
    expect(licenseCheck?.message).toContain("Vault is fully supported");
    expect(licenseCheck?.message).toContain("Scale-Out Backup Repository");
    expect(licenseCheck?.affectedItems).toContain("Community");
  });

  // ... rest of the block unchanged
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 6"`
Expected: the Community-edition test fails on the new `toContain("Vault is fully supported")` assertion (old message says "SOBR limitations").

- [ ] **Step 3: Update the validator info message**

In `src/lib/validator.ts`, find `validateLicenseEdition` (around line 192) and replace the `info` message:

```typescript
function validateLicenseEdition(data: NormalizedDataset): ValidationResult {
  const affectedLicenses = data.Licenses.filter((license) => {
    const edition = license.Edition.trim().toLowerCase();
    return edition.includes("community") || edition.includes("free");
  });

  if (affectedLicenses.length > 0) {
    return {
      ruleId: "license-edition",
      title: "License/Edition Notes",
      status: "info",
      message:
        "Community or Free edition detected. VDC Vault is fully supported on Community Edition. Note: Community / Free editions do not include Scale-Out Backup Repository (SOBR), so capacity-tier offload patterns are not available.",
      affectedItems: affectedLicenses.map((license) => license.Edition),
    };
  }

  return {
    ruleId: "license-edition",
    title: "License/Edition Notes",
    status: "pass",
    message: "No Community or Free editions detected.",
    affectedItems: [],
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 6"`
Expected: all License/Edition tests pass.

- [ ] **Step 5: Run full validator suite + pipeline to confirm no regression**

Run: `npx vitest run src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts`
Expected: all tests pass (this task's change has no impact on pipeline.test.ts beyond license-edition tests which still pass because pipeline.test.ts doesn't assert message text).

- [ ] **Step 6: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts
git commit -m "fix(validator): reword license-edition info — Vault supports Community Edition"
```

---

## Task 4: Rename + narrow `global-encryption` → `config-backup-encryption`

**Files:**
- Modify: `src/lib/validator.ts`
- Modify: `src/__tests__/validator.test.ts`
- Modify: `src/__tests__/pipeline.test.ts`

This task introduces the first real use of the `skipped` status. The rule is renamed, narrowed to only `ConfigBackupEncryptionEnabled`, and the empty-securitySummary case becomes `skipped` instead of `pass`.

- [ ] **Step 1: Rewrite the "Rule 2" describe block in validator.test.ts**

In `src/__tests__/validator.test.ts`, replace the entire `describe("Rule 2: Global Encryption Check", …)` block (lines 92-232) with:

```typescript
  describe("Rule 2: Configuration Backup Encryption Check", () => {
    it("passes when ConfigBackupEncryptionEnabled is true", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find((r) => r.ruleId === "config-backup-encryption");

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
      expect(check?.title).toBe("Configuration Backup Encryption");
    });

    it("ignores BackupFileEncryptionEnabled when ConfigBackup is encrypted", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: false,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find((r) => r.ruleId === "config-backup-encryption");

      expect(check?.status).toBe("pass");
    });

    it("warns when ConfigBackupEncryptionEnabled is false", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: false,
          },
        ],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find((r) => r.ruleId === "config-backup-encryption");

      expect(check?.status).toBe("warning");
      expect(check?.title).toBe("Configuration Backup Encryption");
      expect(check?.message).toContain("configuration backup");
      expect(check?.message).toContain("encryption");
    });

    it("returns skipped when securitySummary is empty", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [],
        jobInfo: [],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find((r) => r.ruleId === "config-backup-encryption");

      expect(check?.status).toBe("skipped");
      expect(check?.message).toContain("skipped");
      expect(check?.message).toContain("security summary");
    });
  });
```

- [ ] **Step 2: Update pipeline.test.ts for the rename**

In `src/__tests__/pipeline.test.ts`:

Find the test `"passes global encryption check (both flags True)"` (around line 112). Replace it with:

```typescript
    // Rule 2: Configuration Backup Encryption - ConfigBackup True → pass
    it("passes configuration backup encryption check", () => {
      const rule = findRule(result.validations, "config-backup-encryption");
      expect(rule.status).toBe("pass");
    });
```

Find the test `"detects disabled global encryption through the full pipeline"` (around line 245). Update the ruleId lookup:

```typescript
    it("detects disabled config backup encryption through the full pipeline", () => {
      const input: HealthcheckRoot = {
        Sections: {
          securitySummary: {
            Headers: [
              "BackupFileEncryptionEnabled",
              "ConfigBackupEncryptionEnabled",
            ],
            Rows: [["True", "False"]],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const rule = findRule(result.validations, "config-backup-encryption");
      // ... keep the rest of the assertions in this test, just adjust ruleId
```

(Keep the existing remaining assertions in that test body. They were asserting on `status === "warning"`; that still holds.)

- [ ] **Step 3: Run tests to verify the four expected failures**

Run: `npx vitest run src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts`
Expected: failures in the Rule 2 block (ruleId not found) and the pipeline tests that now look for `config-backup-encryption`.

- [ ] **Step 4: Update the validator function**

In `src/lib/validator.ts`:

1. Rename `validateGlobalEncryption` → `validateConfigBackupEncryption`.
2. Update the call site in `validateHealthcheck` (line 16):

```typescript
export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  return [
    validateVbrVersion(data),
    validateConfigBackupEncryption(data),
    validateJobEncryption(data),
    validateAwsWorkload(data),
    validateAgentWorkload(data),
    validateLicenseEdition(data),
    validateRetentionPeriod(data),
    validateCapTierEncryption(data),
    validateSobrImmutability(data),
    validateArchiveTierEdition(data),
    validateCapacityTierResidency(data),
  ];
}
```

3. Replace the function body (the old `validateGlobalEncryption` around lines 63-97) with:

```typescript
function validateConfigBackupEncryption(
  data: NormalizedDataset,
): ValidationResult {
  if (data.securitySummary.length === 0) {
    return {
      ruleId: "config-backup-encryption",
      title: "Configuration Backup Encryption",
      status: "skipped",
      message:
        "Configuration backup encryption check skipped — security summary section is missing from the healthcheck data.",
      affectedItems: [],
    };
  }

  const summary = data.securitySummary[0];

  if (!summary.ConfigBackupEncryptionEnabled) {
    return {
      ruleId: "config-backup-encryption",
      title: "Configuration Backup Encryption",
      status: "warning",
      message:
        "VBR configuration backup encryption is not enabled. Once VDC Vault is in use, VBR automatically disables configuration backups unless they are encrypted, so encryption becomes a requirement at that point. It is also a best practice generally — the configuration backup contains sensitive information such as credentials and certificates.",
      affectedItems: [],
    };
  }

  return {
    ruleId: "config-backup-encryption",
    title: "Configuration Backup Encryption",
    status: "pass",
    message: "VBR configuration backup encryption is enabled.",
    affectedItems: [],
  };
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Run the full suite to catch any other references**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts
git commit -m "refactor(validator): rename global-encryption → config-backup-encryption, add skipped status"
```

---

## Task 5: Add `validateAgentStandaloneUnsupported` (blocker)

**Files:**
- Modify: `src/lib/validator.ts`
- Modify: `src/__tests__/validator.test.ts`

New rule for standalone (unmanaged) agents. Does not yet replace `agent-workload` — that's Task 7. This task introduces the new function and wires it into `validateHealthcheck` ALONGSIDE the existing agent-workload (count goes 11 → 12 temporarily). This keeps the diff small per task.

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `src/__tests__/validator.test.ts` immediately after the existing "Rule 5: Agent Workload Check" block (insert before "Rule 6: License/Edition Check"):

```typescript
  describe("Rule 5b: Standalone Agent Workloads (agent-standalone-unsupported)", () => {
    it("passes when no Unmanaged Agent jobs are present", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
      expect(check?.affectedItems).toHaveLength(0);
    });

    it("fails when an Unmanaged Agent job is detected (exact match, case-insensitive)", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "StandaloneJob",
            JobType: "Unmanaged Agent",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "lowercaseStandalone",
            JobType: "unmanaged agent",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("fail");
      expect(check?.affectedItems).toEqual(["StandaloneJob", "lowercaseStandalone"]);
      expect(check?.message).toContain("Standalone");
      expect(check?.message).toContain("Backup Copy");
    });

    it("does not fire for managed agent JobTypes (Agent Backup, EpAgentBackup)", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Managed1",
            JobType: "Agent Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Managed2",
            JobType: "EpAgentBackup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-standalone-unsupported",
      );

      expect(check?.status).toBe("pass");
      expect(check?.affectedItems).toHaveLength(0);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 5b"`
Expected: tests fail — `check` is undefined (ruleId not yet implemented).

- [ ] **Step 3: Implement the new validator**

In `src/lib/validator.ts`, append a new function below `validateAgentWorkload`:

```typescript
function validateAgentStandaloneUnsupported(
  data: NormalizedDataset,
): ValidationResult {
  const matches = data.jobInfo.filter(
    (job) => job.JobType.trim().toLowerCase() === "unmanaged agent",
  );

  if (matches.length > 0) {
    return {
      ruleId: "agent-standalone-unsupported",
      title: "Standalone Agent Workloads",
      status: "fail",
      message:
        "Standalone (unmanaged) agents cannot target VDC Vault directly. To get standalone agent backups into Vault, use a Backup Copy Job with encryption enabled — that is the only supported path.",
      affectedItems: matches.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "agent-standalone-unsupported",
    title: "Standalone Agent Workloads",
    status: "pass",
    message: "No standalone agent workloads detected.",
    affectedItems: [],
  };
}
```

Wire it into `validateHealthcheck` by appending after `validateAgentWorkload(data)`:

```typescript
export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  return [
    validateVbrVersion(data),
    validateConfigBackupEncryption(data),
    validateJobEncryption(data),
    validateAwsWorkload(data),
    validateAgentWorkload(data),
    validateAgentStandaloneUnsupported(data),
    validateLicenseEdition(data),
    validateRetentionPeriod(data),
    validateCapTierEncryption(data),
    validateSobrImmutability(data),
    validateArchiveTierEdition(data),
    validateCapacityTierResidency(data),
  ];
}
```

- [ ] **Step 4: Run the Rule 5b tests to verify pass**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 5b"`
Expected: all three Rule 5b tests pass.

- [ ] **Step 5: Fix the existing `toHaveLength(11)` assertions in pipeline.test.ts**

The rule count is now 12 (we added a rule, haven't removed any yet). In `src/__tests__/pipeline.test.ts`, find both occurrences of `expect(result.validations).toHaveLength(11);` (lines 156 and 166) and update each to:

```typescript
expect(result.validations).toHaveLength(12);
```

- [ ] **Step 6: Run the full suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts
git commit -m "feat(validator): add agent-standalone-unsupported blocker rule"
```

---

## Task 6: Add `validateAgentPolicyGatewayRequired` (warning)

**Files:**
- Modify: `src/lib/validator.ts`
- Modify: `src/__tests__/validator.test.ts`
- Modify: `src/__tests__/pipeline.test.ts`

Add the second new agent rule for managed agent policies (`EpAgentPolicy`, `VmbApiPolicyTempJob`). Wire alongside the existing `agent-workload` again (count temporarily 13). Task 7 then removes `agent-workload`.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/validator.test.ts`, add a new describe block immediately after the Rule 5b block:

```typescript
  describe("Rule 5c: Managed Agent Policies (agent-policy-gateway-required)", () => {
    it("passes when no policy job types are present", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check).toBeDefined();
      expect(check?.status).toBe("pass");
    });

    it("warns when EpAgentPolicy or VmbApiPolicyTempJob jobs are present (case-insensitive)", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "PolicyJob1",
            JobType: "EpAgentPolicy",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "PolicyJob2",
            JobType: "vmbapipolicytempjob",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check?.status).toBe("warning");
      expect(check?.affectedItems).toEqual(["PolicyJob1", "PolicyJob2"]);
      expect(check?.message).toContain("Gateway Server");
    });

    it("does not fire for managed agent backup JobTypes", () => {
      const data: NormalizedDataset = {
        backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
        securitySummary: [
          {
            BackupFileEncryptionEnabled: true,
            ConfigBackupEncryptionEnabled: true,
          },
        ],
        jobInfo: [
          {
            JobName: "Job A",
            JobType: "Agent Backup",
            Encrypted: true,
            RepoName: "Repo1",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
          {
            JobName: "Job B",
            JobType: "EpAgentBackup",
            Encrypted: true,
            RepoName: "Repo2",
            RetainDays: null,
            GfsDetails: null,
            SourceSizeGB: null,
            OnDiskGB: null,
            RetentionScheme: null,
            CompressionLevel: null,
            BlockSize: null,
            GfsEnabled: null,
            ActiveFullEnabled: null,
            SyntheticFullEnabled: null,
            BackupChainType: null,
            IndexingEnabled: null,
          },
        ],
        Licenses: [],
        dataErrors: [],
        jobSessionSummary: [],
        sobr: [],
        capExtents: [],
        extents: [],
        archExtents: [],
        repos: [],
      };

      const results = validateHealthcheck(data);
      const check = results.find(
        (r) => r.ruleId === "agent-policy-gateway-required",
      );

      expect(check?.status).toBe("pass");
    });
  });
```

- [ ] **Step 2: Update validation count in pipeline.test.ts**

Find both `toHaveLength(12)` assertions added in Task 5 and update to `13`:

```typescript
expect(result.validations).toHaveLength(13);
```

- [ ] **Step 3: Run tests to verify failures**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 5c"`
Expected: tests fail — ruleId not found.

- [ ] **Step 4: Implement the new validator**

In `src/lib/validator.ts`, append below `validateAgentStandaloneUnsupported`:

```typescript
function validateAgentPolicyGatewayRequired(
  data: NormalizedDataset,
): ValidationResult {
  const POLICY_TYPES = new Set(["epagentpolicy", "vmbapipolicytempjob"]);

  const matches = data.jobInfo.filter((job) =>
    POLICY_TYPES.has(job.JobType.trim().toLowerCase()),
  );

  if (matches.length > 0) {
    return {
      ruleId: "agent-policy-gateway-required",
      title: "Managed Agent Policies",
      status: "warning",
      message:
        "Managed agent policies require a VBR Gateway Server to reach VDC Vault — they cannot write directly to object storage. Ensure a Gateway Server is configured for these policies.",
      affectedItems: matches.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "agent-policy-gateway-required",
    title: "Managed Agent Policies",
    status: "pass",
    message: "No managed agent policies detected.",
    affectedItems: [],
  };
}
```

Wire into `validateHealthcheck` after the standalone rule:

```typescript
export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  return [
    validateVbrVersion(data),
    validateConfigBackupEncryption(data),
    validateJobEncryption(data),
    validateAwsWorkload(data),
    validateAgentWorkload(data),
    validateAgentStandaloneUnsupported(data),
    validateAgentPolicyGatewayRequired(data),
    validateLicenseEdition(data),
    validateRetentionPeriod(data),
    validateCapTierEncryption(data),
    validateSobrImmutability(data),
    validateArchiveTierEdition(data),
    validateCapacityTierResidency(data),
  ];
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/__tests__/validator.test.ts -t "Rule 5c"`
Expected: all Rule 5c tests pass.

- [ ] **Step 6: Run full suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts
git commit -m "feat(validator): add agent-policy-gateway-required warning rule"
```

---

## Task 7: Remove `validateAgentWorkload`

**Files:**
- Modify: `src/lib/validator.ts`
- Modify: `src/__tests__/validator.test.ts`
- Modify: `src/__tests__/pipeline.test.ts`

Remove the deprecated single-rule agent check. Final rule count: 12 (started at 11, added 2 new, removed 1).

- [ ] **Step 1: Delete the old test block**

In `src/__tests__/validator.test.ts`, delete the entire `describe("Rule 5: Agent Workload Check", …)` block (the three tests covering pass / warn / "various agent job type patterns"). Keep "Rule 5b" and "Rule 5c" blocks intact.

- [ ] **Step 2: Update the agent-workload pipeline test**

In `src/__tests__/pipeline.test.ts`, find the existing tests that reference `"agent-workload"`:

(a) `"warns on agent workloads (EpAgentBackup, EpAgentPolicy)"` (around line 131) — delete this test entirely. Its assertion is now false (EpAgentBackup no longer triggers a warning under the new rules; EpAgentPolicy triggers a separate rule).

(b) Add a replacement test in its place that asserts the new pipeline behavior for the same example fixture. The example data has at least one `EpAgentPolicy` job (per `veeam-healthcheck.example.json` jobSummary). It also has `Agent Backup` and `EpAgentBackup` jobs:

```typescript
    // Rule 5b: Standalone Agents - none in sample → pass
    it("passes standalone agent check (no Unmanaged Agent in sample)", () => {
      const rule = findRule(result.validations, "agent-standalone-unsupported");
      expect(rule.status).toBe("pass");
    });

    // Rule 5c: Managed Agent Policies - EpAgentPolicy present → warning
    it("warns on managed agent policies (EpAgentPolicy present in sample)", () => {
      const rule = findRule(result.validations, "agent-policy-gateway-required");
      expect(rule.status).toBe("warning");
      expect(rule.affectedItems.length).toBeGreaterThan(0);
    });
```

Note: if the sample data does not actually contain `EpAgentPolicy` rows in `jobInfo` (only in `jobSummary` counts), the second assertion will fail. Verify with:

```bash
grep -c '"EpAgentPolicy"' veeam-healthcheck.example.json
```

If only one occurrence (in jobSummary, not jobInfo), drop the "warning" assertion and instead assert `status === "pass"`. Adjust the comment accordingly.

(c) Delete the test `"detects agent jobs through the full pipeline"` (around line 212) — its assertion that `EpAgentBackup` triggers `agent-workload === "warning"` is now obsolete. Add a replacement test that asserts the new behavior:

```typescript
    it("does not warn on managed agent backup jobs (EpAgentBackup)", () => {
      const input: HealthcheckRoot = {
        Sections: {
          jobInfo: {
            Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
            Rows: [
              ["AgentJob1", "EpAgentBackup", "True", "Repo1"],
              ["RegularJob", "Backup", "True", "Repo2"],
            ],
          },
        },
      };

      const result = analyzeHealthcheck(input);
      const standalone = findRule(
        result.validations,
        "agent-standalone-unsupported",
      );
      const policy = findRule(
        result.validations,
        "agent-policy-gateway-required",
      );

      expect(standalone.status).toBe("pass");
      expect(policy.status).toBe("pass");
    });
```

- [ ] **Step 3: Update validation count assertions in pipeline.test.ts**

Final count is 12. Update both `toHaveLength(13)` to `toHaveLength(12)`:

```typescript
expect(result.validations).toHaveLength(12);
```

- [ ] **Step 4: Run tests to verify expected failures**

Run: `npx vitest run src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts`
Expected: no "Rule 5" failures (deleted), but validator currently still adds `validateAgentWorkload(data)` → count is 13 not 12, so the count assertions fail.

- [ ] **Step 5: Remove the old validator function and its call site**

In `src/lib/validator.ts`:

1. Remove `validateAgentWorkload(data),` from the `validateHealthcheck` return array.
2. Delete the entire `validateAgentWorkload` function (around lines 167-190 of the pre-task file).

Final `validateHealthcheck`:

```typescript
export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  return [
    validateVbrVersion(data),
    validateConfigBackupEncryption(data),
    validateJobEncryption(data),
    validateAwsWorkload(data),
    validateAgentStandaloneUnsupported(data),
    validateAgentPolicyGatewayRequired(data),
    validateLicenseEdition(data),
    validateRetentionPeriod(data),
    validateCapTierEncryption(data),
    validateSobrImmutability(data),
    validateArchiveTierEdition(data),
    validateCapacityTierResidency(data),
  ];
}
```

- [ ] **Step 6: Run full suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts src/__tests__/pipeline.test.ts
git commit -m "refactor(validator): remove deprecated agent-workload rule"
```

---

## Task 8: Build the `NotesPanel` component

**Files:**
- Create: `src/components/dashboard/notes-panel.tsx`
- Create: `src/__tests__/notes-panel.test.tsx`

Mirror the styling and stagger patterns from `passing-checks-list.tsx` and `blockers-list.tsx`, but with a neutral/grey treatment. Uses `getNoteValidations` from Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/notes-panel.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ValidationResult } from "@/types/validation";
import { NotesPanel } from "@/components/dashboard/notes-panel";

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: ["Community"],
};

const SKIPPED_RESULT: ValidationResult = {
  ruleId: "config-backup-encryption",
  title: "Configuration Backup Encryption",
  status: "skipped",
  message: "Check skipped — security summary missing.",
  affectedItems: [],
};

const PASS_RESULT: ValidationResult = {
  ruleId: "vbr-version",
  title: "VBR Version Compatibility",
  status: "pass",
  message: "All servers meet minimum version.",
  affectedItems: [],
};

describe("NotesPanel", () => {
  it("renders nothing when there are no info or skipped validations", () => {
    const { container } = render(<NotesPanel validations={[PASS_RESULT]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders info validations with title and message", () => {
    render(<NotesPanel validations={[INFO_RESULT, PASS_RESULT]} />);
    expect(screen.getByText("License/Edition Notes")).toBeInTheDocument();
    expect(
      screen.getByText("Community Edition detected."),
    ).toBeInTheDocument();
  });

  it("renders skipped validations with title and message", () => {
    render(<NotesPanel validations={[SKIPPED_RESULT]} />);
    expect(
      screen.getByText("Configuration Backup Encryption"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check skipped — security summary missing."),
    ).toBeInTheDocument();
  });

  it("displays affected items as a bulleted list", () => {
    render(<NotesPanel validations={[INFO_RESULT]} />);
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("truncates affected items beyond 5 with overflow text", () => {
    const longList: ValidationResult = {
      ruleId: "license-edition",
      title: "License/Edition Notes",
      status: "info",
      message: "Multiple editions.",
      affectedItems: ["A", "B", "C", "D", "E", "F", "G"],
    };
    render(<NotesPanel validations={[longList]} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
    expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
  });

  it("renders both info and skipped together with a panel testid", () => {
    render(<NotesPanel validations={[INFO_RESULT, SKIPPED_RESULT]} />);
    expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/notes-panel.test.tsx`
Expected: tests fail with module-not-found for `@/components/dashboard/notes-panel`.

- [ ] **Step 3: Implement the component**

Create `src/components/dashboard/notes-panel.tsx`:

```typescript
import { CircleSlash, Info } from "lucide-react";
import type { ValidationResult, ValidationStatus } from "@/types/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getNoteValidations } from "@/lib/validation-selectors";
import { cn } from "@/lib/utils";

interface NotesPanelProps {
  validations: ValidationResult[];
}

const MAX_VISIBLE_ITEMS = 5;
const STAGGER_DELAY_MS = 100;

const NOTE_STYLE: Record<
  Extract<ValidationStatus, "info" | "skipped">,
  {
    Icon: typeof Info;
    badgeLabel: string;
  }
> = {
  info: {
    Icon: Info,
    badgeLabel: "Note",
  },
  skipped: {
    Icon: CircleSlash,
    badgeLabel: "Skipped",
  },
};

export function NotesPanel({ validations }: NotesPanelProps) {
  const notes = getNoteValidations(validations);

  if (notes.length === 0) {
    return null;
  }

  return (
    <div data-testid="notes-panel" className="space-y-3">
      {notes.map((note, index) => {
        const style = NOTE_STYLE[note.status as "info" | "skipped"];
        const visibleItems = note.affectedItems.slice(0, MAX_VISIBLE_ITEMS);
        const remaining = note.affectedItems.length - MAX_VISIBLE_ITEMS;

        return (
          <Alert
            key={note.ruleId}
            role="status"
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards duration-300",
              "border-l-muted-foreground/30 bg-muted/40 border-l-4",
            )}
            style={{ animationDelay: `${index * STAGGER_DELAY_MS}ms` }}
          >
            <style.Icon
              className="text-muted-foreground !size-5"
              aria-hidden="true"
            />
            <AlertTitle>
              <span className="text-sm font-bold tracking-wide uppercase">
                {note.title}
              </span>
              <Badge
                variant="outline"
                className="border-muted-foreground text-muted-foreground ml-2 align-middle text-[10px] tracking-wider uppercase"
              >
                {style.badgeLabel}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p>{note.message}</p>
              {visibleItems.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5">
                  {visibleItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {remaining > 0 && (
                    <li className="text-muted-foreground">
                      and {remaining} more
                    </li>
                  )}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/__tests__/notes-panel.test.tsx`
Expected: all NotesPanel tests pass.

- [ ] **Step 5: Lint check**

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/notes-panel.tsx src/__tests__/notes-panel.test.tsx
git commit -m "feat(dashboard): add NotesPanel for info and skipped validations"
```

---

## Task 9: Wire `NotesPanel` into `dashboard-view.tsx`

**Files:**
- Modify: `src/components/dashboard/dashboard-view.tsx`
- Modify: `src/__tests__/dashboard-view.test.tsx`

Render NotesPanel between blockers and passing checks (when blockers exist) and above the success celebration (when no blockers but notes exist).

- [ ] **Step 1: Check the current dashboard-view test for relevant patterns**

Run: `grep -n "blockers-list\|passing-checks\|success-celebration\|NotesPanel" src/__tests__/dashboard-view.test.tsx`

Familiarize yourself with the existing structure before adding the new assertion.

- [ ] **Step 2: Add failing tests for Notes panel integration**

Append to the existing top-level `describe` block in `src/__tests__/dashboard-view.test.tsx`:

```typescript
  it("renders the Notes panel when validations include info results", () => {
    const validations: ValidationResult[] = [
      {
        ruleId: "license-edition",
        title: "License/Edition Notes",
        status: "info",
        message: "Community Edition detected.",
        affectedItems: ["Community"],
      },
      {
        ruleId: "vbr-version",
        title: "VBR Version Compatibility",
        status: "pass",
        message: "OK.",
        affectedItems: [],
      },
    ];

    render(
      <DashboardView
        data={MOCK_DATA}
        validations={validations}
        onReset={() => {}}
      />,
    );

    expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
    expect(screen.getByText("Community Edition detected.")).toBeInTheDocument();
  });

  it("renders the Notes panel alongside blockers when both are present", () => {
    const validations: ValidationResult[] = [
      {
        ruleId: "job-encryption",
        title: "Job Encryption Audit",
        status: "fail",
        message: "Unencrypted jobs.",
        affectedItems: ["Job B"],
      },
      {
        ruleId: "config-backup-encryption",
        title: "Configuration Backup Encryption",
        status: "skipped",
        message: "Check skipped — security summary missing.",
        affectedItems: [],
      },
    ];

    render(
      <DashboardView
        data={MOCK_DATA}
        validations={validations}
        onReset={() => {}}
      />,
    );

    expect(screen.getByTestId("blockers-list")).toBeInTheDocument();
    expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
  });
```

If `ValidationResult` and `MOCK_DATA` aren't already imported at the top of the file, add the missing imports. (Check the existing imports.)

- [ ] **Step 3: Run tests to verify failure**

Run: `npx vitest run src/__tests__/dashboard-view.test.tsx`
Expected: the two new tests fail (`notes-panel` testId not found).

- [ ] **Step 4: Wire the panel into dashboard-view.tsx**

In `src/components/dashboard/dashboard-view.tsx`:

1. Add the import (alongside the other dashboard imports near the top):

```typescript
import { NotesPanel } from "./notes-panel";
```

2. Update the Overview TabsContent (lines 185-203). Render NotesPanel both when blockers exist (between blockers and passing) and when no blockers exist (above success-celebration). The cleanest implementation: always render NotesPanel — it's a no-op when notes is empty.

```typescript
        <TabsContent
          value="overview"
          className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 space-y-6 motion-safe:data-[state=active]:duration-150"
        >
          {hasBlockers ? (
            <>
              <BlockersList blockers={blockers} />
              <NotesPanel validations={validations} />
              <PassingChecksList
                validations={validations}
                blockerCount={blockers.length}
              />
            </>
          ) : (
            <>
              <NotesPanel validations={validations} />
              <SuccessCelebration
                checksCount={validations.length}
                onViewDetails={() => setActiveTab("jobs")}
              />
            </>
          )}
        </TabsContent>
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/__tests__/dashboard-view.test.tsx`
Expected: all dashboard-view tests pass.

- [ ] **Step 6: Run the full suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Manual UI verification**

Run: `npm run dev`

Upload `veeam-healthcheck.example.json` from the project root. Verify:

- The Overview tab shows a "Note" entry for the config-backup-encryption skipped check (the sample data has all encryption enabled, so this won't actually show as skipped — instead verify by temporarily editing the sample to remove the `securitySummary` section in a copy, then re-upload).
- No console errors.
- Stop the dev server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx src/__tests__/dashboard-view.test.tsx
git commit -m "feat(dashboard): wire NotesPanel into Overview tab"
```

---

## Task 10: Update `src/lib/CLAUDE.md` validation table

**Files:**
- Modify: `src/lib/CLAUDE.md`

Update the rules table to reflect new count (12) and new ruleIds.

- [ ] **Step 1: Update the table**

In `src/lib/CLAUDE.md`, find the "VALIDATION RULES (11 total)" section. Replace it with:

```markdown
## VALIDATION RULES (12 total)

| Rule ID                          | Type    | Description                                                              |
| -------------------------------- | ------- | ------------------------------------------------------------------------ |
| vbr-version                      | blocker | VBR must be 12.1.2+                                                      |
| config-backup-encryption         | warning | VBR configuration backup must be encrypted; skipped if summary missing  |
| job-encryption                   | blocker | All jobs must have encryption enabled                                    |
| aws-workload                     | blocker | Cannot target Vault directly                                             |
| agent-standalone-unsupported     | blocker | Unmanaged agents cannot target Vault directly; use Backup Copy Jobs     |
| agent-policy-gateway-required    | warning | Managed agent policies (EpAgentPolicy, VmbApiPolicyTempJob) need Gateway |
| license-edition                  | info    | Community Edition is supported on Vault but lacks SOBR                  |
| retention-period                 | warning | Jobs should have 30+ day retention                                       |
| cap-tier-encryption              | blocker | Capacity tier must be encrypted                                          |
| sobr-immutability                | blocker | SOBR immutability must be enabled                                        |
| archive-tier-edition             | warning | Archive tier requires Enterprise Plus                                    |
| capacity-tier-residency          | warning | Capacity tier residency must be 30+ days                                 |
```

Also update any other references in the same file (e.g., the section title "11 validation rules"). Search for `11 validation rules`, `7 original + 4 SOBR`, `572 lines` and update to match. Specifically, in the STRUCTURE block near the top, the line:

```
├── validator.ts           # 11 validation rules against NormalizedDataset (572 lines). 7 original + 4 SOBR rules
```

becomes (line count may have changed — adjust as appropriate after running `wc -l src/lib/validator.ts`):

```
├── validator.ts           # 12 validation rules against NormalizedDataset. 8 core + 4 SOBR rules
```

- [ ] **Step 2: Confirm no other stale references**

Run: `grep -n "global-encryption\|agent-workload\|11 validation\|7 original" src/lib/CLAUDE.md`
Expected: no remaining matches.

- [ ] **Step 3: Commit**

```bash
git add src/lib/CLAUDE.md
git commit -m "docs(lib): refresh rules table for 12-rule validator"
```

---

## Task 11: Update `docs/validation-rules.md`

**Files:**
- Modify: `docs/validation-rules.md`

Authoritative spec doc. Update status taxonomy with `skipped`, update affected rule entries.

- [ ] **Step 1: Read the current state**

Read `docs/validation-rules.md` end-to-end to find every section affected:
- Status Taxonomy table (lines ~7-15)
- Rule Catalog — entries for `vbr-version`, the old `global-encryption`, the old `agent-workload`, `license-edition`

- [ ] **Step 2: Update the Status Taxonomy table**

Replace the table in the "Status Taxonomy" section with:

```markdown
| Status    | Meaning                                       | Icon            | Badge     | Display Location                          |
| --------- | --------------------------------------------- | --------------- | --------- | ----------------------------------------- |
| `fail`    | Hard blocker preventing Vault onboarding      | `CircleX`       | `Blocker` | Blockers list (sorted first, red styling) |
| `warning` | Actionable concern, not a hard blocker        | `TriangleAlert` | `Warning` | Blockers list (sorted after fails, amber) |
| `info`    | Advisory note (FYI, no action strictly needed) | `Info`          | `Note`    | Notes panel (neutral / grey styling)      |
| `skipped` | Check could not run due to missing input data | `CircleSlash`   | `Skipped` | Notes panel (neutral / grey styling)      |
| `pass`    | Check passed, no issues found                 | `CheckCircle2`  | `Passed`  | Passing checks list (green styling)       |
```

- [ ] **Step 3: Replace the `global-encryption` entry**

Find the section starting with `### \`global-encryption\`` and replace the entire entry with a new entry for `config-backup-encryption`. Use the same formatting as adjacent entries (e.g., `vbr-version`). The replacement entry:

```markdown
### `config-backup-encryption` -- Configuration Backup Encryption

|                       |                                                                  |
| --------------------- | ---------------------------------------------------------------- |
| **Status on failure** | `warning`                                                        |
| **Status when skipped** | `skipped` (securitySummary missing from healthcheck data)      |
| **Data source**       | `NormalizedDataset.securitySummary[0].ConfigBackupEncryptionEnabled` |

**Behavior:**

- `pass` — `ConfigBackupEncryptionEnabled === true`.
- `skipped` — `securitySummary` array is empty.
- `warning` — `ConfigBackupEncryptionEnabled === false`.

**Rationale:** VDC Vault automatically disables VBR configuration backups when they are not encrypted. Encrypting the configuration backup is a hard requirement once Vault is in use and a best practice regardless because the file contains credentials and certificates.

**Affected items:** none — single-server setting.
```

- [ ] **Step 4: Replace the `agent-workload` entry with two new entries**

Find the section starting with `### \`agent-workload\`` and delete it. Insert two new entries in the same position (preserve the rest of the file order):

```markdown
### `agent-standalone-unsupported` -- Standalone Agent Workloads

|                       |                                                  |
| --------------------- | ------------------------------------------------ |
| **Status on failure** | `fail` (blocker)                                 |
| **Data source**       | `NormalizedDataset.jobInfo[].JobType`            |
| **Detection**         | `JobType.trim().toLowerCase() === "unmanaged agent"` |

**Behavior:**

- `pass` — no jobs match.
- `fail` — one or more jobs match.

**Rationale:** Standalone (unmanaged) agents cannot target VDC Vault directly. The only supported path is a Backup Copy Job with encryption enabled.

**Affected items:** `JobName` values of matching jobs.

### `agent-policy-gateway-required` -- Managed Agent Policies

|                       |                                                                                  |
| --------------------- | -------------------------------------------------------------------------------- |
| **Status on failure** | `warning`                                                                        |
| **Data source**       | `NormalizedDataset.jobInfo[].JobType`                                            |
| **Detection**         | `JobType.trim().toLowerCase() ∈ {"epagentpolicy", "vmbapipolicytempjob"}`        |

**Behavior:**

- `pass` — no jobs match.
- `warning` — one or more jobs match.

**Rationale:** Managed agent policies can reach VDC Vault only through a VBR Gateway Server — they cannot write directly to object storage.

**Affected items:** `JobName` values of matching jobs.
```

- [ ] **Step 5: Update the `license-edition` entry's rationale**

Find the `license-edition` section and update the rationale and message snippet to reflect the new wording:

- Replace any "SOBR limitations" wording with "Community / Free editions do not include SOBR".
- Add a sentence: "VDC Vault is fully supported on Community Edition."

- [ ] **Step 6: Confirm consistency**

Run: `grep -n "global-encryption\|agent-workload" docs/validation-rules.md`
Expected: no remaining matches.

- [ ] **Step 7: Commit**

```bash
git add docs/validation-rules.md
git commit -m "docs(validation): refresh rule catalog for refactored rules"
```

---

## Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Final UI sanity check**

Run: `npm run dev`. Upload `veeam-healthcheck.example.json`. Confirm:
- Overview tab renders.
- No console errors.
- The Notes panel renders or is silent (depends on sample data state).
- Blockers, passing checks render unchanged.
Stop dev server with Ctrl+C.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin fix/validation-rules-refinement
gh pr create --title "fix(validator): refine license, encryption, agent rules" --body "$(cat <<'EOF'
## Summary

- Reframe `license-edition` info: Vault is supported on Community Edition (Community / Free lack SOBR is a side note, not a problem).
- Rename `global-encryption` → `config-backup-encryption` and narrow to only `ConfigBackupEncryptionEnabled`; introduce `skipped` status when `securitySummary` is missing.
- Split `agent-workload` into `agent-standalone-unsupported` (blocker) and `agent-policy-gateway-required` (warning); managed agent backup jobs are now silently fine.
- Add `NotesPanel` dashboard component to surface `info` + `skipped` results that were previously dropped from the UI.

See [`docs/superpowers/specs/2026-05-26-validation-rules-refinement-design.md`](docs/superpowers/specs/2026-05-26-validation-rules-refinement-design.md) for full design rationale.

## Test plan

- [ ] `npm run test:run` passes
- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds
- [ ] Manual: upload `veeam-healthcheck.example.json`, verify Overview tab renders correctly
- [ ] Manual: verify the Notes panel renders when validations include `info` or `skipped` entries

## Follow-up (out of scope)

- Update `VDCVAULT-CHEETSHEET.md` workload matrix: it currently incorrectly states managed agent jobs need a Gateway and that policies cannot target Vault. The matrix is stale.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Plan Self-Review Notes

After writing this plan, the following sanity checks were applied:

- **Spec coverage:** All four spec sections (status taxonomy, three rules, NotesPanel) are covered. Test plan items in the spec map to Tasks 1-9. Documentation updates map to Tasks 10-11.
- **Type / name consistency:** New names are used consistently — `getNoteValidations`, `config-backup-encryption`, `agent-standalone-unsupported`, `agent-policy-gateway-required`, `NotesPanel`, `notes-panel` testId.
- **Test count and rule count:** Rule count progression is tracked explicitly across Tasks 5/6/7 (11 → 12 → 13 → 12) so the `toHaveLength` assertions never drift.
- **Fixture impact:** `WARNING_RESULT` in `src/__tests__/fixtures.ts` is updated in Task 2 because `validation-selectors.test.ts` (also in Task 2) asserts on its ruleId.
- **No orphan changes:** `PIPELINE_STEPS` in `constants.ts` is intentionally untouched — the spec calls this out.
- **Placeholder scan:** No TBDs/TODOs/"appropriate handling" in the plan; every code step includes the literal code to write.
