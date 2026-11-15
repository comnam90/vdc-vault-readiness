# Job Type Label Fixes (#73, #74) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Handle the friendly JobType labels the current veeam-healthcheck tool emits. Exclude `"VMware Replication"` / `"Hyper-V Replication"` jobs (#73), and classify a bare `"Agent Standalone"` as a standalone agent (#74).

**Architecture:** Two independent, single-purpose fixes in the pure, synchronous pipeline.

- (1) Replace the exact-match `EXCLUDED_JOB_TYPES.has(jobType)` check in the normalizer with a new pure predicate, `isExcludedJobType()`, in its own module. It matches the legacy exact names case-insensitively plus any `"… Replication"` label.
- (2) Widen the standalone pattern in `agent-classifier.ts` so the OS prefix is optional.

Session data joins to jobs by `JobName` (`calculator-aggregator.ts:115-140`, `chart-selectors.ts:44-60`, `enrich-jobs.ts`). So excluding replica jobs in the normalizer also removes them from sizing, change-rate and chart aggregation, and no session-level filter is needed.

**Tech Stack:** TypeScript 5.9, Vitest 4 (`npm run test:run`), ESLint, Prettier (lint-staged), commitlint (Conventional Commits).

**Branch / worktree:** `fix/job-type-labels` at `.worktrees/fix-job-type-labels` (from `origin/main` @ `478230e`). Baseline: 57 files / 1295 tests passing.

---

## Background (read before starting)

### #73: replication jobs are no longer excluded

- `src/lib/constants.ts:7`: `export const EXCLUDED_JOB_TYPES = new Set(["Replica"]);`
- `src/lib/normalizer.ts:53`: `if (EXCLUDED_JOB_TYPES.has(jobType)) { return []; }`. This is an exact, case-sensitive match. `jobType` has already been trimmed by `normalizeString()`.
- Since 2026-05-28 (upstream `veeamhub/veeam-healthcheck` commit `9d606c7b`, ADR 0020), jobInfo `JobType` is a friendly label resolved from VBR's `TypeToString`. Replication jobs arrive as `"VMware Replication"` / `"Hyper-V Replication"` (upstream `Get-VhcJob.ps1:70-79`, `Get-VhcJob.Tests.ps1:720,1756`). Older tool versions still emit `"Replica"`.
- **Effect today:** replicas from current exports are counted in sizing and in `job-encryption`, where they're usually unencrypted and can cause a false **fail**.
- All three committed sample exports contain only the legacy `"Replica"`, so the existing tests pass without covering the new form.

### #74: bare `"Agent Standalone"` is not classified

- `src/lib/agent-classifier.ts` standalone pattern: `/^.+\s+agent\s+standalone$/`. It needs a prefix word, so `"Agent Standalone"` returns `null`, and `agent-standalone-unsupported` (`validator.ts:193`) never sees it.
- Upstream source: `AgentJobAggregator.cs` `ResolveFriendlyType` / `ToStandaloneLabel` (around lines 131-159). For `JobType == "EndpointBackup"` (standalone), the label is `TypeToString` with `" Backup"` → `" Standalone"`. When `TypeToString` is blank, the fallback produces **`"Agent Standalone"`**.

**Design decision: `legacy: false`, NOT `legacy: true`.** Issue #74 suggested adding the label to `LEGACY_EXACT` (`legacy: true`). That's wrong. `legacy: true` triggers the deprecation `console.warn` in `validateHealthcheck()` (`validator.ts:30-50`), which tells users to "regenerate your healthcheck using the latest version". `"Agent Standalone"` is produced by the **current** tool, depending on the VBR data, so regenerating doesn't change it and the warning would be misleading. Make the pattern's prefix optional instead, which returns `{ category: "standalone", legacy: false }`.

**Keep unchanged:** bare `"Agent Backup"` must stay unclassified (`null`). Per the comment in `agent-classifier.ts`, it's an old-format `jobSummary` aggregate label. Only the _standalone_ pattern gets an optional prefix.

---

## File Structure

