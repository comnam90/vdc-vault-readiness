# Active Full Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `warning` validation rule that flags jobs with `ActiveFullEnabled: true`, because the VDC Vault sizing calculator assumes Synthetic Full backups and Active Full runs consume significantly more storage.

**Architecture:** A single private function `validateActiveFull(data)` added to `src/lib/validator.ts`, called from the existing `validateHealthcheck()` orchestrator. No new files, no UI changes — the warning status is already rendered by `BlockersList`.

**Tech Stack:** TypeScript, Vitest

---

## Working branch

All work happens on `feature/active-full-warning` (already created, contains the design spec commit).

```bash
git checkout feature/active-full-warning
```

---

## Task 1: Write failing tests

**Files:**

- Modify: `src/__tests__/validator.test.ts` (append new `describe` block at the end of the file)

The test pattern in this project: construct a minimal `NormalizedDataset`, call `validateHealthcheck(data)`, find the rule by `ruleId`, assert `status` and `affectedItems`.

All `NormalizedDataset` objects require these fields: `backupServer`, `securitySummary`, `jobInfo`, `Licenses`, `jobSummary`, `dataErrors`, `jobSessionSummary`, `sobr`, `capExtents`, `extents`, `archExtents`, `repos`.

A minimal `SafeJob` (all nullable fields set to `null` except those under test):

```typescript
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
  ActiveFullEnabled: null,  // ← the field under test
  SyntheticFullEnabled: null,
  BackupChainType: null,
  IndexingEnabled: null,
}
```

- [ ] **Step 1: Append this describe block to the end of `src/__tests__/validator.test.ts`**

```typescript
describe("Rule 13: Active Full Warning", () => {
  function makeMinimalJob(
    name: string,
    activeFull: boolean | null,
  ): NormalizedDataset["jobInfo"][number] {
    return {
      JobName: name,
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo1",
      RetainDays: 30,
      GfsDetails: null,
      SourceSizeGB: null,
      OnDiskGB: null,
      RetentionScheme: null,
      CompressionLevel: null,
      BlockSize: null,
      GfsEnabled: null,
      ActiveFullEnabled: activeFull,
      SyntheticFullEnabled: null,
      BackupChainType: null,
      IndexingEnabled: null,
    };
  }

  function baseDataset(jobs: NormalizedDataset["jobInfo"]): NormalizedDataset {
    return {
      backupServer: [{ Version: "13.0.1.1071", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: true,
        },
      ],
      jobInfo: jobs,
      Licenses: [],
      jobSummary: [],
      dataErrors: [],
      jobSessionSummary: [],
      sobr: [],
      capExtents: [],
      extents: [],
      archExtents: [],
      repos: [],
    };
  }

  it("passes when no jobs have ActiveFullEnabled true", () => {
    const data = baseDataset([makeMinimalJob("Job A", false)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("pass");
    expect(rule?.affectedItems).toHaveLength(0);
  });

  it("passes when ActiveFullEnabled is null on all jobs", () => {
    const data = baseDataset([makeMinimalJob("Job A", null)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("pass");
    expect(rule?.affectedItems).toHaveLength(0);
  });

  it("warns when one job has ActiveFullEnabled true", () => {
    const data = baseDataset([makeMinimalJob("Job A", true)]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("warning");
    expect(rule?.title).toBe("Active Full Backup Schedules");
    expect(rule?.message).toContain("Active Full");
    expect(rule?.message).toContain("Synthetic Full");
    expect(rule?.affectedItems).toEqual(["Job A"]);
  });

  it("warns for all affected jobs when multiple have ActiveFullEnabled true", () => {
    const data = baseDataset([
      makeMinimalJob("Job A", true),
      makeMinimalJob("Job B", false),
      makeMinimalJob("Job C", true),
    ]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("warning");
    expect(rule?.affectedItems).toEqual(["Job A", "Job C"]);
    expect(rule?.affectedItems).not.toContain("Job B");
  });

  it("skips when jobInfo is empty", () => {
    const data = baseDataset([]);
    const results = validateHealthcheck(data);
    const rule = results.find((r) => r.ruleId === "active-full-enabled");

    expect(rule).toBeDefined();
    expect(rule?.status).toBe("skipped");
    expect(rule?.affectedItems).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test:run -- --reporter=verbose src/__tests__/validator.test.ts
```

Expected: 5 new tests fail with something like `Cannot find rule "active-full-enabled"` (rule returns `undefined`). All pre-existing tests in the file should still pass.

---

## Task 2: Implement validateActiveFull

**Files:**

- Modify: `src/lib/validator.ts`

Two changes: (1) add the `validateActiveFull` function, (2) call it from `validateHealthcheck`.

- [ ] **Step 1: Add `validateActiveFull` to `src/lib/validator.ts`**

Insert this function anywhere before the closing of the file (e.g. after `validateCapacityTierResidency`):

```typescript
function validateActiveFull(data: NormalizedDataset): ValidationResult {
  if (data.jobInfo.length === 0) {
    return {
      ruleId: "active-full-enabled",
      title: "Active Full Backup Schedules",
      status: "skipped",
      message:
        "Active Full check skipped — no job data found in the healthcheck.",
      affectedItems: [],
    };
  }

  const affected = data.jobInfo.filter((job) => job.ActiveFullEnabled === true);

  if (affected.length > 0) {
    return {
      ruleId: "active-full-enabled",
      title: "Active Full Backup Schedules",
      status: "warning",
      message: `${affected.length} job(s) have Active Full enabled. The VDC Vault sizing calculator assumes Synthetic Full backups. Active Full runs create a complete new backup chain on each execution, consuming significantly more storage than the calculator estimates.`,
      affectedItems: affected.map((job) => job.JobName),
    };
  }

  return {
    ruleId: "active-full-enabled",
    title: "Active Full Backup Schedules",
    status: "pass",
    message:
      "No jobs have Active Full enabled. Sizing estimates assume Synthetic Full backups.",
    affectedItems: [],
  };
}
```

- [ ] **Step 2: Register the rule in `validateHealthcheck`**

In the `results` array inside `validateHealthcheck` (currently lines 15–28), append `validateActiveFull(data)`:

```typescript
export function validateHealthcheck(
  data: NormalizedDataset,
): ValidationResult[] {
  const results: ValidationResult[] = [
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
    validateActiveFull(data),           // ← add this line
  ];
  // ... rest of function unchanged
```

- [ ] **Step 3: Run the targeted tests to confirm they pass**

```bash
npm run test:run -- --reporter=verbose src/__tests__/validator.test.ts
```

Expected: all tests in the file pass, including the 5 new ones.

- [ ] **Step 4: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass. If `pipeline.test.ts` fails (it runs against real sample data), check whether the example JSON has jobs with `ActiveFullEnabled: true` — if it does, the pipeline test's expected validation count or statuses may need updating.

- [ ] **Step 5: Run the build**

```bash
npm run build
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts
git commit -m "feat(validator): warn when jobs have Active Full enabled"
```

---

## Self-review checklist

- [x] **Spec coverage:** warning/pass/skipped conditions all covered, message copy matches spec, affectedItems list tested
- [x] **No placeholders:** all test code and implementation code is complete
- [x] **Type consistency:** `NormalizedDataset["jobInfo"][number]` used in helper matches `SafeJob`; `ruleId` string is consistent across all return sites
