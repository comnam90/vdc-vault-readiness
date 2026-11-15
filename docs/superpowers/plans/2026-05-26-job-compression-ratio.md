# Job Compression Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misleading single "Compression Ratio" field in the job detail sheet with two accurate values — `Dedup Ratio` and `Compression Ratio` — sourced from new `AvgDedupRatio` / `AvgCompressRatio` columns in the `jobSessionSummaryByJob` section. Gracefully degrade to muted "—" + tooltip on older healthchecks that lack these fields.

**Architecture:** Add two nullable numeric fields to `SafeJobSession`. A new `parseRatio()` helper in the normalizer strips the `"x"` suffix Veeam emits and reuses `parseNumeric()` for the actual parsing (and DataError semantics). A new `formatRatio()` helper in `format-utils.ts` formats numbers to `"3.03x"` or returns `"—"` for null. The detail sheet wraps the formatter in a local `RatioValue` component that attaches a tooltip explaining the missing-data state. The legacy `formatCompressionRatio(source, disk)` helper — which conflated dedup and compression as Source/Disk — is deleted to prevent the mistake from creeping back.

**Tech Stack:** TypeScript 5.9, React 19, Vitest, React Testing Library, shadcn `Tooltip` (already present), lucide-react `Info` icon (already used elsewhere), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-26-job-compression-ratio-design.md`

**Branch:** `fix/job-compression-ratio` (already created and checked out from `main`).

---

## File Structure

| File                                            | Action | Responsibility                                                                                                                                     |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/domain.ts`                           | Modify | Add `AvgDedupRatio` / `AvgCompressRatio` to `SafeJobSession`.                                                                                      |
| `src/lib/normalizer.ts`                         | Modify | Add `parseRatio()`; populate the new fields in `normalizeJobSessions()`.                                                                           |
| `src/lib/format-utils.ts`                       | Modify | Add `formatRatio()`. Remove `formatCompressionRatio()`.                                                                                            |
| `src/components/dashboard/job-detail-sheet.tsx` | Modify | Replace single Compression Ratio row with two rows. Add file-local `RatioValue` component.                                                         |
| `src/__tests__/fixtures.ts`                     | Modify | Default the two new fields to `null` in `makeSession()`.                                                                                           |
| `src/__tests__/domain-types.test.ts`            | Modify | Patch all inline `SafeJobSession` / `NormalizedDataset.jobSessionSummary` literals. Add two new contract `it()` cases for the new fields.          |
| `src/__tests__/normalizer.test.ts`              | Modify | Patch the `toEqual` assertion at line ~1307. Add new `describe` block exercising `parseRatio`.                                                     |
| `src/__tests__/format-utils.test.ts`            | Modify | Add `describe("formatRatio")`. Delete `describe("formatCompressionRatio")`.                                                                        |
| `src/__tests__/job-detail-sheet.test.tsx`       | Modify | Patch all 9 inline `sessionData: { ... }` literals. Delete old Compression Ratio tests. Add 4 new tests for the two rows and the tooltip fallback. |
| `src/__tests__/pipeline.test.ts`                | Modify | Add assertion that the legacy sample produces sessions with null ratios.                                                                           |

**Not modified:** `src/components/ui/tooltip.tsx` (already present), `dashboard-view.tsx`, `job-table.tsx`, calculator code, validator code.

---

## Task 1: Extend `SafeJobSession` and update mechanical consumers

This task is intentionally non-TDD: it's a type extension with mechanical TypeScript-driven fixes. After this commit, the build is green and every existing test still passes, but no behavior has changed yet.

**Files:**

- Modify: `src/types/domain.ts:36-45`
- Modify: `src/lib/normalizer.ts:405-448` (the `safeSession` literal inside `normalizeJobSessions`)
- Modify: `src/__tests__/fixtures.ts:151-165`
- Modify: `src/__tests__/domain-types.test.ts` (every inline `SafeJobSession` and `NormalizedDataset.jobSessionSummary` literal)
- Modify: `src/__tests__/normalizer.test.ts:1307-1320` (the `toEqual` assertion)
- Modify: `src/__tests__/job-detail-sheet.test.tsx` (all 9 inline `sessionData: { ... }` literals)

- [ ] **Step 1: Add the two fields to `SafeJobSession`**

Edit `src/types/domain.ts`. Locate the `SafeJobSession` interface and add the two new fields after `MaxJobTime`:

```ts
export interface SafeJobSession {
  JobName: string;
  MaxDataSize: number | null;
  AvgChangeRate: number | null;
  SuccessRate: number | null;
  SessionCount: number | null;
  Fails: number | null;
  AvgJobTime: string | null;
  MaxJobTime: string | null;
  AvgDedupRatio: number | null;
  AvgCompressRatio: number | null;
}
```

- [ ] **Step 2: Run the type checker — expect breakage**

Run: `npx tsc -b --noEmit`
Expected: dozens of `TS2741: Property 'AvgDedupRatio' is missing` errors across `fixtures.ts`, `domain-types.test.ts`, `job-detail-sheet.test.tsx`, `normalizer.test.ts`, and `normalizer.ts`. This confirms the type change has bite — fix them in the following steps.

- [ ] **Step 3: Update `makeSession()` factory defaults**

Edit `src/__tests__/fixtures.ts`. In the `makeSession` function (around lines 151-165), add `AvgDedupRatio: null` and `AvgCompressRatio: null` to the defaults:

```ts
export function makeSession(
  overrides: Partial<SafeJobSession> = {},
): SafeJobSession {
  return {
    JobName: "TestJob",
    MaxDataSize: null,
    AvgChangeRate: null,
    SuccessRate: null,
    SessionCount: null,
    Fails: null,
    AvgJobTime: null,
    MaxJobTime: null,
    AvgDedupRatio: null,
    AvgCompressRatio: null,
    ...overrides,
  };
}
```

This automatically satisfies every test that builds sessions via `makeSession()` without explicit overrides for the new fields.

- [ ] **Step 4: Add hardcoded nulls inside `normalizeJobSessions()`**

Edit `src/lib/normalizer.ts`. Locate the `safeSession` literal inside `normalizeJobSessions` (around lines 405-448). After the `MaxJobTime` field, add:

```ts
      MaxJobTime: normalizeString(
        record.MaxJobTime as string | null | undefined,
      ),
      AvgDedupRatio: null,
      AvgCompressRatio: null,
    };
```

Note: this hardcodes `null` for now. Task 2 replaces these with real parsing.

- [ ] **Step 5: Patch the existing `toEqual` assertion in `normalizer.test.ts`**

Edit `src/__tests__/normalizer.test.ts`. Find the test around line 1307 (`expect(result.jobSessionSummary[0]).toEqual({...})`) and add the two new fields to the expected object:

```ts
expect(result.jobSessionSummary[0]).toEqual({
  JobName: "Job_53",
  MaxDataSize: 0.0079,
  AvgChangeRate: 66.15,
  SuccessRate: null,
  SessionCount: null,
  Fails: null,
  AvgJobTime: null,
  MaxJobTime: null,
  AvgDedupRatio: null,
  AvgCompressRatio: null,
});
```

(Use the exact existing values for the other fields — only add the two new lines.)

- [ ] **Step 6: Patch inline session literals in `job-detail-sheet.test.tsx`**

Edit `src/__tests__/job-detail-sheet.test.tsx`. There are nine inline `sessionData: { ... }` object literals (lines approximately 24, 123, 142, 161, 398, 417, 436, 455, 476). For **each one**, add `AvgDedupRatio: null,` and `AvgCompressRatio: null,` after `MaxJobTime`.

Example transformation:

```diff
     sessionData: {
       JobName: "Test Job",
       MaxDataSize: null,
       AvgChangeRate: 5.2,
       SuccessRate: 98.5,
       SessionCount: 200,
       Fails: 3,
       AvgJobTime: "00.01:15:30",
       MaxJobTime: "00.03:45:10",
+      AvgDedupRatio: null,
+      AvgCompressRatio: null,
     },
```

Apply this to all nine literals. To find them quickly, run:

```bash
grep -n "sessionData:\s*{" src/__tests__/job-detail-sheet.test.tsx
```

- [ ] **Step 7: Patch inline session literals in `domain-types.test.ts`**

Edit `src/__tests__/domain-types.test.ts`. The file has many inline `SafeJobSession` object literals (in the `describe("Domain Types - SafeJobSession")` block) and two inside `NormalizedDataset.jobSessionSummary` arrays (in the `describe("Domain Types - NormalizedDataset extension")` block).

For **every** inline session literal in the file, add `AvgDedupRatio: null,` and `AvgCompressRatio: null,` after `MaxJobTime`. To find them all:

```bash
grep -n "MaxJobTime:" src/__tests__/domain-types.test.ts
```

Each line listed there marks a session literal that needs the two new fields added on the following lines.

- [ ] **Step 8: Add two new contract tests for the new fields**

Edit `src/__tests__/domain-types.test.ts`. Inside the `describe("Domain Types - SafeJobSession")` block (after the existing `MaxJobTime as null` test, around line 440), add:

```ts
it("SafeJobSession accepts AvgDedupRatio and AvgCompressRatio as numbers", () => {
  const session: SafeJobSession = {
    JobName: "Test Job",
    MaxDataSize: null,
    AvgChangeRate: null,
    SuccessRate: null,
    SessionCount: null,
    Fails: null,
    AvgJobTime: null,
    MaxJobTime: null,
    AvgDedupRatio: 3.03,
    AvgCompressRatio: 1.56,
  };
  expect(session.AvgDedupRatio).toBe(3.03);
  expect(session.AvgCompressRatio).toBe(1.56);
});

it("SafeJobSession accepts AvgDedupRatio and AvgCompressRatio as null", () => {
  const session: SafeJobSession = {
    JobName: "Test Job",
    MaxDataSize: null,
    AvgChangeRate: null,
    SuccessRate: null,
    SessionCount: null,
    Fails: null,
    AvgJobTime: null,
    MaxJobTime: null,
    AvgDedupRatio: null,
    AvgCompressRatio: null,
  };
  expect(session.AvgDedupRatio).toBeNull();
  expect(session.AvgCompressRatio).toBeNull();
});
```

- [ ] **Step 9: Run the type checker — expect clean**

Run: `npx tsc -b --noEmit`
Expected: PASS, no errors.

If errors remain, they point at the file/line that still needs the two new fields added. Fix them and re-run.

- [ ] **Step 10: Run the full test suite — expect clean**

Run: `npm run test:run`
Expected: all tests pass. Same total count as before (no behavior changes), plus the two new contract tests.

- [ ] **Step 11: Commit**

```bash
git add src/types/domain.ts \
        src/lib/normalizer.ts \
        src/__tests__/fixtures.ts \
        src/__tests__/domain-types.test.ts \
        src/__tests__/normalizer.test.ts \
        src/__tests__/job-detail-sheet.test.tsx
git commit -m "fix(types): add AvgDedupRatio and AvgCompressRatio to SafeJobSession"
```

---

## Task 2: Implement `parseRatio()` in the normalizer (TDD)

Replace the hardcoded `null`s from Task 1 with real parsing of the new healthcheck fields. The helper strips a trailing `"x"` and delegates to `parseNumeric()` so `DataError` semantics stay consistent with the rest of the normalizer.

**Files:**

- Modify: `src/lib/normalizer.ts`
- Modify: `src/__tests__/normalizer.test.ts`

- [ ] **Step 1: Write the failing tests**

Edit `src/__tests__/normalizer.test.ts`. Inside the existing `describe("jobSessionSummaryByJob normalization", ...)` block (starts at line ~1287), add a nested `describe` for the ratio fields. Place it after the existing `defaults AvgChangeRate to null when empty string` test (around line 1390):

