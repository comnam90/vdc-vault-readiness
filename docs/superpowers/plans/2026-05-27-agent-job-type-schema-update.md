# Agent Job Type Schema Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the two agent-related validation rules so they keep working when the upcoming `veeam-healthcheck` tool emits a new platform-prefixed JobType vocabulary. Support both old and new formats during a transition window; warn once when legacy strings are detected.

**Architecture:** A new pure module `src/lib/agent-classifier.ts` centralises agent JobType naming knowledge (pattern matching for new format + exact-match allow-list for legacy strings). Both agent validation rules call the classifier instead of inlining their own string matching. `validateHealthcheck()` does a single side-scan for legacy classifications after running the rules and emits one `console.warn` per run if any are found.

**Tech Stack:** TypeScript 5.9 (strict), Vitest 3 with `vi.spyOn`, no new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-27-agent-job-type-schema-update-design.md`

**Branch:** `fix/agent-job-type-schema-update`

---

## File Structure

| File                                     | Action     | Responsibility                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/agent-classifier.ts`            | **CREATE** | Pure function `classifyAgentJobType()` returning `AgentClassification \| null`. Owns the naming-knowledge for agent JobTypes (patterns + legacy allow-list). Imported by `validator.ts` only.                                                                                                                                                                              |
| `src/lib/validator.ts`                   | **MODIFY** | `validateAgentStandaloneUnsupported` reads both `jobInfo` and `jobSummary` via the classifier; populates `affectedItems` with job names when `jobInfo` matches exist. `validateAgentPolicyGatewayRequired` swaps its inline `POLICY_TYPES` set for a classifier call. `validateHealthcheck()` side-scans for legacy classifications and emits one `console.warn` per call. |
| `src/__tests__/agent-classifier.test.ts` | **CREATE** | Full unit coverage for the classifier — new-format patterns, legacy strings, case/whitespace, non-matches, edge cases.                                                                                                                                                                                                                                                     |
| `src/__tests__/validator.test.ts`        | **MODIFY** | Add new-format assertions for both agent rules; keep all existing legacy-string tests. Add `console.warn` spy assertions for the deprecation warning.                                                                                                                                                                                                                      |
| `src/__tests__/pipeline.test.ts`         | **MODIFY** | Add new-format end-to-end describe block. Add `console.warn` spy assertion to the existing legacy `EpAgentBackup`/`EpAgentPolicy` block.                                                                                                                                                                                                                                   |
| `src/lib/CLAUDE.md`                      | **MODIFY** | Add `agent-classifier.ts` row to the `STRUCTURE` and `WHERE TO LOOK` tables.                                                                                                                                                                                                                                                                                               |

**Files explicitly NOT changed:** `src/lib/normalizer.ts`, `src/types/domain.ts`, `src/__tests__/fixtures.ts`, `src/__tests__/normalizer.test.ts`, `veeam-healthcheck.example.json`, any UI component, any chart, any selector. The classifier is pure string interpretation; the validator's `ValidationResult` shape is preserved.

---

### Note on the deprecation-warning implementation

The spec's "Deprecation Warning" section sketched a `noteLegacy()` callback threaded through each rule. This plan implements the equivalent design intent via a **single side-scan** at the end of `validateHealthcheck()`:

```ts
const sawLegacy =
  data.jobInfo.some(
    (job) => classifyAgentJobType(job.JobType)?.legacy === true,
  ) ||
  data.jobSummary.some(
    (row) => classifyAgentJobType(row.JobType)?.legacy === true,
  );
if (sawLegacy) console.warn(/* … */);
```

Same behaviour (one warning per call, only when legacy strings are present), but the rule functions stay pure and don't need a new parameter. The re-classification cost is negligible at our data sizes (every Veeam env is well under 1k jobs).

---

## Task 1: Create `agent-classifier` module

**Files:**