| File                                           | Action                                                      | Responsibility                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/job-type-filter.ts`                   | **Create**                                                  | `isExcludedJobType(jobType)`: a pure predicate for job types dropped from analysis |
| `src/__tests__/job-type-filter.test.ts`        | **Create**                                                  | Unit tests for the predicate                                                       |
| `src/lib/normalizer.ts`                        | Modify `:2`, `:53`                                          | Use `isExcludedJobType` instead of `EXCLUDED_JOB_TYPES.has`                        |
| `src/__tests__/normalizer.test.ts`             | Modify (after the existing Replica tests, around `:46-110`) | Friendly-label exclusion test                                                      |
| `src/__tests__/pipeline.test.ts`               | Modify (append a `describe`)                                | End-to-end regression: a replica doesn't trip `job-encryption`                     |
| `src/lib/agent-classifier.ts`                  | Modify (standalone regex)                                   | Optional OS prefix for standalone                                                  |
| `src/__tests__/agent-classifier.test.ts`       | Modify                                                      | Bare-label tests                                                                   |
| `src/__tests__/validator.test.ts`              | Modify (inside `describe("Rule 5b: …")`, `:657`)            | Rule fires on `"Agent Standalone"` with no deprecation warning                     |
| `src/lib/AGENTS.md`, `src/__tests__/AGENTS.md` | Modify                                                      | Document the new module and test file                                              |

`EXCLUDED_JOB_TYPES` stays in `constants.ts` as the source of the exact legacy names. `constants.test.ts:28-34` asserts it's a `Set` containing `"Replica"`, so don't change its shape.

---

### Task 1: `isExcludedJobType` predicate

**Files:**

- Create: `src/lib/job-type-filter.ts`
- Test: `src/__tests__/job-type-filter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/job-type-filter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isExcludedJobType } from "@/lib/job-type-filter";