```ts
describe("AvgDedupRatio and AvgCompressRatio parsing", () => {
  it("parses 'x'-suffixed values as numbers", () => {
    const raw = {
      jobSessionSummaryByJob: {
        Headers: ["JobName", "AvgDedupRatio", "AvgCompressRatio"],
        Rows: [],
      },
    };
    const sessions = [
      {
        JobName: "JobA",
        AvgDedupRatio: "3.03x",
        AvgCompressRatio: "1.56x",
      },
    ];
    const result = normalizeHealthcheck(raw as never, sessions);
    expect(result.jobSessionSummary[0].AvgDedupRatio).toBe(3.03);
    expect(result.jobSessionSummary[0].AvgCompressRatio).toBe(1.56);
  });

  it("parses values without 'x' suffix as numbers", () => {
    const raw = { jobSessionSummaryByJob: { Headers: [], Rows: [] } };
    const sessions = [
      {
        JobName: "JobA",
        AvgDedupRatio: "3.03",
        AvgCompressRatio: "1.56",
      },
    ];
    const result = normalizeHealthcheck(raw as never, sessions);
    expect(result.jobSessionSummary[0].AvgDedupRatio).toBe(3.03);
    expect(result.jobSessionSummary[0].AvgCompressRatio).toBe(1.56);
  });

  it("returns null for empty string without emitting a DataError", () => {
    const raw = { jobSessionSummaryByJob: { Headers: [], Rows: [] } };
    const sessions = [
      {
        JobName: "JobA",
        AvgDedupRatio: "",
        AvgCompressRatio: "",
      },
    ];
    const result = normalizeHealthcheck(raw as never, sessions);
    expect(result.jobSessionSummary[0].AvgDedupRatio).toBeNull();
    expect(result.jobSessionSummary[0].AvgCompressRatio).toBeNull();
    expect(
      result.dataErrors.filter((e) => e.field.includes("Ratio")),
    ).toHaveLength(0);
  });

  it("returns null when fields are absent from the record (legacy healthcheck)", () => {
    const raw = { jobSessionSummaryByJob: { Headers: [], Rows: [] } };
    const sessions = [{ JobName: "JobA" }];
    const result = normalizeHealthcheck(raw as never, sessions);
    expect(result.jobSessionSummary[0].AvgDedupRatio).toBeNull();
    expect(result.jobSessionSummary[0].AvgCompressRatio).toBeNull();
    expect(
      result.dataErrors.filter((e) => e.field.includes("Ratio")),
    ).toHaveLength(0);
  });

  it("returns null and emits a DataError for garbage values", () => {
    const raw = { jobSessionSummaryByJob: { Headers: [], Rows: [] } };
    const sessions = [
      {
        JobName: "JobA",
        AvgDedupRatio: "abc",
        AvgCompressRatio: "not-a-number",
      },
    ];
    const result = normalizeHealthcheck(raw as never, sessions);
    expect(result.jobSessionSummary[0].AvgDedupRatio).toBeNull();
    expect(result.jobSessionSummary[0].AvgCompressRatio).toBeNull();
    const ratioErrors = result.dataErrors.filter((e) =>
      e.field.includes("Ratio"),
    );
    expect(ratioErrors).toHaveLength(2);
    expect(ratioErrors.map((e) => e.field).sort()).toEqual([
      "AvgCompressRatio",
      "AvgDedupRatio",
    ]);
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/__tests__/normalizer.test.ts -t "AvgDedupRatio and AvgCompressRatio parsing"`
Expected: all five new tests FAIL — the first four because `AvgDedupRatio` stays `null` regardless of input (hardcoded in Task 1), the fifth because no DataError is emitted.

- [ ] **Step 3: Implement `parseRatio()` in the normalizer**

Edit `src/lib/normalizer.ts`. Add the helper at the bottom of the file's helper section, alongside `parseNumeric`. After the `parseNumeric` function:

```ts
function parseRatio(
  value: string | null | undefined,
  section: DataError["section"],
  rowIndex: number,
  field: string,
  dataErrors: DataError[],
): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const stripped = trimmed.replace(/[xX]$/, "");
  return parseNumeric(stripped, section, rowIndex, field, dataErrors);
}
```

- [ ] **Step 4: Wire the helper into `normalizeJobSessions()`**

In the same file, locate the `safeSession` literal inside `normalizeJobSessions` (the two hardcoded nulls added in Task 1). Replace them with `parseRatio` calls:

```ts
      AvgDedupRatio: parseRatio(
        record.AvgDedupRatio as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "AvgDedupRatio",
        dataErrors,
      ),
      AvgCompressRatio: parseRatio(
        record.AvgCompressRatio as string | null | undefined,
        "jobSessionSummaryByJob",
        rowIndex,
        "AvgCompressRatio",
        dataErrors,
      ),
    };
```

- [ ] **Step 5: Run the new tests — expect pass**

Run: `npx vitest run src/__tests__/normalizer.test.ts -t "AvgDedupRatio and AvgCompressRatio parsing"`
Expected: all five new tests PASS.

- [ ] **Step 6: Run the full test suite — expect clean**

Run: `npm run test:run`
Expected: all tests pass, including the existing `jobSessionSummaryByJob normalization` block.

- [ ] **Step 7: Commit**

```bash
git add src/lib/normalizer.ts src/__tests__/normalizer.test.ts
git commit -m "fix(normalizer): parse AvgDedupRatio and AvgCompressRatio from session summary"
```

---

## Task 3: Lock in graceful degradation against the legacy sample (TDD)

Pin the contract that older healthcheck JSON (which omits the new columns) normalizes to `null` ratios with no DataErrors.

**Files:**