- Create: `src/lib/agent-classifier.ts`
- Create: `src/__tests__/agent-classifier.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/__tests__/agent-classifier.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyAgentJobType } from "@/lib/agent-classifier";

describe("classifyAgentJobType", () => {
  describe("new-format matches (pattern)", () => {
    it("classifies 'Windows Agent Standalone' as standalone, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Standalone")).toEqual({
        category: "standalone",
        legacy: false,
      });
    });

    it("classifies 'Windows Agent Policy' as policy, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Policy")).toEqual({
        category: "policy",
        legacy: false,
      });
    });

    it("classifies 'Windows Agent Backup' as managed-backup, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Backup")).toEqual({
        category: "managed-backup",
        legacy: false,
      });
    });

    it("matches arbitrary platform prefixes (Linux, Mac)", () => {
      expect(classifyAgentJobType("Linux Agent Standalone")).toEqual({
        category: "standalone",
        legacy: false,
      });
      expect(classifyAgentJobType("Mac Agent Policy")).toEqual({
        category: "policy",
        legacy: false,
      });
    });
  });

  describe("legacy matches (exact strings)", () => {
    it("classifies 'EpAgentPolicy' as policy with legacy=true", () => {
      expect(classifyAgentJobType("EpAgentPolicy")).toEqual({
        category: "policy",
        legacy: true,
      });
    });

    it("classifies 'VmbapiPolicyTempJob' as policy with legacy=true", () => {
      expect(classifyAgentJobType("VmbapiPolicyTempJob")).toEqual({
        category: "policy",
        legacy: true,
      });
    });

    it("classifies 'EpAgentBackup' as managed-backup with legacy=true", () => {
      expect(classifyAgentJobType("EpAgentBackup")).toEqual({
        category: "managed-backup",
        legacy: true,
      });
    });

    it("classifies 'Unmanaged Agent' as standalone with legacy=true", () => {
      expect(classifyAgentJobType("Unmanaged Agent")).toEqual({
        category: "standalone",
        legacy: true,
      });
    });
  });

  describe("case and whitespace handling", () => {
    it("matches case-insensitively (legacy)", () => {
      expect(classifyAgentJobType("unmanaged agent")?.category).toBe(
        "standalone",
      );
      expect(classifyAgentJobType("EPAGENTPOLICY")?.category).toBe("policy");
    });

    it("matches case-insensitively (new format)", () => {
      expect(classifyAgentJobType("windows agent POLICY")?.category).toBe(
        "policy",
      );
    });

    it("trims surrounding whitespace", () => {
      expect(
        classifyAgentJobType("  Windows Agent Standalone  ")?.category,
      ).toBe("standalone");
      expect(classifyAgentJobType("  EpAgentPolicy  ")?.category).toBe(
        "policy",
      );
    });
  });

  describe("non-matches", () => {
    it.each([
      ["Backup"],
      ["Backup Copy"],
      ["VMware Backup"],
      ["File Backup"],
      ["Replica"],
      ["Endpoint Backup"],
      ["Agent"],
      ["Agent Standalone"], // no platform prefix
      ["Agent Policy"], // no platform prefix
      ["AgentPolicy"], // no whitespace separator
      ["WindowsAgentPolicy"], // no whitespace separator
    ])("returns null for non-agent JobType %j", (jobType) => {
      expect(classifyAgentJobType(jobType)).toBeNull();
    });

    it("returns null for null", () => {
      expect(classifyAgentJobType(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(classifyAgentJobType(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(classifyAgentJobType("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(classifyAgentJobType("   ")).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:run -- src/__tests__/agent-classifier.test.ts`

Expected: failure with a module-not-found error for `@/lib/agent-classifier`.

- [ ] **Step 3: Create the classifier module**

Create `src/lib/agent-classifier.ts`:

