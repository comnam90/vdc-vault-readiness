# Job Details Tab: Smart Columns + Detail Sheet

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the job details tab more usable by adding scannable numeric columns (Source Size, Change Rate, GFS) and a slide-out detail sheet for full job inspection on row click.

**Architecture:** Expand domain types with additional fields from raw healthcheck data, create an EnrichedJob join type, add 3 smart columns to the existing TanStack Table, and implement a shadcn Sheet component for progressive disclosure.

**Tech Stack:** React 19, TypeScript 5.9, TanStack Table v8, shadcn/ui, Tailwind 4.1, Vitest

---

## Context

The job details tab currently shows 4 data columns (Job Name, Type, Repository, Encrypted). Users need to assess Vault-readiness at a glance — specifically Source Size, Change Rate, and GFS — without the table becoming a spreadsheet. The strategy: add scannable numeric columns to the table ("Glance"), and slide out a detail sheet on row click for full inspection ("Inspect").

---

## Part 1: Data Layer Expansion

### Expand `SafeJob` (`src/types/domain.ts`)

Add 9 optional (nullable) fields to support both table columns and the detail sheet:

| Field                  | Type              | Source      | Used In                   |
| ---------------------- | ----------------- | ----------- | ------------------------- |
| `OnDiskGB`             | `number \| null`  | jobInfo raw | Sheet (compression ratio) |
| `RetentionScheme`      | `string \| null`  | jobInfo raw | Sheet                     |
| `CompressionLevel`     | `string \| null`  | jobInfo raw | Sheet                     |
| `BlockSize`            | `string \| null`  | jobInfo raw | Sheet                     |
| `GfsEnabled`           | `boolean \| null` | jobInfo raw | Table column              |
| `ActiveFullEnabled`    | `boolean \| null` | jobInfo raw | Sheet                     |
| `SyntheticFullEnabled` | `boolean \| null` | jobInfo raw | Sheet                     |
| `BackupChainType`      | `string \| null`  | jobInfo raw | Sheet                     |
| `IndexingEnabled`      | `boolean \| null` | jobInfo raw | Sheet                     |

### Expand `SafeJobSession` (`src/types/domain.ts`)

Add 5 fields for session performance in the detail sheet:

| Field          | Type             | Source                 |
| -------------- | ---------------- | ---------------------- |
| `SuccessRate`  | `number \| null` | jobSessionSummaryByJob |
| `SessionCount` | `number \| null` | jobSessionSummaryByJob |
| `Fails`        | `number \| null` | jobSessionSummaryByJob |
| `AvgJobTime`   | `string \| null` | jobSessionSummaryByJob |
| `MaxJobTime`   | `string \| null` | jobSessionSummaryByJob |

### New `EnrichedJob` type (`src/types/enriched-job.ts`)

```typescript
export interface EnrichedJob extends SafeJob {
  sessionData: SafeJobSession | null;
}
```

Joins job + session by `JobName` for the UI layer. Follows the existing pattern where `calculator-aggregator.ts` already does `Map<string, number>` lookups to join these two datasets.

### Update normalizer (`src/lib/normalizer.ts`)

Extract new fields using existing helpers (`parseNumeric`, `parseBoolean`, `normalizeString`). All new fields are **optional** — missing/invalid values default to `null`, never reject the row. This matches the existing pattern for `RetainDays`/`GfsDetails`/`SourceSizeGB`.

### New join function (`src/lib/enrich-jobs.ts`)

```typescript
export function enrichJobs(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): EnrichedJob[];
```

Builds a `Map<string, SafeJobSession>` from sessions, maps over jobs with `sessionData` lookup.

---

## Part 2: Formatting Utilities

### New file: `src/lib/format-utils.ts`

| Function                            | Input            | Output                                    | Example                                                                          |
| ----------------------------------- | ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `formatSize(gb)`                    | `number \| null` | `{ value: string, unit: string } \| null` | `500` → `{ value: "500", unit: "GB" }`, `1536` → `{ value: "1.50", unit: "TB" }` |
| `formatPercent(val)`                | `number \| null` | `string`                                  | `5.23` → `"5.2%"`, `null` → `"N/A"`                                              |
| `formatDuration(str)`               | `string \| null` | `string`                                  | `"00.09:23:18"` → `"9h 23m"`                                                     |
| `formatCompressionRatio(src, disk)` | `number, number` | `string`                                  | `(1024, 512)` → `"2.0x"`                                                         |

Extract duplicate `formatTB`/`formatPercent` from `calculator-inputs.tsx` into this shared module (DRY).

---

## Part 3: Smart Table Columns

### Add 3 columns to `src/components/dashboard/job-table.tsx`

Current: Status Icon | **Job Name** | **Type** | **Repository** | **Encrypted**