describe("isExcludedJobType", () => {
  it("excludes the legacy 'Replica' job type", () => {
    expect(isExcludedJobType("Replica")).toBe(true);
  });

  it.each([
    "VMware Replication",
    "Hyper-V Replication",
    "VMware CDP Replication",
  ])("excludes the friendly replication label '%s'", (jobType) => {
    expect(isExcludedJobType(jobType)).toBe(true);
  });

  it("excludes a bare 'Replication' label", () => {
    expect(isExcludedJobType("Replication")).toBe(true);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(isExcludedJobType("replica")).toBe(true);
    expect(isExcludedJobType("  vmware REPLICATION  ")).toBe(true);
  });

  it.each([
    "Backup",
    "VMware Backup",
    "Hyper-V Backup",
    "Backup Copy",
    "File Backup",
    "Windows Agent Standalone",
    "ReplicaSetBackup",
    "Replication Backup",
  ])("keeps the non-replica job type '%s'", (jobType) => {
    expect(isExcludedJobType(jobType)).toBe(false);
  });
});
```

The last two negatives guard against over-broad matching (a substring match or a prefix-anchored regex would wrongly exclude them).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/job-type-filter.test.ts`
Expected: FAIL. `Failed to resolve import "@/lib/job-type-filter"` (the module doesn't exist).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/job-type-filter.ts`:

```ts
import { EXCLUDED_JOB_TYPES } from "@/lib/constants";

const EXCLUDED_EXACT = new Set(
  [...EXCLUDED_JOB_TYPES].map((type) => type.toLowerCase()),
);

// Current veeam-healthcheck exports use friendly labels from VBR's
// TypeToString (e.g. "VMware Replication", "Hyper-V Replication");
// older exports use the raw "Replica". Replicas aren't backups, so they
// are excluded from sizing and validation either way.
const REPLICATION_LABEL = /(^|\s)replication$/;

export function isExcludedJobType(jobType: string): boolean {
  const normalized = jobType.trim().toLowerCase();
  return EXCLUDED_EXACT.has(normalized) || REPLICATION_LABEL.test(normalized);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/job-type-filter.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/job-type-filter.ts src/__tests__/job-type-filter.test.ts
git commit -m "feat(lib): add isExcludedJobType predicate for friendly replication labels"
```

(This is `feat` because it's a new module with no user-visible effect yet. The user-visible fix is Task 2.)

---

### Task 2: Normalizer excludes friendly replication labels (#73)

**Files:**

- Modify: `src/lib/normalizer.ts:2` (import), `src/lib/normalizer.ts:53` (check)
- Test: `src/__tests__/normalizer.test.ts` (add after the existing `"excludes all Replica jobs when multiple Replica jobs exist"` test)

- [ ] **Step 1: Write the failing test**

Add inside `describe("normalizeHealthcheck", …)` in `src/__tests__/normalizer.test.ts`, directly after the existing Replica tests:

```ts
it("excludes friendly-label replication jobs emitted by current healthcheck exports", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [],
    securitySummary: [],
    jobInfo: [
      {
        JobName: "VM Replica",
        JobType: "VMware Replication",
        Encrypted: "False",
        RepoName: "Repo1",
      },
      {
        JobName: "HV Replica",
        JobType: "Hyper-V Replication",
        Encrypted: "False",
        RepoName: "Repo1",
      },
      {
        JobName: "Job B",
        JobType: "VMware Backup",
        Encrypted: "True",
        RepoName: "Repo2",
      },
    ],
    Licenses: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.jobInfo.map((j) => j.JobName)).toEqual(["Job B"]);
  expect(result.dataErrors).toHaveLength(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/normalizer.test.ts -t "friendly-label replication"`
Expected: FAIL. `expected [ 'VM Replica', 'HV Replica', 'Job B' ] to deeply equal [ 'Job B' ]`.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/normalizer.ts`, replace the import on line 2:

```ts
import { EXCLUDED_JOB_TYPES } from "@/lib/constants";
```

with:

```ts
import { isExcludedJobType } from "@/lib/job-type-filter";
```

and replace the check at line 53:

```ts
if (EXCLUDED_JOB_TYPES.has(jobType)) {
  return [];
}
```

with:

```ts
if (isExcludedJobType(jobType)) {
  return [];
}
```

Then confirm nothing else in the normalizer uses `EXCLUDED_JOB_TYPES`: `grep -n EXCLUDED_JOB_TYPES src/lib/normalizer.ts` should print nothing.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/normalizer.test.ts src/__tests__/pipeline.test.ts src/__tests__/constants.test.ts`
Expected: PASS. The existing `"Replica"` tests (`normalizer.test.ts:46+`, `pipeline.test.ts:66` "20 raw jobs minus 2 Replica jobs = 18") still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalizer.ts src/__tests__/normalizer.test.ts
git commit -m "fix(normalizer): exclude friendly-label replication jobs (#73)"
```

---

### Task 3: End-to-end regression: replicas don't affect validation (#73)

**Files:**

- Test: `src/__tests__/pipeline.test.ts` (append a new top-level `describe` at the end of the file; `analyzeHealthcheck` and `HealthcheckRoot` are already imported at `:11-12`)

This test should pass straight away after Task 2. It's a regression guard showing that the user-visible symptom (a false `job-encryption` fail) is gone. Check it really guards the fix: temporarily revert the `normalizer.ts:53` change, watch it fail, then restore the change.

- [ ] **Step 1: Write the regression test**

Append to `src/__tests__/pipeline.test.ts`:

```ts
describe("friendly replication labels (veeam-healthcheck ADR 0020 format)", () => {
  const raw: HealthcheckRoot = {
    Licenses: [],
    Sections: {
      backupServer: {
        Headers: ["Name", "Version"],
        Rows: [["VBR-01", "13.0.1.2067"]],
      },
      securitySummary: {
        Headers: [
          "BackupFileEncryptionEnabled",
          "ConfigBackupEncryptionEnabled",
        ],
        Rows: [["True", "True"]],
      },
      jobInfo: {
        Headers: ["JobName", "JobType", "Encrypted", "RepoName", "RetainDays"],
        Rows: [
          ["VM Backup", "VMware Backup", "True", "Repo1", "30"],
          ["VM Replica", "VMware Replication", "False", "Repo1", "7"],
          ["HV Replica", "Hyper-V Replication", "False", "Repo1", "7"],
        ],
      },
    },
  };

  it("drops replica jobs so they cannot fail job-encryption or retention", () => {
    const { data, validations } = analyzeHealthcheck(raw);
    const status = (ruleId: string) =>
      validations.find((v) => v.ruleId === ruleId)?.status;

    expect(data.jobInfo.map((j) => j.JobName)).toEqual(["VM Backup"]);
    expect(status("job-encryption")).toBe("pass");
    expect(status("retention-period")).toBe("pass");
  });
});
```

- [ ] **Step 2: Prove that the test guards the fix**

Temporarily change `src/lib/normalizer.ts` line 53 back to `if (jobType === "Replica") {`.
Run: `npx vitest run src/__tests__/pipeline.test.ts -t "friendly replication"`
Expected: FAIL (`job-encryption` is `"fail"`, and `data.jobInfo` has 3 jobs).
**Restore** `if (isExcludedJobType(jobType)) {` and confirm with `git diff src/lib/normalizer.ts` that only the Task 2 change remains.

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/pipeline.test.ts`
Expected: PASS (all tests).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/pipeline.test.ts
git commit -m "test(pipeline): guard against replica jobs affecting validation (#73)"
```

---

### Task 4: Classifier recognises bare "Agent Standalone" (#74)

**Files:**

- Modify: `src/lib/agent-classifier.ts` (the `PATTERNS` standalone entry)
- Test: `src/__tests__/agent-classifier.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/agent-classifier.test.ts`, add inside `describe("new-format matches (pattern)", …)` after `"matches arbitrary platform prefixes (Linux, Mac)"`:

```ts
it("classifies bare 'Agent Standalone' as standalone, not legacy", () => {
  // Emitted by current veeam-healthcheck when VBR returns a blank
  // TypeToString for an EndpointBackup job (AgentJobAggregator.ToStandaloneLabel).
  expect(classifyAgentJobType("Agent Standalone")).toEqual({
    category: "standalone",
    legacy: false,
  });
});

it("classifies bare 'Agent Standalone' case-insensitively with surrounding whitespace", () => {
  expect(classifyAgentJobType("  agent standalone ")).toEqual({
    category: "standalone",
    legacy: false,
  });
});

it("still leaves bare 'Agent Backup' unclassified (jobSummary aggregate label)", () => {
  expect(classifyAgentJobType("Agent Backup")).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/agent-classifier.test.ts`
Expected: the two `'Agent Standalone'` tests FAIL (`expected null to deeply equal { category: 'standalone', legacy: false }`). The `'Agent Backup'` test PASSES; it's a guard that must keep passing.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/agent-classifier.ts`, change only the standalone entry in `PATTERNS`:

```ts
  { regex: /^.+\s+agent\s+standalone$/, category: "standalone" },
```

to:

```ts
  // OS prefix optional: veeam-healthcheck emits a bare "Agent Standalone"
  // when VBR returns a blank TypeToString for an EndpointBackup job.
  { regex: /^(?:.+\s+)?agent\s+standalone$/, category: "standalone" },
```

Leave the `policy` and `managed-backup` patterns unchanged (bare "Agent Backup" must stay `null`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/agent-classifier.test.ts`
Expected: PASS (all tests, including the existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-classifier.ts src/__tests__/agent-classifier.test.ts
git commit -m "fix(validator): classify bare 'Agent Standalone' job type as standalone (#74)"
```

---

### Task 5: Validator flags "Agent Standalone" jobs without a deprecation warning (#74)

**Files:**

- Test: `src/__tests__/validator.test.ts`, inside `describe("Rule 5b: Standalone Agent Workloads (agent-standalone-unsupported)", …)` (starts at `:657`). Use the local helpers already defined in that block: `makeStandaloneDataWithJobs(jobSummary, jobInfo)` and `makeJobRow(overrides)`.

These tests should pass straight away after Task 4. They pin the rule-level behaviour, including the deliberate "no deprecation warning" decision. Check they really guard the fix: temporarily revert the Task 4 regex, watch them fail, then restore it.

- [ ] **Step 1: Write the tests**

Check the top of `src/__tests__/validator.test.ts` imports `vi` from `vitest`. If it doesn't, add it to the existing import. Then add inside the Rule 5b `describe` block, after the last existing test:

```ts
it("fails for a jobInfo row with bare 'Agent Standalone' JobType", () => {
  const data = makeStandaloneDataWithJobs(
    [],
    [makeJobRow({ JobName: "Laptop-01", JobType: "Agent Standalone" })],
  );

  const results = validateHealthcheck(data);
  const check = results.find(
    (r) => r.ruleId === "agent-standalone-unsupported",
  );

  expect(check?.status).toBe("fail");
  expect(check?.affectedItems).toEqual(["Laptop-01"]);
  expect(check?.message).toContain("1 standalone");
});

it("does not emit the legacy deprecation warning for bare 'Agent Standalone'", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    validateHealthcheck(
      makeStandaloneDataWithJobs(
        [{ JobType: "Agent Standalone", Count: 1 }],
        [makeJobRow({ JobName: "Laptop-01", JobType: "Agent Standalone" })],
      ),
    );
    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});
```

- [ ] **Step 2: Prove that the tests guard the fix**

Temporarily revert the standalone regex in `src/lib/agent-classifier.ts` to `/^.+\s+agent\s+standalone$/`.
Run: `npx vitest run src/__tests__/validator.test.ts -t "Agent Standalone"`
Expected: the first test FAILS (`status` is `"pass"`). The second passes either way, because it guards against the `legacy: true` alternative.
Also check the second test catches that alternative: temporarily add `["agent standalone", "standalone"]` to `LEGACY_EXACT`, run again, and expect the deprecation test to FAIL.
**Restore** both changes. `git diff src/lib/agent-classifier.ts` should show only the Task 4 change.

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/validator.test.ts src/__tests__/agent-classifier.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/validator.test.ts
git commit -m "test(validator): cover bare 'Agent Standalone' in agent-standalone-unsupported (#74)"
```

---

### Task 6: Update agent docs (AGENTS.md)

**Files:**

- Modify: `src/lib/AGENTS.md` (`src/lib/CLAUDE.md` is a symlink, so don't edit it separately)
- Modify: `src/__tests__/AGENTS.md`

- [ ] **Step 1: Update `src/lib/AGENTS.md`**

In the `STRUCTURE` block, under `# Core pipeline (pure, synchronous)`, add this line after the `agent-classifier.ts` line:

```
├── job-type-filter.ts     # isExcludedJobType(): drops replica jobs — legacy "Replica" + friendly "… Replication" labels (case-insensitive)
```

In the `WHERE TO LOOK` table, add this row after the "Agent JobType classifier" row:

```
| Excluded job types       | job-type-filter.ts       | isExcludedJobType() — used by normalizer.ts; exact names come from EXCLUDED_JOB_TYPES in constants.ts                       |
```

Update the "Agent JobType classifier" row's Notes to: `Pure pattern match for {OS} Agent {Standalone,Policy,Backup} (OS prefix optional for Standalone only) + legacy exact strings. Used by validator.ts only.`

In `CONVENTIONS`, add this bullet:

```
- **JobType labels**: Current veeam-healthcheck exports use friendly labels from VBR TypeToString ("VMware Backup", "VMware Replication", "Windows Agent Standalone", bare "Agent Standalone"); older exports use raw enums ("Backup", "Replica", "EpAgentBackup"). Handle both forms; only mark a label `legacy: true` in agent-classifier if regenerating with the current tool would change it.
```

- [ ] **Step 2: Update `src/__tests__/AGENTS.md`**

In the `STRUCTURE` block, under `# Pipeline / logic`, add after the `agent-classifier.test.ts` line:

```
├── job-type-filter.test.ts           # isExcludedJobType(): legacy + friendly replication labels, negatives
```

Update the header line's test counts to the actual numbers from `npm run test:run` (Task 7 Step 1). The current header still says "1267 tests across 57 test files", which is stale.

- [ ] **Step 3: Commit**

```bash
git add src/lib/AGENTS.md src/__tests__/AGENTS.md
git commit -m "docs(agents): document job-type-filter and friendly JobType labels"
```

---

### Task 7: Verification and PR

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: 58 test files pass (57 + `job-type-filter.test.ts`), 0 failures. Record the total test count for Task 6 Step 2 and the PR description. If Task 6 used a placeholder count, fix it now and amend that docs commit.

- [ ] **Step 2: Lint and typecheck/build**

Run: `npm run lint` then `npm run build`
Expected: lint has 0 errors (the 2 `react-hooks/incompatible-library` warnings on TanStack Table are already on `main`), and the build ends with `✓ built in …`.

- [ ] **Step 3: Confirm no stray reverts from the "prove the test guards" steps**

Run: `git diff origin/main --stat` and `git status`
Expected: a clean tree. The diff touches only the files listed in **File Structure** plus this plan.

- [ ] **Step 4: Commit the plan file** (if not already committed)

```bash
git add docs/superpowers/plans/2026-11-15-job-type-label-fixes.md
git commit -m "docs(plans): add job type label fixes plan (#73, #74)"
```

- [ ] **Step 5: Push and open the PR** (only with the user's go-ahead)

```bash
git push -u origin fix/job-type-labels
gh pr create --base main --title "fix: handle friendly JobType labels — exclude replication jobs, detect bare Agent Standalone" --body "<summary, test plan, Closes #73, Closes #74>"
```

The PR body must explain why `"Agent Standalone"` is `legacy: false`, which differs from the suggestion in #74.

- [ ] **Step 6: Follow-up comment on #74**

Comment on issue #74 noting the `legacy: false` decision and why (the current tool emits the label, so the deprecation warning would be misleading).

---

## Out of scope (tracked elsewhere)

- Rule severity changes for `agent-standalone-unsupported` (#76): this plan changes detection only.
- Refreshing sample exports to the current schema (#83).
- Mock engine friendly labels and replica scenarios (#87): PR #31's builder doesn't depend on this branch.
- `jobSummary` rows with replication labels: these only feed agent counts in `agent-standalone-unsupported`, so no change is needed.