```ts
export type AgentCategory = "standalone" | "policy" | "managed-backup";

export interface AgentClassification {
  category: AgentCategory;
  legacy: boolean;
}

const LEGACY_EXACT: ReadonlyMap<string, AgentCategory> = new Map([
  ["unmanaged agent", "standalone"],
  ["epagentpolicy", "policy"],
  ["vmbapipolicytempjob", "policy"],
  ["epagentbackup", "managed-backup"],
]);

const PATTERNS: ReadonlyArray<{ regex: RegExp; category: AgentCategory }> = [
  { regex: /^.+\s+agent\s+standalone$/, category: "standalone" },
  { regex: /^.+\s+agent\s+policy$/, category: "policy" },
  { regex: /^.+\s+agent\s+backup$/, category: "managed-backup" },
];

export function classifyAgentJobType(
  jobType: string | null | undefined,
): AgentClassification | null {
  if (jobType === null || jobType === undefined) return null;

  const normalized = jobType.trim().toLowerCase();
  if (normalized.length === 0) return null;

  const legacyCategory = LEGACY_EXACT.get(normalized);
  if (legacyCategory !== undefined) {
    return { category: legacyCategory, legacy: true };
  }

  for (const { regex, category } of PATTERNS) {
    if (regex.test(normalized)) {
      return { category, legacy: false };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test:run -- src/__tests__/agent-classifier.test.ts`

Expected: PASS, all describes green.

- [ ] **Step 5: Lint and typecheck the new files**

Run: `npm run lint`

Expected: clean (no errors on the new files).

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent-classifier.ts src/__tests__/agent-classifier.test.ts
git commit -m "feat(validator): add agent job type classifier

Centralises the naming knowledge for Veeam agent JobTypes: a pure
function that recognises both the new platform-prefixed format
(Windows/Linux/Mac Agent Standalone/Policy/Backup) and the legacy
strings (EpAgentPolicy, VmbapiPolicyTempJob, EpAgentBackup,
Unmanaged Agent). Legacy matches are flagged so the validator can
emit a single deprecation warning per healthcheck run.