- Modify: `src/__tests__/pipeline.test.ts`

- [ ] **Step 1: Add the new test alongside existing session-summary assertions**

Edit `src/__tests__/pipeline.test.ts`. The file already imports the legacy fixture as `sampleData` (line 5), runs `analyzeHealthcheck(sampleData as HealthcheckRoot)` once at the top of the suite (line 23), and exposes the outcome as `result`. Two existing tests at lines 81-93 (`parses jobSessionSummaryByJob into jobSessionSummary` and `parses MaxDataSize and AvgChangeRate as numbers`) sit next to where the new test belongs.

Add this new `it` block immediately after the `parses MaxDataSize and AvgChangeRate as numbers` test (around line 93):

```ts
it("normalizes legacy sample sessions with null dedup/compression ratios", () => {
  // Sample healthcheck pre-dates AvgDedupRatio/AvgCompressRatio fields.
  // All sessions must come through as null, with no DataErrors raised for
  // the ratio fields.
  expect(result.data.jobSessionSummary.length).toBeGreaterThan(0);
  for (const session of result.data.jobSessionSummary) {
    expect(session.AvgDedupRatio).toBeNull();
    expect(session.AvgCompressRatio).toBeNull();
  }

  const ratioErrors = result.data.dataErrors.filter((e) =>
    e.field.includes("Ratio"),
  );
  expect(ratioErrors).toHaveLength(0);
});
```

No new imports needed — `result` is already in scope from the parent `describe`.

- [ ] **Step 2: Run the new test — expect pass**

Run: `npx vitest run src/__tests__/pipeline.test.ts -t "legacy sample sessions"`
Expected: PASS — because the legacy sample's session records do not contain `AvgDedupRatio` / `AvgCompressRatio` keys, so `parseRatio` returns `null` without emitting a DataError. This test passes immediately (no implementation work needed) — its value is regression protection for the contract.

- [ ] **Step 3: Run the full test suite — expect clean**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/pipeline.test.ts
git commit -m "test(pipeline): assert legacy sample yields null dedup/compress ratios"
```

---

## Task 4: Add `formatRatio()` helper (TDD)

Add the new formatter. Keep the legacy `formatCompressionRatio` alongside it in this task — Task 5 deletes the legacy helper as part of swapping the UI over.

**Files:**

- Modify: `src/lib/format-utils.ts`
- Modify: `src/__tests__/format-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Edit `src/__tests__/format-utils.test.ts`. Add an import for `formatRatio` to the top-of-file imports (alongside `formatCompressionRatio`):

```ts
import {
  formatSize,
  formatPercent,
  formatDuration,
  formatTB,
  formatCompressionRatio,
  formatRatio,
} from "@/lib/format-utils";
```

At the bottom of the file, after the existing `describe("formatCompressionRatio")` block, add:

```ts
describe("formatRatio", () => {
  it("returns an em-dash for null", () => {
    expect(formatRatio(null)).toBe("—");
  });

  it("formats positive numbers with two-decimal precision and 'x' suffix", () => {
    expect(formatRatio(3.03)).toBe("3.03x");
  });

  it("formats whole numbers with trailing zeros", () => {
    expect(formatRatio(1)).toBe("1.00x");
  });

  it("formats zero", () => {
    expect(formatRatio(0)).toBe("0.00x");
  });
});
```

- [ ] **Step 2: Run the new tests — expect failure**

Run: `npx vitest run src/__tests__/format-utils.test.ts -t "formatRatio"`
Expected: all four tests FAIL — `formatRatio is not a function`.

- [ ] **Step 3: Implement `formatRatio`**

Edit `src/lib/format-utils.ts`. Append a new export at the bottom of the file:

```ts
export function formatRatio(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)}x`;
}
```

Leave `formatCompressionRatio` in place for now — Task 5 removes it.

- [ ] **Step 4: Run the new tests — expect pass**

Run: `npx vitest run src/__tests__/format-utils.test.ts -t "formatRatio"`
Expected: all four tests PASS.

- [ ] **Step 5: Run the full test suite — expect clean**

Run: `npm run test:run`
Expected: all tests pass, including the still-present `formatCompressionRatio` block.

- [ ] **Step 6: Commit**

```bash
git add src/lib/format-utils.ts src/__tests__/format-utils.test.ts
git commit -m "feat(format-utils): add formatRatio for dedup/compression display"
```

---

## Task 5: Swap UI to two-row Dedup/Compression layout and delete legacy (TDD)

The largest task. Replaces the misleading single row with two rows, introduces the `RatioValue` component with tooltip fallback, removes the now-unused legacy helper, and deletes the two stale UI tests that asserted the old behavior.

**Files:**

- Modify: `src/components/dashboard/job-detail-sheet.tsx`
- Modify: `src/__tests__/job-detail-sheet.test.tsx`
- Modify: `src/lib/format-utils.ts`
- Modify: `src/__tests__/format-utils.test.ts`

- [ ] **Step 1: Delete the two existing Compression Ratio tests**

Edit `src/__tests__/job-detail-sheet.test.tsx`. Delete the two `it` blocks at lines ~97-119:

- `it("renders compression ratio when both sizes available", ...)`
- `it("renders muted N/A compression ratio when sizes missing", ...)`

The surrounding `describe("StorageSection")` (or whatever the parent describe is called) stays.

- [ ] **Step 2: Add the four new failing tests**

In the same `src/__tests__/job-detail-sheet.test.tsx` file, in the same `describe` block where the deleted tests lived, add:

```tsx
it("renders dedup ratio from session data", () => {
  const job = createEnrichedJob({
    sessionData: {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: 5.2,
      SuccessRate: 98.5,
      SessionCount: 200,
      Fails: 3,
      AvgJobTime: "00.01:15:30",
      MaxJobTime: "00.03:45:10",
      AvgDedupRatio: 3.03,
      AvgCompressRatio: null,
    },
  });
  render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

  expect(screen.getByText("Dedup Ratio")).toBeInTheDocument();
  expect(screen.getByText("3.03x")).toBeInTheDocument();
});

it("renders compression ratio from session data", () => {
  const job = createEnrichedJob({
    sessionData: {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: 5.2,
      SuccessRate: 98.5,
      SessionCount: 200,
      Fails: 3,
      AvgJobTime: "00.01:15:30",
      MaxJobTime: "00.03:45:10",
      AvgDedupRatio: null,
      AvgCompressRatio: 1.56,
    },
  });
  render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

  expect(screen.getByText("Compression Ratio")).toBeInTheDocument();
  expect(screen.getByText("1.56x")).toBeInTheDocument();
});

it("renders muted em-dash with explanation when ratios are null", () => {
  const job = createEnrichedJob({
    sessionData: {
      JobName: "Test Job",
      MaxDataSize: null,
      AvgChangeRate: 5.2,
      SuccessRate: 98.5,
      SessionCount: 200,
      Fails: 3,
      AvgJobTime: "00.01:15:30",
      MaxJobTime: "00.03:45:10",
      AvgDedupRatio: null,
      AvgCompressRatio: null,
    },
  });
  render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

  // The em-dash should appear at least twice (once per ratio row).
  const dashes = screen.getAllByText("—");
  expect(dashes.length).toBeGreaterThanOrEqual(2);

  // Screen-reader text spelling out the reason is rendered for accessibility.
  const explanations = screen.getAllByText(
    "Not reported by this healthcheck version",
  );
  expect(explanations.length).toBeGreaterThanOrEqual(2);
});