Proposed: Status Icon | **Job Name** | **Type** | **Repository** | **Source Size** | **Change Rate** | **GFS** | **Encrypted**

| Column          | Formatting                                                                                     | Sorting       |
| --------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| **Source Size** | Right-aligned, `font-mono`. Bold value + muted unit: **1.50** TB. Null → muted "N/A"           | Yes (numeric) |
| **Change Rate** | Right-aligned, `font-mono`. Color-coded: normal ≤10%, amber >10%, red >50%. Null → muted "N/A" | Yes (numeric) |
| **GFS**         | Compact badge: green "Yes" if `GfsEnabled`, muted "No" otherwise                               | Yes (boolean) |

**Change type from `SafeJob` to `EnrichedJob`** — table receives enriched jobs from dashboard-view.

### Row click handling

- Make rows interactive: `role="button"`, `tabIndex={0}`, `cursor-pointer`
- Click/Enter/Space → open detail sheet for that row
- Track `selectedJob` state in job-table component

---

## Part 4: Detail Sheet (Progressive Disclosure)

### Install shadcn Sheet

`npx shadcn@latest add sheet` → creates `src/components/ui/sheet.tsx`

### New file: `src/components/dashboard/job-detail-sheet.tsx`

Props: `{ job: EnrichedJob | null, open: boolean, onOpenChange: (open: boolean) => void }`

Slides in from the right on row click. Content organized into sections:

**Header:** Job Name (title), Job Type (subtitle), Encrypted badge

**Storage & Sizing:**

- Source Size (formatted)
- On-Disk Size (formatted)
- Compression Ratio (computed: SourceSizeGB / OnDiskGB)
- Change Rate (from session data, color-coded)

**Protection Policy:**

- Retention: `{RetainDays} days` + scheme
- Backup Chain Type
- Active Full / Synthetic Full status
- GFS breakdown (Weekly / Monthly / Yearly via `parseGfsDetails()` from `@/lib/calculator-aggregator`)

**Configuration:**

- Repository
- Compression Level
- Block Size
- Indexing

**Session Performance:**

- Success Rate (with color: green ≥95%, amber ≥80%, red <80%)
- Session Count + Fail count
- Avg / Max Job Time (formatted via `formatDuration`)

Layout: CSS grid property list (label left muted, value right mono). `ScrollArea` wrapping content. `Separator` between sections.

---

## Part 5: Dashboard Wiring

### Update `src/components/dashboard/dashboard-view.tsx`

Change from:

```tsx
<JobTable jobs={data.jobInfo} />
```

To:

```tsx
const enrichedJobs = useMemo(
  () => enrichJobs(data.jobInfo, data.jobSessionSummary),
  [data.jobInfo, data.jobSessionSummary],
);
// ...
<JobTable jobs={enrichedJobs} />;
```

---

## Implementation Order (TDD)

Each step follows Red-Green-Refactor per project standards.

### Task 1: Format utilities (no dependencies)

**Files:**

- Create `src/__tests__/format-utils.test.ts`
- Create `src/lib/format-utils.ts`
- Modify `src/components/dashboard/calculator-inputs.tsx` (import from shared module)

**Tests:**

- `formatSize`: null → null, 0 → "0 GB", 500 → "500 GB", 1024 → "1.00 TB", 1536 → "1.50 TB"
- `formatPercent`: null → "N/A", 0 → "0.0%", 5.23 → "5.2%"
- `formatDuration`: null → "N/A", "00.00:06:30" → "6m 30s", "00.09:23:18" → "9h 23m"
- `formatCompressionRatio`: both null → "N/A", source 0 → "N/A", normal → "2.0x"

**Verify:** `npm run test:run` passes, calculator-inputs still renders correctly.

### Task 2: Expand domain types + normalizer

**Files:**

- Modify `src/types/domain.ts` (+9 fields on SafeJob, +5 on SafeJobSession)
- Modify `src/lib/normalizer.ts` (extract new fields)
- Modify `src/__tests__/fixtures.ts` (add null defaults)
- Modify `src/__tests__/job-table.test.tsx` (MOCK_JOBS, createManyJobs)
- Modify `src/__tests__/calculator-aggregator.test.ts` (makeJob, makeSession)
- Modify `src/__tests__/domain-types.test.ts` (inline objects + new tests)
- Modify `src/__tests__/normalizer.test.ts` (new field extraction tests)

**Tests:**

- Type contracts for all new SafeJob fields (accept value, accept null)
- Type contracts for all new SafeJobSession fields
- Normalizer extracts OnDiskGB, GfsEnabled, BackupChainType, etc. from raw data
- Normalizer handles missing/invalid new fields gracefully (null, no row rejection)
- Normalizer extracts SuccessRate, SessionCount, Fails, AvgJobTime from session data