Refs docs/superpowers/specs/2026-05-27-agent-job-type-schema-update-design.md"
```

---

## Task 2: Update `validateAgentPolicyGatewayRequired` to use classifier

**Files:**

- Modify: `src/lib/validator.ts` (function at lines ~195–222)
- Modify: `src/__tests__/validator.test.ts` (`describe("Rule 5c: Managed Agent Policies …")` block)

- [ ] **Step 1: Add the failing test for new-format policy detection**

In `src/__tests__/validator.test.ts`, locate the `describe("Rule 5c: Managed Agent Policies (agent-policy-gateway-required)", () => {` block and add this test alongside the existing ones:

```ts
it("warns when a job has 'Windows Agent Policy' as JobType (new format)", () => {
  const data: NormalizedDataset = {
    backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
    securitySummary: [
      {
        BackupFileEncryptionEnabled: true,
        ConfigBackupEncryptionEnabled: true,
      },
    ],
    jobInfo: [
      {
        JobName: "Managed-WindowsAgents-Policy",
        JobType: "Windows Agent Policy",
        Encrypted: true,
        RepoName: "BackupRepo1",
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
    jobSummary: [],
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
  expect(check?.affectedItems).toEqual(["Managed-WindowsAgents-Policy"]);
});

it("matches Linux/Mac agent policy variants via platform-agnostic pattern", () => {
  const data: NormalizedDataset = {
    backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
    securitySummary: [
      {
        BackupFileEncryptionEnabled: true,
        ConfigBackupEncryptionEnabled: true,
      },
    ],
    jobInfo: [
      {
        JobName: "LinuxPolicy",
        JobType: "Linux Agent Policy",
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
    jobSummary: [],
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
  expect(check?.affectedItems).toEqual(["LinuxPolicy"]);
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "Managed Agent Policies"`

Expected: the two new `it` blocks FAIL — current implementation's `Set(["epagentpolicy", "vmbapipolicytempjob"])` doesn't match `"windows agent policy"` or `"linux agent policy"`, so the rule returns `"pass"` instead of `"warning"`. Existing legacy tests still PASS.

- [ ] **Step 3: Update `validateAgentPolicyGatewayRequired` in `src/lib/validator.ts`**

At the top of the file, add the import (alongside the existing imports):

```ts
import { classifyAgentJobType } from "./agent-classifier";
```

Replace the body of `validateAgentPolicyGatewayRequired` (lines ~195–222) with:

```ts
function validateAgentPolicyGatewayRequired(
  data: NormalizedDataset,
): ValidationResult {
  const matches = data.jobInfo.filter(
    (job) => classifyAgentJobType(job.JobType)?.category === "policy",
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

(Title, status, message, and `affectedItems` shape are preserved exactly; only the matching predicate changes.)

- [ ] **Step 4: Run the policy-rule tests and verify all pass**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "Managed Agent Policies"`

Expected: all tests in the block PASS — new `Windows Agent Policy` / `Linux Agent Policy` cases, and existing `EpAgentPolicy` / `VmbApiPolicyTempJob` legacy cases.

- [ ] **Step 5: Run the full validator test file to confirm no collateral damage**

Run: `npm run test:run -- src/__tests__/validator.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts
git commit -m "fix(validator): use agent classifier in policy-gateway rule

Replaces the inline POLICY_TYPES set with classifyAgentJobType(), so
'Windows Agent Policy' (and future Linux/Mac variants) emitted by the
updated veeam-healthcheck tool trigger the rule alongside the existing
'EpAgentPolicy' / 'VmbapiPolicyTempJob' legacy strings."
```

---

## Task 3: Update `validateAgentStandaloneUnsupported` to read both sources

**Files:**

- Modify: `src/lib/validator.ts` (function at lines ~168–193)
- Modify: `src/__tests__/validator.test.ts` (`describe("Rule 5b: Standalone Agent Workloads …")` block)

- [ ] **Step 1: Add the failing tests for new-format standalone detection**

In `src/__tests__/validator.test.ts`, locate the `describe("Rule 5b: Standalone Agent Workloads (agent-standalone-unsupported)", () => {` block. The block defines a local `makeStandaloneData(jobSummary)` helper that always sets `jobInfo: []` — we need a separate fixture builder that also takes `jobInfo`. Add this **helper** inside the same `describe` block, just below the existing `makeStandaloneData`:

```ts
function makeStandaloneDataWithJobs(
  jobSummary: NormalizedDataset["jobSummary"],
  jobInfo: NormalizedDataset["jobInfo"],
): NormalizedDataset {
  return {
    backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
    securitySummary: [
      {
        BackupFileEncryptionEnabled: true,
        ConfigBackupEncryptionEnabled: true,
      },
    ],
    jobInfo,
    Licenses: [],
    jobSummary,
    dataErrors: [],
    jobSessionSummary: [],
    sobr: [],
    capExtents: [],
    extents: [],
    archExtents: [],
    repos: [],
  };
}

function makeJobRow(
  overrides: Partial<NormalizedDataset["jobInfo"][number]> = {},
): NormalizedDataset["jobInfo"][number] {
  return {
    JobName: "TestJob",
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
    ...overrides,
  };
}
```

Then add these new `it` blocks alongside the existing ones in the same describe:

```ts
it("fails when jobSummary has 'Windows Agent Standalone' (new-format, count-only fallback)", () => {
  const data = makeStandaloneData([
    { JobType: "Windows Agent Standalone", Count: 3 },
  ]);

  const results = validateHealthcheck(data);
  const check = results.find(
    (r) => r.ruleId === "agent-standalone-unsupported",
  );

  expect(check?.status).toBe("fail");
  expect(check?.affectedItems).toEqual([]);
  expect(check?.message).toContain("3 standalone");
  expect(check?.message).toContain("jobs detected");
});

it("fails with named affectedItems when jobInfo has 'Windows Agent Standalone' rows", () => {
  const data = makeStandaloneDataWithJobs(
    [],
    [
      makeJobRow({
        JobName: "Unmanaged-WindowsAgents-VTESTVM03",
        JobType: "Windows Agent Standalone",
      }),
      makeJobRow({
        JobName: "Unmanaged-WindowsAgents-VTESTVM04",
        JobType: "Windows Agent Standalone",
      }),
    ],
  );

  const results = validateHealthcheck(data);
  const check = results.find(
    (r) => r.ruleId === "agent-standalone-unsupported",
  );

  expect(check?.status).toBe("fail");
  expect(check?.affectedItems).toEqual([
    "Unmanaged-WindowsAgents-VTESTVM03",
    "Unmanaged-WindowsAgents-VTESTVM04",
  ]);
  expect(check?.message).toContain("2 standalone");
});

it("uses singular grammar when exactly one standalone job is in jobInfo", () => {
  const data = makeStandaloneDataWithJobs(
    [],
    [
      makeJobRow({
        JobName: "Unmanaged-WindowsAgents-Solo",
        JobType: "Linux Agent Standalone",
      }),
    ],
  );

  const results = validateHealthcheck(data);
  const check = results.find(
    (r) => r.ruleId === "agent-standalone-unsupported",
  );

  expect(check?.status).toBe("fail");
  expect(check?.message).toContain("1 standalone");
  expect(check?.message).toContain("job detected");
});

it("prefers jobInfo names over jobSummary count when both sources match", () => {
  const data = makeStandaloneDataWithJobs(
    [{ JobType: "Unmanaged Agent", Count: 9 }],
    [
      makeJobRow({
        JobName: "NamedStandaloneJob",
        JobType: "Windows Agent Standalone",
      }),
    ],
  );

  const results = validateHealthcheck(data);
  const check = results.find(
    (r) => r.ruleId === "agent-standalone-unsupported",
  );

  expect(check?.status).toBe("fail");
  expect(check?.affectedItems).toEqual(["NamedStandaloneJob"]);
  expect(check?.message).toContain("1 standalone");
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "Standalone Agent Workloads"`

Expected: the four new `it` blocks FAIL — current implementation only inspects `jobSummary` and matches the exact string `"unmanaged agent"`. Existing legacy `Unmanaged Agent` and `unmanaged agent` tests still PASS.

- [ ] **Step 3: Update `validateAgentStandaloneUnsupported` in `src/lib/validator.ts`**

Replace the function body (lines ~168–193) with:

```ts
function validateAgentStandaloneUnsupported(
  data: NormalizedDataset,
): ValidationResult {
  const jobInfoMatches = data.jobInfo.filter(
    (job) => classifyAgentJobType(job.JobType)?.category === "standalone",
  );

  const summaryCount = data.jobSummary
    .filter(
      (s) =>
        classifyAgentJobType(s.JobType)?.category === "standalone" &&
        s.Count > 0,
    )
    .reduce((sum, s) => sum + s.Count, 0);

  const useJobInfo = jobInfoMatches.length > 0;
  const totalCount = useJobInfo ? jobInfoMatches.length : summaryCount;

  if (totalCount > 0) {
    return {
      ruleId: "agent-standalone-unsupported",
      title: "Standalone Agent Workloads",
      status: "fail",
      message: `${totalCount} standalone (unmanaged) agent ${totalCount === 1 ? "job" : "jobs"} detected. Standalone agents cannot target VDC Vault directly. Use a Backup Copy Job with encryption enabled to land their backups in Vault — that is the only supported path.`,
      affectedItems: useJobInfo ? jobInfoMatches.map((j) => j.JobName) : [],
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

(Title, status, message wording, and `ruleId` are preserved. Only the matching logic and `affectedItems` population change.)

- [ ] **Step 4: Run the standalone-rule tests and verify all pass**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "Standalone Agent Workloads"`

Expected: all tests in the block PASS — the four new cases plus all existing legacy cases (`Unmanaged Agent`, `unmanaged agent`, Count=0, managed `Agent Backup`).

- [ ] **Step 5: Run the full validator test file**

Run: `npm run test:run -- src/__tests__/validator.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts
git commit -m "fix(validator): support new-format standalone agent jobs

The standalone-agent rule now reads both jobInfo and jobSummary via the
agent classifier. New-format healthchecks emit unmanaged agents as
named rows in jobInfo ('Windows Agent Standalone'); when those are
present, affectedItems gets actual job names instead of an empty array.
Old-format healthchecks still work via the jobSummary count-only path."
```

---

## Task 4: Emit deprecation warning when legacy strings are detected

**Files:**

- Modify: `src/lib/validator.ts` (`validateHealthcheck()` at lines ~11–28)
- Modify: `src/__tests__/validator.test.ts` (add a new top-level describe)

- [ ] **Step 1: Add failing tests for the deprecation warning**

In `src/__tests__/validator.test.ts`, add this new top-level describe block (anywhere after the existing `describe("validateHealthcheck", …)` closes, or at the bottom of the file):

```ts
describe("validateHealthcheck — legacy job type deprecation warning", () => {
  function emptyDataset(): NormalizedDataset {
    return {
      backupServer: [{ Version: "13.0.1.2067", Name: "ServerA" }],
      securitySummary: [
        {
          BackupFileEncryptionEnabled: true,
          ConfigBackupEncryptionEnabled: true,
        },
      ],
      jobInfo: [],
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

  function jobRow(
    overrides: Partial<NormalizedDataset["jobInfo"][number]> = {},
  ): NormalizedDataset["jobInfo"][number] {
    return {
      JobName: "Job",
      JobType: "Backup",
      Encrypted: true,
      RepoName: "Repo",
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
      ...overrides,
    };
  }

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("emits one console.warn when jobInfo contains a legacy JobType", () => {
    const data = emptyDataset();
    data.jobInfo = [jobRow({ JobName: "P", JobType: "EpAgentPolicy" })];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Legacy agent job type strings");
  });

  it("emits one console.warn when jobSummary contains a legacy JobType", () => {
    const data = emptyDataset();
    data.jobSummary = [{ JobType: "Unmanaged Agent", Count: 1 }];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("emits exactly one warn even when multiple legacy rows are present", () => {
    const data = emptyDataset();
    data.jobInfo = [
      jobRow({ JobName: "A", JobType: "EpAgentPolicy" }),
      jobRow({ JobName: "B", JobType: "VmbapiPolicyTempJob" }),
      jobRow({ JobName: "C", JobType: "EpAgentBackup" }),
    ];
    data.jobSummary = [{ JobType: "Unmanaged Agent", Count: 2 }];

    validateHealthcheck(data);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT warn when only new-format agent strings are present", () => {
    const data = emptyDataset();
    data.jobInfo = [
      jobRow({ JobName: "P", JobType: "Windows Agent Policy" }),
      jobRow({ JobName: "B", JobType: "Windows Agent Backup" }),
    ];
    data.jobSummary = [{ JobType: "Windows Agent Standalone", Count: 1 }];

    validateHealthcheck(data);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does NOT warn when no agent rows are present at all", () => {
    const data = emptyDataset();
    data.jobInfo = [jobRow({ JobName: "Regular", JobType: "Backup" })];

    validateHealthcheck(data);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
```

Add the missing imports at the top of the file if they aren't there already. Locate the top-of-file import statement:

```ts
import { describe, it, expect } from "vitest";
```

Replace it with:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "legacy job type deprecation"`

Expected: the five new tests FAIL — `console.warn` is never called by the current validator code. (The "does NOT warn" cases will technically "pass" the assertion, but the first three "expect warn called" cases will fail.)

- [ ] **Step 3: Add the deprecation side-scan to `validateHealthcheck()`**

In `src/lib/validator.ts`, replace the existing `validateHealthcheck` function (lines ~11–28) with:

```ts
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
  ];

  const sawLegacy =
    data.jobInfo.some(
      (job) => classifyAgentJobType(job.JobType)?.legacy === true,
    ) ||
    data.jobSummary.some(
      (row) => classifyAgentJobType(row.JobType)?.legacy === true,
    );

  if (sawLegacy) {
    console.warn(
      "[vdc-vault-readiness] Legacy agent job type strings detected " +
        "(EpAgentBackup / EpAgentPolicy / Unmanaged Agent / VmbapiPolicyTempJob). " +
        "These will be removed in a future release once the updated veeam-healthcheck " +
        "tool is widely deployed. Please regenerate your healthcheck using the latest version.",
    );
  }

  return results;
}
```

- [ ] **Step 4: Run the new tests and verify they pass**

Run: `npm run test:run -- src/__tests__/validator.test.ts -t "legacy job type deprecation"`

Expected: all five tests PASS.

- [ ] **Step 5: Run the full validator test file to confirm no collateral damage**

Run: `npm run test:run -- src/__tests__/validator.test.ts`

Expected: all tests pass.

> ⚠️ **Heads-up:** existing tests in `validator.test.ts` that use legacy JobTypes (`EpAgentPolicy`, `Unmanaged Agent`, etc.) will now trigger `console.warn` during their run. Vitest does not fail on incidental console output — these tests still pass. If the noise is bothersome, the cleanest fix is a file-level `beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}))`, but that's optional and **out of scope** for this task. Do not add it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validator.ts src/__tests__/validator.test.ts
git commit -m "feat(validator): warn once when legacy agent JobTypes detected

validateHealthcheck() now side-scans jobInfo and jobSummary after running
the rules and emits a single console.warn per call when any legacy
JobType string is present (EpAgentBackup, EpAgentPolicy, Unmanaged
Agent, VmbapiPolicyTempJob). Signals to users on older veeam-healthcheck
versions that the format is deprecated and they should regenerate."
```

---

## Task 5: Pipeline integration tests + documentation update

**Files:**

- Modify: `src/__tests__/pipeline.test.ts` (existing agent-related block at ~lines 237–260, plus a new sibling describe)
- Modify: `src/lib/CLAUDE.md` (structure table + where-to-look table)

- [ ] **Step 1: Add a console.warn spy assertion to the existing legacy pipeline test**

In `src/__tests__/pipeline.test.ts`:

(a) Replace the top import line:

```ts
import { describe, it, expect } from "vitest";
```

with:

```ts
import { describe, it, expect, vi } from "vitest";
```

(b) Locate the existing test `it("does not warn on managed agent backup jobs (EpAgentBackup)", …)` inside `describe("end-to-end validation scenarios", …)` (the test body starts around line 237). Modify the test body so it installs a local `console.warn` spy. Replace the entire `it(...)` block with:

```ts
it("does not warn on managed agent backup jobs (EpAgentBackup)", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  try {
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

    // EpAgentBackup is a legacy managed-backup string — the rules
    // remain "pass" (managed backups are fine), but the validator
    // still emits one deprecation warning per pipeline run because
    // the legacy string was detected.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Legacy agent job type strings");
  } finally {
    warnSpy.mockRestore();
  }
});
```

A local spy (rather than a describe-scoped `beforeEach`/`afterEach`) avoids touching any other tests inside the `end-to-end validation scenarios` describe — several of those tests exercise legacy strings via `sampleData`, and they would otherwise need their own spies too. Local-scope is surgical.

- [ ] **Step 2: Add a new sibling describe block for new-format pipeline coverage**

In the same `pipeline.test.ts` file, add this new describe block as a sibling to `describe("end-to-end validation scenarios", …)` — i.e. **nested inside** the outer `describe("analyzeHealthcheck (full pipeline)", …)` (it should use the same indentation as `end-to-end validation scenarios`). Place it immediately after the closing `});` of the `end-to-end validation scenarios` block.

The new describe **does** use `beforeEach`/`afterEach` because every test inside it asserts on `warnSpy` calls. The top import line was already updated in Step 1 to include `vi`; before adding the new block, also extend the import to include `beforeEach, afterEach`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

Then add the new describe:

```ts
describe("new-format agent job types (end-to-end through the pipeline)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("flags 'Windows Agent Standalone' rows from jobInfo with named affectedItems", () => {
    const input: HealthcheckRoot = {
      Sections: {
        jobInfo: {
          Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
          Rows: [
            [
              "Unmanaged-WindowsAgents-VTESTVM03",
              "Windows Agent Standalone",
              "True",
              "Repo1",
            ],
          ],
        },
      },
    };

    const result = analyzeHealthcheck(input);
    const standalone = findRule(
      result.validations,
      "agent-standalone-unsupported",
    );

    expect(standalone.status).toBe("fail");
    expect(standalone.affectedItems).toEqual([
      "Unmanaged-WindowsAgents-VTESTVM03",
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("flags 'Windows Agent Policy' as policy-gateway warning", () => {
    const input: HealthcheckRoot = {
      Sections: {
        jobInfo: {
          Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
          Rows: [
            [
              "Managed-WindowsAgents-Policy",
              "Windows Agent Policy",
              "True",
              "BackupRepo1",
            ],
          ],
        },
      },
    };

    const result = analyzeHealthcheck(input);
    const policy = findRule(
      result.validations,
      "agent-policy-gateway-required",
    );

    expect(policy.status).toBe("warning");
    expect(policy.affectedItems).toEqual(["Managed-WindowsAgents-Policy"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("treats 'Windows Agent Backup' (managed) as a passing job — no warnings, no fails", () => {
    const input: HealthcheckRoot = {
      Sections: {
        jobInfo: {
          Headers: ["JobName", "JobType", "Encrypted", "RepoName"],
          Rows: [
            [
              "Managed-WindowsAgents-Job",
              "Windows Agent Backup",
              "True",
              "BackupRepo1",
            ],
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
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("flags new-format standalone count from jobSummary even when jobInfo is empty", () => {
    const input: HealthcheckRoot = {
      Sections: {
        jobSummary: {
          Headers: ["JobType", "Count"],
          Rows: [["Windows Agent Standalone", "2"]],
        },
      },
    };

    const result = analyzeHealthcheck(input);
    const standalone = findRule(
      result.validations,
      "agent-standalone-unsupported",
    );

    expect(standalone.status).toBe("fail");
    expect(standalone.affectedItems).toEqual([]);
    expect(standalone.message).toContain("2 standalone");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run pipeline tests and verify all pass**

Run: `npm run test:run -- src/__tests__/pipeline.test.ts`

Expected: all tests pass — new describe block plus the modified `EpAgentBackup` test.

- [ ] **Step 4: Update `src/lib/CLAUDE.md`**

Open `src/lib/CLAUDE.md`.

(a) In the `## STRUCTURE` ASCII tree, find this line:

```
├── pipeline.ts            # Orchestrator: analyzeHealthcheck() → {data, validations}. Zips sobr/capextents/archextents sections
```

Add this new line **immediately before** it:

```
├── agent-classifier.ts    # classifyAgentJobType(): centralised JobType naming knowledge for agent rules (pattern + legacy allow-list)
```

(b) In the `## WHERE TO LOOK` table, find this row:

```
| Add validation rule      | validator.ts             | Add function, append to return array in validateHealthcheck()                                   |
```

Add this new row **immediately before** it:

```
| Agent JobType classifier | agent-classifier.ts      | Pure pattern match for Windows/Linux/Mac Agent {Standalone,Policy,Backup} + legacy exact strings. Used by validator.ts only. |
```

(Column widths don't need to align with the existing table — Prettier will normalise on commit via the pre-commit hook.)

- [ ] **Step 5: Final verification — full test suite, lint, build**

Run all three (sequentially, fail-fast):

```bash
npm run test:run && npm run lint && npm run build
```

Expected:

- All ~41 test files pass.
- No lint errors or warnings.
- `tsc -b && vite build` completes without errors.

If any step fails, fix the underlying issue before committing. Do not skip.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/pipeline.test.ts src/lib/CLAUDE.md
git commit -m "test(pipeline): cover new-format agent JobTypes end-to-end

Adds a describe block that exercises Windows Agent Standalone/Policy/Backup
through the full analyzeHealthcheck pipeline, asserting status, named
affectedItems, and the absence of the deprecation warning. Updates the
existing EpAgentBackup test to assert the warning DOES fire (since
EpAgentBackup is now a legacy string). Documents the new module in
src/lib/CLAUDE.md."
```

---

## Final Verification (after Task 5)

Before declaring the feature complete:

- [ ] Re-run the full suite one more time on a clean tree: `npm run test:run && npm run lint && npm run build`
- [ ] Check the branch's commit history: `git log --oneline main..HEAD` — expect 5 commits (one per task), each scoped to a coherent change.
- [ ] Spot-check: `grep -rn "EpAgentBackup\|EpAgentPolicy\|VmbapiPolicyTempJob\|Unmanaged Agent" src/` should return matches **only** in tests, the classifier's legacy allow-list, and the deprecation-warning message. No stale matches in rule logic.
- [ ] Open a PR against `main`. Title: `fix(validator): adapt agent rules to new veeam-healthcheck job type vocabulary`.

The user-supplied new-format JSON (`Veeam Health Check Report_VBR_localhost_2026.05.27.041220.json`) is NOT committed — it remains in the working tree as an untracked file the developer can use for manual smoke-testing if desired.