it("renders muted em-dash when sessionData is null", () => {
  const job = createEnrichedJob({ sessionData: null });
  render(<JobDetailSheet job={job} open={true} onOpenChange={noop} />);

  const dashes = screen.getAllByText("—");
  expect(dashes.length).toBeGreaterThanOrEqual(2);
  const explanations = screen.getAllByText(
    "Not reported by this healthcheck version",
  );
  expect(explanations.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 3: Run the new tests — expect failure**

Run: `npx vitest run src/__tests__/job-detail-sheet.test.tsx -t "dedup\|compression ratio from\|muted em-dash"`
Expected: all four tests FAIL — labels `Dedup Ratio` / `Compression Ratio` aren't rendered yet, em-dash / sr-only text aren't there.

- [ ] **Step 4: Update `job-detail-sheet.tsx` imports**

Edit `src/components/dashboard/job-detail-sheet.tsx`. Change the imports at the top:

```tsx
import type { EnrichedJob } from "@/types/enriched-job";
import { parseGfsDetails } from "@/lib/calculator-aggregator";
import {
  formatSize,
  formatPercent,
  formatDuration,
  formatRatio,
} from "@/lib/format-utils";
import { Info } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PropertyRow, SectionHeading } from "./detail-sheet-helpers";
```

Key changes:

- `formatCompressionRatio` removed from `@/lib/format-utils` import.
- `formatRatio` added.
- `Info` imported from `lucide-react`.
- `Tooltip*` primitives imported from `@/components/ui/tooltip`.

- [ ] **Step 5: Add the `RatioValue` component**

Edit `src/components/dashboard/job-detail-sheet.tsx`. Add the new component alongside the other local helpers (e.g., after `NullableValue`):

```tsx
function RatioValue({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground inline-flex cursor-help items-center gap-1">
            —
            <Info aria-hidden="true" className="size-3" />
            <span className="sr-only">
              Not reported by this healthcheck version
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Not reported by this healthcheck version
        </TooltipContent>
      </Tooltip>
    );
  }
  return <span>{formatRatio(value)}</span>;
}
```

- [ ] **Step 6: Replace the single Compression Ratio row in `StorageSection`**

In the same file, locate `StorageSection` (around lines 87-107). Replace the existing single Compression Ratio `PropertyRow` (lines 97-101 in the original):

```tsx
<PropertyRow label="Compression Ratio">
  <NullableValue
    value={formatCompressionRatio(job.SourceSizeGB, job.OnDiskGB)}
  />
</PropertyRow>
```

with two rows:

```tsx
      <PropertyRow label="Dedup Ratio">
        <RatioValue value={job.sessionData?.AvgDedupRatio ?? null} />
      </PropertyRow>
      <PropertyRow label="Compression Ratio">
        <RatioValue value={job.sessionData?.AvgCompressRatio ?? null} />
      </PropertyRow>
```

- [ ] **Step 7: Wrap the sheet body in `TooltipProvider`**

In the same file, locate the `JobDetailSheet` component's `return` (around line 234). Wrap the `<ScrollArea>` (or its parent within the SheetContent) in a `<TooltipProvider>`:

```tsx
<ScrollArea className="min-h-0 flex-1 px-4 pb-4">
  <TooltipProvider>
    <div className="space-y-5">
      <StorageSection job={job} />
      <Separator />
      <ProtectionSection job={job} />
      <Separator />
      <ConfigurationSection job={job} />
      <Separator />
      <SessionSection job={job} />
    </div>
  </TooltipProvider>
</ScrollArea>
```

`TooltipProvider` is required by Radix; without it the tooltip's content portal won't render. The `delayDuration` default of 0 in the project's shadcn config means it appears instantly on hover.

- [ ] **Step 8: Run the new UI tests — expect pass**

Run: `npx vitest run src/__tests__/job-detail-sheet.test.tsx`
Expected: all four new tests PASS, and all the existing job-detail-sheet tests still pass.

- [ ] **Step 9: Delete the legacy `formatCompressionRatio` helper**

Edit `src/lib/format-utils.ts`. Delete the entire `formatCompressionRatio` function (lines 93-100 in the current file):

```ts
export function formatCompressionRatio(
  sourceGB: number | null,
  diskGB: number | null,
): string {
  if (sourceGB === null || diskGB === null) return "N/A";
  if (sourceGB === 0 || diskGB === 0) return "N/A";
  return `${(sourceGB / diskGB).toFixed(1)}x`;
}
```

- [ ] **Step 10: Delete the legacy `formatCompressionRatio` tests**

Edit `src/__tests__/format-utils.test.ts`. Delete the entire `describe("formatCompressionRatio", ...)` block (lines ~143-175, eight `it()` cases).

Also remove `formatCompressionRatio` from the top-of-file import so the file no longer references the deleted symbol:

```ts
import {
  formatSize,
  formatPercent,
  formatDuration,
  formatTB,
  formatRatio,
} from "@/lib/format-utils";
```

(Keep the `formatTB` and any other existing imports — only remove the `formatCompressionRatio` entry.)

- [ ] **Step 11: Confirm no other consumer references the deleted helper**

Run:

```bash
grep -rn "formatCompressionRatio" src/
```

Expected: no matches. If any appear, they're leftover from earlier steps — fix them before continuing.

- [ ] **Step 12: Run the type checker — expect clean**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 13: Run the full test suite — expect clean**

Run: `npm run test:run`
Expected: all tests pass. Total test count should be: previous count − 8 (deleted formatCompressionRatio tests) − 2 (deleted job-detail-sheet tests) + 2 (Task 1 contract tests) + 5 (Task 2 normalizer tests) + 1 (Task 3 pipeline test) + 4 (Task 4 formatRatio tests) + 4 (this task's new UI tests) = previous count + 6.

- [ ] **Step 14: Commit**

```bash
git add src/components/dashboard/job-detail-sheet.tsx \
        src/__tests__/job-detail-sheet.test.tsx \
        src/lib/format-utils.ts \
        src/__tests__/format-utils.test.ts
git commit -m "fix(job-detail-sheet): show Dedup/Compression ratios from session data"
```

---

## Task 6: Final verification

No code changes — just confirm the branch is shippable.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 2: Test (full suite)**

Run: `npm run test:run`
Expected: PASS, all tests green.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS — `tsc -b` clean, then Vite build emits `dist/`.

- [ ] **Step 4: Verify the new sample file is not staged**

Run: `git status`
Expected: `Veeam Health Check Report_VBR_localhost_2026.05.26.123917.json` appears as untracked — **leave it untracked**. It's a local working-directory artifact; the spec uses it for verification only. Do not `git add` it.

- [ ] **Step 5: Manual smoke (optional but recommended)**

If you have time, run `npm run dev`, drop the new `Veeam Health Check Report_VBR_localhost_2026.05.26.123917.json` onto the upload zone, open a job in the detail sheet, and confirm:

- The Storage & Sizing section shows separate `Dedup Ratio` and `Compression Ratio` rows.
- For jobs with no successful sessions (e.g. `Managed-WindowsAgent-Policy`), both rows show `—` with a hoverable `ⓘ` icon and tooltip text "Not reported by this healthcheck version".
- For jobs with successful sessions (e.g. `Managed-WindowsAgents-Job`), the rows show `3.03x` / `1.56x` exactly as Veeam reports them.

Then drop the legacy `veeam-healthcheck.example.json` and confirm both ratio rows show the muted `—` everywhere (graceful degradation).

- [ ] **Step 6: Open the PR**

Push the branch and open a PR targeting `main`:

```bash
git push -u origin fix/job-compression-ratio
gh pr create --title "fix: replace conflated compression ratio with Dedup + Compression rows" --body "$(cat <<'EOF'
## Summary

- Replace the misleading single "Compression Ratio" field (computed as `SourceSizeGB / OnDiskGB`, which is actually total data reduction) with two rows sourced from new `AvgDedupRatio` and `AvgCompressRatio` columns in `jobSessionSummaryByJob`.
- Add a `RatioValue` UI component that renders a muted em-dash with a tooltip ("Not reported by this healthcheck version") when the source healthcheck predates these fields.
- Delete the legacy `formatCompressionRatio(sourceGB, diskGB)` helper so the conflation cannot recur.

Spec: `docs/superpowers/specs/2026-05-26-job-compression-ratio-design.md`

## Test plan

- [ ] `npm run lint` clean
- [ ] `npm run test:run` clean
- [ ] `npm run build` clean
- [ ] Manual: drop a VBR 13.0.1.2067+ healthcheck, open a job with successful sessions, see `Dedup Ratio` and `Compression Ratio` rows populated with `Nx` values.
- [ ] Manual: drop the legacy `veeam-healthcheck.example.json`, see both rows showing muted `—` with explanatory tooltip on hover.
EOF
)"
```

---

## Verification Summary

After all six tasks:

| Check                                                                    | Pass criterion                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `SafeJobSession` carries the two new fields                              | `AvgDedupRatio: number \| null`, `AvgCompressRatio: number \| null`       |
| Normalizer parses `"3.03x"` correctly                                    | `parseRatio` strips `x`, returns `3.03`                                   |
| Normalizer emits empty / missing as `null` without DataError             | Confirmed by 2 normalizer tests + 1 pipeline test                         |
| Normalizer emits DataError for true garbage                              | Confirmed by `"abc"` test                                                 |
| `formatRatio(3.03)` returns `"3.03x"`, `formatRatio(null)` returns `"—"` | Confirmed by 4 format tests                                               |
| Detail sheet renders two ratio rows                                      | Confirmed by 2 UI tests                                                   |
| Detail sheet renders muted `—` + tooltip when ratios are null            | Confirmed by 2 UI tests (one for null ratios, one for null `sessionData`) |
| `formatCompressionRatio` and its tests are deleted                       | `grep -rn formatCompressionRatio src/` returns no matches                 |
| Build / lint / test all clean                                            | Task 6 verification commands                                              |