**Verify:** `npm run test:run` passes (all 352+ existing tests + new ones).

### Task 3: Enriched job join

**Files:**

- Create `src/types/enriched-job.ts`
- Create `src/lib/enrich-jobs.ts`
- Create `src/__tests__/enrich-jobs.test.ts`

**Tests:**

- Empty arrays → empty array
- Jobs with no matching sessions → sessionData is null
- Jobs with matching sessions → sessionData populated
- Multiple jobs, partial session matches
- Type contract: EnrichedJob extends SafeJob with sessionData

**Verify:** `npm run test:run` passes.

### Task 4: Install Sheet + smart columns

**Files:**

- Install `src/components/ui/sheet.tsx` (via `npx shadcn@latest add sheet`)
- Modify `src/components/dashboard/job-table.tsx` (EnrichedJob, +3 columns, row click)
- Modify `src/__tests__/job-table.test.tsx` (new column tests, row click tests)

**Tests:**

- Renders Source Size column header
- Renders formatted source size values (TB/GB with bold value + muted unit)
- Renders N/A for null source size
- Renders Change Rate column header
- Renders formatted change rate from session data
- Renders N/A for null change rate
- Applies warning color for change rate >10%
- Applies destructive color for change rate >50%
- Renders GFS column with Yes/No badges
- Right-aligns numeric columns
- Uses font-mono for numeric values
- Rows have role="button" and tabIndex={0}
- Clicking a row opens the detail sheet
- Enter/Space on a row opens the detail sheet
- Sorting works on Source Size and Change Rate

**Verify:** `npm run test:run` passes, `npm run build` succeeds.

### Task 5: Detail sheet

**Files:**

- Create `src/components/dashboard/job-detail-sheet.tsx`
- Create `src/__tests__/job-detail-sheet.test.tsx`

**Tests:**

- Renders job name as sheet title
- Renders job type as description
- Renders encryption badge
- Renders storage section with formatted values
- Renders compression ratio when both sizes available
- Renders protection policy section (retention, chain type, GFS breakdown)
- Renders configuration section (repo, compression, block size, indexing)
- Renders session performance section (success rate, session/fail counts, timing)
- Renders N/A for null session data
- Renders "None configured" when GFS not enabled
- Does not render when open is false
- Calls onOpenChange when closed
- Uses motion-safe prefix on animations

**Verify:** `npm run test:run` passes.

### Task 6: Dashboard wiring + final

**Files:**

- Modify `src/components/dashboard/dashboard-view.tsx` (enrichJobs call)
- Modify `src/__tests__/dashboard-view.test.tsx` (account for enriched data)

**Verify:**

- `npm run test:run` — all tests pass
- `npm run build` — clean compilation
- `npm run lint` — no errors
- Manual: `npm run dev` → upload example JSON → verify table columns, row click, sheet

---

## Files Modified

| File                                             | Change                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/types/domain.ts`                            | +9 fields on SafeJob, +5 fields on SafeJobSession          |
| `src/lib/normalizer.ts`                          | Extract new fields in jobInfo + jobSession normalization   |
| `src/components/dashboard/job-table.tsx`         | EnrichedJob type, +3 columns, row click, sheet integration |
| `src/components/dashboard/dashboard-view.tsx`    | enrichJobs() call, pass enriched data                      |
| `src/components/dashboard/calculator-inputs.tsx` | Import formatters from shared module                       |
| `src/__tests__/fixtures.ts`                      | Add null defaults for new fields                           |
| `src/__tests__/job-table.test.tsx`               | EnrichedJob type, new column tests, row click tests        |
| `src/__tests__/calculator-aggregator.test.ts`    | Update makeJob/makeSession with new field defaults         |
| `src/__tests__/domain-types.test.ts`             | New field type contracts                                   |
| `src/__tests__/dashboard-view.test.tsx`          | Account for enriched job passing                           |
| `src/__tests__/normalizer.test.ts`               | Tests for new field extraction                             |

## Files Created

| File                                            | Purpose                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/types/enriched-job.ts`                     | EnrichedJob interface (SafeJob + sessionData)                                        |
| `src/lib/format-utils.ts`                       | Shared formatting: formatSize, formatPercent, formatDuration, formatCompressionRatio |
| `src/lib/enrich-jobs.ts`                        | enrichJobs() join function                                                           |
| `src/components/dashboard/job-detail-sheet.tsx` | Sheet component for full job details                                                 |
| `src/components/ui/sheet.tsx`                   | shadcn Sheet primitive (via CLI)                                                     |
| `src/__tests__/format-utils.test.ts`            | Format utility tests                                                                 |
| `src/__tests__/enrich-jobs.test.ts`             | Join function tests                                                                  |
| `src/__tests__/job-detail-sheet.test.tsx`       | Detail sheet component tests                                                         |
