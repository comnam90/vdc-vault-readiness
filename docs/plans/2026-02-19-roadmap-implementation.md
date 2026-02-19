# Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver four phases of improvements: job table UX (truncation, filters, exclusion), repositories tab, recharts visuals, and Veeam sizing API integration.

**Architecture:** Phase 1 changes are all within `job-table.tsx` and its surrounding state in `dashboard-view.tsx`. Phases 2–4 add new files (aggregators, components, types) without modifying existing logic beyond wiring. Each phase ships as its own PR.

**Tech Stack:** React 19, TanStack Table v8, shadcn/ui, recharts v3.7.0, Vitest + React Testing Library, TypeScript strict.

---

## BEFORE YOU START

- Read `CLAUDE.md` (project root), `src/components/dashboard/CLAUDE.md`, `src/lib/CLAUDE.md`, `src/__tests__/CLAUDE.md`
- Run `npm run test:run` to confirm baseline passes (555 tests)
- Run `npm run build` to confirm baseline builds
- Branch naming: `feature/phase-1-job-table`, `feature/phase-2-repos-tab`, etc.

---

## PHASE 1: Job Table Improvements

---

### Task 1: Install missing shadcn components

**Files:**

- Auto-created: `src/components/ui/checkbox.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/popover.tsx`

**Step 1: Add components via shadcn CLI**

```bash
npx shadcn@3.8.3 add checkbox tooltip popover
```

Expected: three new files created in `src/components/ui/`.

**Step 2: Verify they render**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/ui/checkbox.tsx src/components/ui/tooltip.tsx src/components/ui/popover.tsx
git commit -m "feat(ui): add checkbox, tooltip, popover shadcn components"
```

---

### Task 2: Extend `buildCalculatorSummary` to filter excluded jobs

**Files:**

- Modify: `src/lib/calculator-aggregator.ts`
- Test: `src/__tests__/calculator-aggregator.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/calculator-aggregator.test.ts`:

```typescript
describe("buildCalculatorSummary with exclusions", () => {
  it("excludes jobs by name from all aggregations", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Job A", SourceSizeGB: 1024, RetainDays: 14 }),
      makeJob({ JobName: "Job B", SourceSizeGB: 1024, RetainDays: 60 }),
    ];
    const sessions: SafeJobSession[] = [
      makeSession({ JobName: "Job A", AvgChangeRate: 10 }),
      makeSession({ JobName: "Job B", AvgChangeRate: 20 }),
    ];
    const excluded = new Set(["Job B"]);
    const summary = buildCalculatorSummary(jobs, sessions, excluded);
    // Only Job A: 1024 GB = 1 TB
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
    // Only Job A change rate
    expect(summary.weightedAvgChangeRate).toBeCloseTo(10, 1);
    // Job A retention = 14, but minimum is 30
    expect(summary.maxRetentionDays).toBe(30);
  });

  it("returns full aggregation when excluded set is empty", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobName: "Job A", SourceSizeGB: 512 }),
      makeJob({ JobName: "Job B", SourceSizeGB: 512 }),
    ];
    const summary = buildCalculatorSummary(jobs, [], new Set());
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
  });

  it("handles undefined excluded set (backward compat)", () => {
    const jobs: SafeJob[] = [makeJob({ SourceSizeGB: 1024 })];
    const summary = buildCalculatorSummary(jobs, []);
    expect(summary.totalSourceDataTB).toBeCloseTo(1.0, 4);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- calculator-aggregator
```

Expected: FAIL — `buildCalculatorSummary` does not accept third argument.

**Step 3: Update `buildCalculatorSummary` signature**

In `src/lib/calculator-aggregator.ts`, update the function:

```typescript
export function buildCalculatorSummary(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
  excludedJobNames: Set<string> = new Set(),
): CalculatorSummary {
  const filteredJobs =
    excludedJobNames.size > 0
      ? jobs.filter((j) => !excludedJobNames.has(j.JobName))
      : jobs;
  const gfs = aggregateGfsMax(filteredJobs);
  const originalMax = getMaxRetentionDays(filteredJobs);

  return {
    totalSourceDataTB: calculateTotalSourceDataTB(filteredJobs),
    weightedAvgChangeRate: calculateWeightedChangeRate(filteredJobs, sessions),
    immutabilityDays: 30,
    maxRetentionDays:
      originalMax !== null
        ? Math.max(originalMax, MINIMUM_RETENTION_DAYS)
        : MINIMUM_RETENTION_DAYS,
    originalMaxRetentionDays: originalMax,
    gfsWeekly: gfs.weekly,
    gfsMonthly: gfs.monthly,
    gfsYearly: gfs.yearly,
  };
}
```

**Step 4: Run tests to verify pass**

```bash
npm run test:run -- calculator-aggregator
```

Expected: all calculator-aggregator tests pass.

**Step 5: Commit**

```bash
git add src/lib/calculator-aggregator.ts src/__tests__/calculator-aggregator.test.ts
git commit -m "feat(calculator): support excluded job names in buildCalculatorSummary"
```

---

### Task 3: Lift exclusion state to DashboardView; thread to CalculatorInputs

**Files:**

- Modify: `src/components/dashboard/dashboard-view.tsx`
- Modify: `src/components/dashboard/calculator-inputs.tsx`
- Test: `src/__tests__/calculator-inputs.test.tsx`
- Test: `src/__tests__/dashboard-view.test.tsx`

**Step 1: Write failing tests**

Add to `src/__tests__/calculator-inputs.test.tsx`:

```typescript
it("filters excluded jobs from totals", () => {
  const data: NormalizedDataset = {
    ...MOCK_DATA,
    jobInfo: [
      { ...MOCK_DATA.jobInfo[0], JobName: "Job A", SourceSizeGB: 1024 },
      { ...MOCK_DATA.jobInfo[1], JobName: "Job B", SourceSizeGB: 1024 },
    ],
    jobSessionSummary: [],
  };
  const excluded = new Set(["Job B"]);
  render(<CalculatorInputs data={data} validations={[]} excludedJobNames={excluded} />);
  // Only Job A: 1 TB
  expect(screen.getByText("1.00 TB")).toBeInTheDocument();
});
```

Add to `src/__tests__/dashboard-view.test.tsx`:

```typescript
it("renders Repositories tab trigger", () => {
  render(<DashboardView data={MOCK_DATA} validations={MIXED_VALIDATIONS} onReset={() => {}} />);
  expect(screen.getByRole("tab", { name: "Repositories" })).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run -- calculator-inputs dashboard-view
```

Expected: FAIL on the new tests.

**Step 3: Update `CalculatorInputs` props**

In `src/components/dashboard/calculator-inputs.tsx`:

```typescript
interface CalculatorInputsProps {
  data: NormalizedDataset;
  validations: ValidationResult[];
  excludedJobNames?: Set<string>;
}

export function CalculatorInputs({
  data,
  excludedJobNames = new Set(),
}: CalculatorInputsProps) {
  const summary = buildCalculatorSummary(
    data.jobInfo,
    data.jobSessionSummary,
    excludedJobNames,
  );
  // ... rest unchanged
}
```

**Step 4: Add exclusion state to `DashboardView`**

In `src/components/dashboard/dashboard-view.tsx`:

```typescript
// Add to imports
import type { EnrichedJob } from "@/types/enriched-job";

// Inside DashboardView component, after existing useState calls:
const [excludedJobNames, setExcludedJobNames] = useState<Set<string>>(new Set());

// Update JobTable render (in jobs TabsContent):
<JobTable
  jobs={enrichedJobs}
  excludedJobNames={excludedJobNames}
  onExcludedChange={setExcludedJobNames}
/>

// Update CalculatorInputs render (in sizing TabsContent):
<CalculatorInputs
  data={data}
  validations={validations}
  excludedJobNames={excludedJobNames}
/>
```

Also add the Repositories tab stub (content will be filled in Phase 2):

```typescript
// Add to TabsList:
<TabsTrigger value="repositories">Repositories</TabsTrigger>

// Add TabsContent after sizing:
<TabsContent
  value="repositories"
  className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 motion-safe:data-[state=active]:duration-150"
>
  <p className="text-muted-foreground text-sm">Repositories tab — coming soon.</p>
</TabsContent>
```

**Step 5: Update `JobTable` to accept new props (signature only — implementation in Task 5)**

In `src/components/dashboard/job-table.tsx`, update the interface:

```typescript
interface JobTableProps {
  jobs: EnrichedJob[];
  excludedJobNames?: Set<string>;
  onExcludedChange?: (names: Set<string>) => void;
}

export function JobTable({
  jobs,
  excludedJobNames = new Set(),
  onExcludedChange,
}: JobTableProps) {
  // ... existing implementation unchanged for now
}
```

**Step 6: Run tests**

```bash
npm run test:run -- calculator-inputs dashboard-view
```

Expected: new tests pass; no regressions.

**Step 7: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx src/components/dashboard/calculator-inputs.tsx src/components/dashboard/job-table.tsx src/__tests__/calculator-inputs.test.tsx src/__tests__/dashboard-view.test.tsx
git commit -m "feat(dashboard): lift exclusion state; wire to calculator and stub repos tab"
```

---

### Task 4: Add text truncation + Tooltip to Job Name and Repository columns

**Files:**

- Modify: `src/components/dashboard/job-table.tsx`
- Test: `src/__tests__/job-table.test.tsx`

**Step 1: Write the failing test**

Add to `src/__tests__/job-table.test.tsx`:

```typescript
it("applies truncation class to job name cells", () => {
  render(
    <JobTable
      jobs={[createEnrichedJob({ JobName: "A Very Long Job Name That Should Be Truncated" })]}
    />,
  );
  // The truncated span should exist in the DOM
  const truncated = document.querySelector(".truncate");
  expect(truncated).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- job-table
```

Expected: FAIL — no `.truncate` class exists.

**Step 3: Update column definitions in `job-table.tsx`**

Add imports at top:

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

Update the JobName column cell:

```typescript
columnHelper.accessor("JobName", {
  header: "Job Name",
  cell: (info) => {
    const value = info.getValue();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block max-w-[180px] truncate font-medium">{value}</span>
        </TooltipTrigger>
        <TooltipContent>{value}</TooltipContent>
      </Tooltip>
    );
  },
  enableSorting: true,
}),
```

Update the RepoName column cell:

```typescript
columnHelper.accessor("RepoName", {
  header: "Repository",
  cell: (info) => {
    const value = info.getValue();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block max-w-[140px] truncate">{value}</span>
        </TooltipTrigger>
        <TooltipContent>{value}</TooltipContent>
      </Tooltip>
    );
  },
}),
```

Wrap the entire return JSX in `<TooltipProvider>`:

```typescript
return (
  <TooltipProvider>
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-4 duration-300">
      {/* ... existing content ... */}
    </div>
  </TooltipProvider>
);
```

**Step 4: Run tests**

```bash
npm run test:run -- job-table
```

Expected: truncation test passes; existing tests pass.

**Step 5: Commit**

```bash
git add src/components/dashboard/job-table.tsx src/__tests__/job-table.test.tsx
git commit -m "feat(job-table): truncate long job/repo names with tooltip on hover"
```

---

### Task 5: Add checkbox exclusion column

**Files:**

- Modify: `src/components/dashboard/job-table.tsx`
- Test: `src/__tests__/job-table.test.tsx`

**Step 1: Write failing tests**

Add to `src/__tests__/job-table.test.tsx`:

```typescript
it("renders a checkbox for each job row", () => {
  render(
    <JobTable
      jobs={MOCK_JOBS}
      excludedJobNames={new Set()}
      onExcludedChange={() => {}}
    />,
  );
  const checkboxes = screen.getAllByRole("checkbox");
  expect(checkboxes.length).toBe(MOCK_JOBS.length);
});

it("calls onExcludedChange with job name when checkbox clicked", async () => {
  const onExcludedChange = vi.fn();
  render(
    <JobTable
      jobs={[createEnrichedJob({ JobName: "VM Backup Daily" })]}
      excludedJobNames={new Set()}
      onExcludedChange={onExcludedChange}
    />,
  );
  const checkbox = screen.getByRole("checkbox");
  fireEvent.click(checkbox);
  expect(onExcludedChange).toHaveBeenCalledWith(new Set(["VM Backup Daily"]));
});

it("shows excluded count badge when jobs are excluded", () => {
  render(
    <JobTable
      jobs={MOCK_JOBS}
      excludedJobNames={new Set(["VM Backup Daily"])}
      onExcludedChange={() => {}}
    />,
  );
  expect(screen.getByText(/1 job excluded/i)).toBeInTheDocument();
});

it("clicking checkbox does not open job detail sheet", () => {
  render(
    <JobTable
      jobs={[createEnrichedJob({ JobName: "VM Backup Daily" })]}
      excludedJobNames={new Set()}
      onExcludedChange={() => {}}
    />,
  );
  const checkbox = screen.getByRole("checkbox");
  fireEvent.click(checkbox);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run -- job-table
```

**Step 3: Add checkbox column to `job-table.tsx`**

Add import:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

The `columns` array is defined at module level, so it needs to become a function that accepts the props. Refactor column definitions into a function:

```typescript
function buildColumns(
  excludedJobNames: Set<string>,
  onExcludedChange: (names: Set<string>) => void,
) {
  return [
    columnHelper.display({
      id: "exclude",
      header: () => <span className="sr-only">Exclude from sizing</span>,
      cell: ({ row }) => {
        const jobName = row.original.JobName;
        const isExcluded = excludedJobNames.has(jobName);
        return (
          <Checkbox
            checked={isExcluded}
            aria-label={`Exclude ${jobName} from sizing`}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) => {
              const next = new Set(excludedJobNames);
              if (checked) {
                next.add(jobName);
              } else {
                next.delete(jobName);
              }
              onExcludedChange(next);
            }}
          />
        );
      },
      size: 40,
    }),
    // ... all existing columns (status, JobName, JobType, RepoName, sourceSize, changeRate, gfsEnabled, Encrypted)
  ];
}
```

In the `JobTable` component body, replace the static `columns` reference with:

```typescript
const columns = useMemo(
  () => buildColumns(excludedJobNames, onExcludedChange ?? (() => {})),
  [excludedJobNames, onExcludedChange],
);
```

Add `useMemo` to imports from React.

Above the table `<div>`, add the exclusion count indicator:

```typescript
{excludedJobNames.size > 0 && (
  <p className="text-muted-foreground text-sm">
    <span className="text-warning font-medium">{excludedJobNames.size}</span>{" "}
    {excludedJobNames.size === 1 ? "job excluded" : "jobs excluded"} from sizing
  </p>
)}
```

**Step 4: Update `colSpan` in empty state row**

The empty state `colSpan={columns.length}` already uses the dynamic columns array — verify it still works.

**Step 5: Run tests**

```bash
npm run test:run -- job-table
```

Expected: all checkbox tests pass; no regressions.

**Step 6: Commit**

```bash
git add src/components/dashboard/job-table.tsx src/__tests__/job-table.test.tsx
git commit -m "feat(job-table): add checkbox exclusion column wired to sizing calculator"
```

---

### Task 6: Add column-level filters

**Files:**

- Modify: `src/components/dashboard/job-table.tsx`
- Test: `src/__tests__/job-table.test.tsx`

**Step 1: Write failing tests**

Add to `src/__tests__/job-table.test.tsx`:

```typescript
it("filters rows by job type via multiselect", async () => {
  render(<JobTable jobs={MOCK_JOBS} />);
  // Open job type filter
  const typeFilterBtn = screen.getByRole("button", { name: /filter by type/i });
  fireEvent.click(typeFilterBtn);
  // Select "VMware Backup"
  const vmwareOption = screen.getByRole("checkbox", { name: /vmware backup/i });
  fireEvent.click(vmwareOption);
  // Only VMware jobs visible
  expect(screen.getByText("VM Backup Daily")).toBeInTheDocument();
  expect(screen.queryByText("SQL Agent Backup")).not.toBeInTheDocument();
});

it("filters rows by encryption toggle", () => {
  render(<JobTable jobs={MOCK_JOBS} />);
  const encryptedToggle = screen.getByRole("button", { name: /show encrypted only/i });
  fireEvent.click(encryptedToggle);
  expect(screen.getByText("VM Backup Daily")).toBeInTheDocument();
  expect(screen.queryByText("SQL Agent Backup")).not.toBeInTheDocument();
});

it("filters rows by GFS toggle", () => {
  render(<JobTable jobs={MOCK_JOBS} />);
  const gfsToggle = screen.getByRole("button", { name: /show gfs only/i });
  fireEvent.click(gfsToggle);
  expect(screen.getByText("VM Backup Daily")).toBeInTheDocument();
  expect(screen.queryByText("SQL Agent Backup")).not.toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run -- job-table
```

**Step 3: Update TanStack Table state and column definitions**

Add to `job-table.tsx` imports:

```typescript
import {
  type ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
```

Add state inside `JobTable`:

```typescript
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
```

Add to `useReactTable` config:

```typescript
state: { globalFilter, sorting, columnFilters },
onColumnFiltersChange: setColumnFilters,
```

Update column definitions in `buildColumns` to add filterFn per column:

**JobType column** — add filterFn:

```typescript
columnHelper.accessor("JobType", {
  header: "Type",
  filterFn: (row, _id, filterValue: string[]) => {
    if (!filterValue || filterValue.length === 0) return true;
    return filterValue.includes(row.original.JobType);
  },
  cell: (info) => info.getValue(),
}),
```

**RepoName column** — same pattern:

```typescript
columnHelper.accessor("RepoName", {
  header: "Repository",
  filterFn: (row, _id, filterValue: string[]) => {
    if (!filterValue || filterValue.length === 0) return true;
    return filterValue.includes(row.original.RepoName);
  },
  cell: (info) => { /* existing truncation cell */ },
}),
```

**Encrypted column** — add filterFn:

```typescript
columnHelper.accessor("Encrypted", {
  filterFn: (row, _id, filterValue: "all" | "yes" | "no") => {
    if (!filterValue || filterValue === "all") return true;
    return filterValue === "yes" ? row.original.Encrypted : !row.original.Encrypted;
  },
  // ... existing cell
}),
```

**GFS column** — add filterFn:

```typescript
columnHelper.accessor((row) => row.GfsEnabled ?? undefined, {
  id: "gfsEnabled",
  filterFn: (row, _id, filterValue: "all" | "yes" | "no") => {
    if (!filterValue || filterValue === "all") return true;
    const gfs = row.original.GfsEnabled;
    return filterValue === "yes" ? gfs === true : gfs === false;
  },
  // ... existing cell
}),
```

**Step 4: Add filter UI above the table**

Replace the existing standalone search `<Input>` section with a filter toolbar. The search moves into a column header–style row above the table. Keep the search Input but add filter controls alongside it:

```typescript
{/* Filter toolbar */}
<div className="flex flex-wrap items-center gap-2">
  {/* Job name search */}
  <Input
    placeholder="Search jobs..."
    value={globalFilter}
    onChange={(e) => setGlobalFilter(e.target.value)}
    className="max-w-[200px]"
  />

  {/* Job Type multiselect */}
  <MultiSelectFilter
    label="Type"
    options={[...new Set(jobs.map((j) => j.JobType))].sort()}
    value={(table.getColumn("JobType")?.getFilterValue() as string[]) ?? []}
    onChange={(v) => table.getColumn("JobType")?.setFilterValue(v.length ? v : undefined)}
  />

  {/* Repository multiselect */}
  <MultiSelectFilter
    label="Repository"
    options={[...new Set(jobs.map((j) => j.RepoName))].sort()}
    value={(table.getColumn("RepoName")?.getFilterValue() as string[]) ?? []}
    onChange={(v) => table.getColumn("RepoName")?.setFilterValue(v.length ? v : undefined)}
  />

  {/* Encrypted toggle */}
  <ThreeStateToggle
    label="Encrypted"
    ariaLabel="show encrypted only"
    value={(table.getColumn("Encrypted")?.getFilterValue() as "all" | "yes" | "no") ?? "all"}
    onChange={(v) => table.getColumn("Encrypted")?.setFilterValue(v === "all" ? undefined : v)}
  />

  {/* GFS toggle */}
  <ThreeStateToggle
    label="GFS"
    ariaLabel="show gfs only"
    value={(table.getColumn("gfsEnabled")?.getFilterValue() as "all" | "yes" | "no") ?? "all"}
    onChange={(v) => table.getColumn("gfsEnabled")?.setFilterValue(v === "all" ? undefined : v)}
  />

  {/* Active filter count */}
  {table.getFilteredRowModel().rows.length !== jobs.length && (
    <span className="text-muted-foreground text-sm tabular-nums">
      {table.getFilteredRowModel().rows.length} of {jobs.length} jobs
    </span>
  )}
</div>
```

**Step 5: Add `MultiSelectFilter` and `ThreeStateToggle` helper components** (in same file, above `JobTable`):

```typescript
interface MultiSelectFilterProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

function MultiSelectFilter({ label, options, value, onChange }: MultiSelectFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`filter by ${label.toLowerCase()}`}
          className={cn("h-8 gap-1 text-xs", value.length > 0 && "border-primary text-primary")}
        >
          <Filter className="size-3" aria-hidden="true" />
          {label}
          {value.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs">
              {value.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
              <Checkbox
                checked={value.includes(opt)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...value, opt]
                    : value.filter((v) => v !== opt);
                  onChange(next);
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type ToggleState = "all" | "yes" | "no";

interface ThreeStateToggleProps {
  label: string;
  ariaLabel: string;
  value: ToggleState;
  onChange: (v: ToggleState) => void;
}

function ThreeStateToggle({ label, ariaLabel, value, onChange }: ThreeStateToggleProps) {
  const cycle: ToggleState[] = ["all", "yes", "no"];
  const next = cycle[(cycle.indexOf(value) + 1) % cycle.length];
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className={cn(
        "h-8 text-xs",
        value === "yes" && "border-primary text-primary",
        value === "no" && "border-destructive text-destructive",
      )}
      onClick={() => onChange(next)}
    >
      {label}
      {value !== "all" && (
        <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs">
          {value === "yes" ? "Yes" : "No"}
        </Badge>
      )}
    </Button>
  );
}
```

**Step 6: Run tests**

```bash
npm run test:run -- job-table
```

Expected: all filter tests pass; no regressions.

**Step 7: Run full suite and build**

```bash
npm run test:run && npm run build
```

**Step 8: Commit**

```bash
git add src/components/dashboard/job-table.tsx src/__tests__/job-table.test.tsx
git commit -m "feat(job-table): add column-level filters for type, repo, encryption, GFS"
```

---

## PHASE 2: Repositories Tab

---

### Task 7: Create `deriveStandardRepos()` aggregator

**Files:**

- Create: `src/lib/repo-aggregator.ts`
- Test: `src/__tests__/repo-aggregator.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/repo-aggregator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { SafeJob } from "@/types/domain";
import { deriveStandardRepos } from "@/lib/repo-aggregator";

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "Test Job",
    JobType: "VMware Backup",
    Encrypted: true,
    RepoName: "LinuxHardened",
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

describe("deriveStandardRepos", () => {
  it("groups jobs by repo name and sums source TB", () => {
    const jobs: SafeJob[] = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, Encrypted: true }),
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024, Encrypted: true }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 512, Encrypted: false }),
    ];
    const result = deriveStandardRepos(jobs);
    expect(result).toHaveLength(2);
    const repoA = result.find((r) => r.repoName === "Repo A");
    expect(repoA?.jobCount).toBe(2);
    expect(repoA?.totalSourceTB).toBeCloseTo(2.0, 4);
    expect(repoA?.allEncrypted).toBe(true);
    const repoB = result.find((r) => r.repoName === "Repo B");
    expect(repoB?.allEncrypted).toBe(false);
  });

  it("returns null totalSourceTB when all jobs have null SourceSizeGB", () => {
    const jobs = [makeJob({ RepoName: "Repo A", SourceSizeGB: null })];
    const result = deriveStandardRepos(jobs);
    expect(result[0].totalSourceTB).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(deriveStandardRepos([])).toEqual([]);
  });

  it("sorts by totalSourceTB descending (nulls last)", () => {
    const jobs: SafeJob[] = [
      makeJob({ RepoName: "Small", SourceSizeGB: 100 }),
      makeJob({ RepoName: "Large", SourceSizeGB: 5000 }),
      makeJob({ RepoName: "Unknown", SourceSizeGB: null }),
    ];
    const result = deriveStandardRepos(jobs);
    expect(result[0].repoName).toBe("Large");
    expect(result[1].repoName).toBe("Small");
    expect(result[2].repoName).toBe("Unknown");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- repo-aggregator
```

Expected: FAIL — module not found.

**Step 3: Create `src/lib/repo-aggregator.ts`**

```typescript
import type { SafeJob } from "@/types/domain";

export interface StandardRepo {
  repoName: string;
  jobCount: number;
  totalSourceTB: number | null;
  allEncrypted: boolean;
}

export function deriveStandardRepos(jobs: SafeJob[]): StandardRepo[] {
  const map = new Map<
    string,
    { sumGB: number | null; count: number; allEncrypted: boolean }
  >();

  for (const job of jobs) {
    const existing = map.get(job.RepoName);
    if (!existing) {
      map.set(job.RepoName, {
        sumGB: job.SourceSizeGB,
        count: 1,
        allEncrypted: job.Encrypted,
      });
    } else {
      const newSum =
        existing.sumGB === null && job.SourceSizeGB === null
          ? null
          : (existing.sumGB ?? 0) + (job.SourceSizeGB ?? 0);
      map.set(job.RepoName, {
        sumGB: newSum,
        count: existing.count + 1,
        allEncrypted: existing.allEncrypted && job.Encrypted,
      });
    }
  }

  const repos: StandardRepo[] = Array.from(map.entries()).map(
    ([repoName, { sumGB, count, allEncrypted }]) => ({
      repoName,
      jobCount: count,
      totalSourceTB: sumGB !== null ? sumGB / 1024 : null,
      allEncrypted,
    }),
  );

  return repos.sort((a, b) => {
    if (a.totalSourceTB === null && b.totalSourceTB === null) return 0;
    if (a.totalSourceTB === null) return 1;
    if (b.totalSourceTB === null) return -1;
    return b.totalSourceTB - a.totalSourceTB;
  });
}
```

**Step 4: Run tests**

```bash
npm run test:run -- repo-aggregator
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/repo-aggregator.ts src/__tests__/repo-aggregator.test.ts
git commit -m "feat(repos): add deriveStandardRepos aggregator"
```

---

### Task 8: Create `SobrDetailSheet` component

**Files:**

- Create: `src/components/dashboard/sobr-detail-sheet.tsx`
- Test: `src/__tests__/sobr-detail-sheet.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/sobr-detail-sheet.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SobrDetailSheet } from "@/components/dashboard/sobr-detail-sheet";
import type { SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";

const MOCK_SOBR: SafeSobr = {
  Name: "SOBR-01",
  EnableCapacityTier: true,
  CapacityTierCopy: false,
  CapacityTierMove: true,
  ArchiveTierEnabled: true,
  ImmutableEnabled: true,
  ExtentCount: 2,
  JobCount: 5,
  PolicyType: "GFS",
  UsePerVMFiles: true,
  CapTierType: "Amazon S3",
  ImmutablePeriod: 30,
  SizeLimitEnabled: false,
  SizeLimit: null,
};

const MOCK_CAP_EXTENT: SafeCapExtent = {
  Name: "Perf-Extent-01",
  SobrName: "SOBR-01",
  EncryptionEnabled: true,
  ImmutableEnabled: true,
  Type: "Hardened Repository",
  Status: "Online",
  CopyModeEnabled: false,
  MoveModeEnabled: false,
  MovePeriodDays: null,
  ImmutablePeriod: 30,
  SizeLimitEnabled: false,
  SizeLimit: null,
};

const MOCK_ARCH_EXTENT: SafeArchExtent = {
  SobrName: "SOBR-01",
  Name: "Archive-Extent-01",
  ArchiveTierEnabled: true,
  EncryptionEnabled: true,
  ImmutableEnabled: false,
  RetentionPeriod: 365,
  CostOptimizedEnabled: true,
  FullBackupModeEnabled: false,
  ImmutablePeriod: null,
};

describe("SobrDetailSheet", () => {
  it("renders SOBR name in sheet title when open", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[MOCK_CAP_EXTENT]}
        archExtents={[MOCK_ARCH_EXTENT]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("SOBR-01")).toBeInTheDocument();
  });

  it("shows performance tier section with extent details", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[MOCK_CAP_EXTENT]}
        archExtents={[]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText(/performance tier/i)).toBeInTheDocument();
    expect(screen.getByText("Perf-Extent-01")).toBeInTheDocument();
  });

  it("shows archive tier section when archExtents provided", () => {
    render(
      <SobrDetailSheet
        sobr={MOCK_SOBR}
        capExtents={[]}
        archExtents={[MOCK_ARCH_EXTENT]}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText(/archive tier/i)).toBeInTheDocument();
    expect(screen.getByText("Archive-Extent-01")).toBeInTheDocument();
  });

  it("renders nothing when sobr is null", () => {
    render(
      <SobrDetailSheet
        sobr={null}
        capExtents={[]}
        archExtents={[]}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText("SOBR-01")).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- sobr-detail-sheet
```

**Step 3: Create `src/components/dashboard/sobr-detail-sheet.tsx`**

```typescript
import type { SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";
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
import { cn } from "@/lib/utils";

interface SobrDetailSheetProps {
  sobr: SafeSobr | null;
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

function BoolBadge({ value, trueLabel = "Enabled", falseLabel = "Disabled" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">{trueLabel}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">{falseLabel}</Badge>
  );
}

function CapExtentRow({ extent }: { extent: SafeCapExtent }) {
  return (
    <div className="rounded-md border p-3 space-y-1.5">
      <p className="font-medium text-sm">{extent.Name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Type</span>
        <span>{extent.Type ?? "N/A"}</span>
        <span className="text-muted-foreground">Status</span>
        <span>{extent.Status ?? "N/A"}</span>
        <span className="text-muted-foreground">Encryption</span>
        <BoolBadge value={extent.EncryptionEnabled} />
        <span className="text-muted-foreground">Immutability</span>
        <span>{extent.ImmutableEnabled ? `${extent.ImmutablePeriod ?? "?"} days` : "Disabled"}</span>
        {extent.MoveModeEnabled && (
          <>
            <span className="text-muted-foreground">Move after</span>
            <span>{extent.MovePeriodDays ?? "?"} days</span>
          </>
        )}
      </div>
    </div>
  );
}

function ArchExtentRow({ extent }: { extent: SafeArchExtent }) {
  return (
    <div className="rounded-md border p-3 space-y-1.5">
      <p className="font-medium text-sm">{extent.Name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Encryption</span>
        <BoolBadge value={extent.EncryptionEnabled} />
        <span className="text-muted-foreground">Retention</span>
        <span>{extent.RetentionPeriod != null ? `${extent.RetentionPeriod} days` : "N/A"}</span>
        <span className="text-muted-foreground">Cost Optimized</span>
        <BoolBadge value={extent.CostOptimizedEnabled ?? false} />
      </div>
    </div>
  );
}

export function SobrDetailSheet({ sobr, capExtents, archExtents, open, onOpenChange }: SobrDetailSheetProps) {
  if (!sobr) {
    return <Sheet open={false} onOpenChange={onOpenChange}><SheetContent side="right" /></Sheet>;
  }

  // Performance tier = non-cloud cap extents; Capacity tier = cloud/object extents
  const perfExtents = capExtents.filter(
    (e) => e.Type && !e.Type.toLowerCase().includes("cloud") && !e.Type.toLowerCase().includes("object") && !e.Type.toLowerCase().includes("amazon") && !e.Type.toLowerCase().includes("azure"),
  );
  const capTierExtents = capExtents.filter((e) => !perfExtents.includes(e));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("motion-safe:data-[state=open]:animate-in sm:max-w-md")}>
        <SheetHeader className="pr-8">
          <SheetTitle>{sobr.Name}</SheetTitle>
          <SheetDescription>Scale-Out Backup Repository</SheetDescription>
          <div className="flex flex-wrap gap-1 pt-1">
            {sobr.ImmutableEnabled && (
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                Immutable
              </Badge>
            )}
            {sobr.EnableCapacityTier && (
              <Badge variant="outline">Capacity Tier</Badge>
            )}
            {sobr.ArchiveTierEnabled && (
              <Badge variant="outline">Archive Tier</Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-5">
            <div className="space-y-1">
              <SectionHeading>Configuration</SectionHeading>
              <PropertyRow label="Jobs">{sobr.JobCount ?? "N/A"}</PropertyRow>
              <PropertyRow label="Extents">{sobr.ExtentCount ?? "N/A"}</PropertyRow>
              <PropertyRow label="Policy Type">{sobr.PolicyType ?? "N/A"}</PropertyRow>
              <PropertyRow label="Per-VM Files">
                <BoolBadge value={sobr.UsePerVMFiles ?? false} />
              </PropertyRow>
            </div>

            {perfExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Performance Tier</SectionHeading>
                  {perfExtents.map((e) => <CapExtentRow key={e.Name} extent={e} />)}
                </div>
              </>
            )}

            {capTierExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Capacity Tier</SectionHeading>
                  {capTierExtents.map((e) => <CapExtentRow key={e.Name} extent={e} />)}
                </div>
              </>
            )}

            {archExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Archive Tier</SectionHeading>
                  {archExtents.map((e) => <ArchExtentRow key={e.Name} extent={e} />)}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 4: Run tests**

```bash
npm run test:run -- sobr-detail-sheet
```

**Step 5: Commit**

```bash
git add src/components/dashboard/sobr-detail-sheet.tsx src/__tests__/sobr-detail-sheet.test.tsx
git commit -m "feat(repos): add SobrDetailSheet slide-out with performance/capacity/archive tiers"
```

---

### Task 9: Create `RepositoriesTab` component

**Files:**

- Create: `src/components/dashboard/repositories-tab.tsx`
- Test: `src/__tests__/repositories-tab.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/repositories-tab.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepositoriesTab } from "@/components/dashboard/repositories-tab";
import type { SafeJob, SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";

const MOCK_JOBS: SafeJob[] = [
  {
    JobName: "Job A", JobType: "VMware Backup", Encrypted: true,
    RepoName: "LinuxHardened", SourceSizeGB: 1024, RetainDays: null,
    GfsDetails: null, OnDiskGB: null, RetentionScheme: null, CompressionLevel: null,
    BlockSize: null, GfsEnabled: null, ActiveFullEnabled: null,
    SyntheticFullEnabled: null, BackupChainType: null, IndexingEnabled: null,
  },
];

const MOCK_SOBR: SafeSobr = {
  Name: "SOBR-01", EnableCapacityTier: true, CapacityTierCopy: false,
  CapacityTierMove: true, ArchiveTierEnabled: false, ImmutableEnabled: true,
  ExtentCount: 1, JobCount: 3, PolicyType: null, UsePerVMFiles: null,
  CapTierType: null, ImmutablePeriod: 30, SizeLimitEnabled: null, SizeLimit: null,
};

describe("RepositoriesTab", () => {
  it("renders standard repos section heading", () => {
    render(
      <RepositoriesTab jobs={MOCK_JOBS} sobr={[]} capExtents={[]} archExtents={[]} />,
    );
    expect(screen.getByText(/standard repositories/i)).toBeInTheDocument();
  });

  it("renders repo names from jobs", () => {
    render(
      <RepositoriesTab jobs={MOCK_JOBS} sobr={[]} capExtents={[]} archExtents={[]} />,
    );
    expect(screen.getByText("LinuxHardened")).toBeInTheDocument();
  });

  it("renders SOBR repos section heading", () => {
    render(
      <RepositoriesTab jobs={[]} sobr={[MOCK_SOBR]} capExtents={[]} archExtents={[]} />,
    );
    expect(screen.getByText(/scale-out repositories/i)).toBeInTheDocument();
  });

  it("clicking SOBR row opens detail sheet", () => {
    render(
      <RepositoriesTab jobs={[]} sobr={[MOCK_SOBR]} capExtents={[]} archExtents={[]} />,
    );
    fireEvent.click(screen.getByText("SOBR-01"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows empty state when no standard repos", () => {
    render(
      <RepositoriesTab jobs={[]} sobr={[]} capExtents={[]} archExtents={[]} />,
    );
    expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- repositories-tab
```

**Step 3: Create `src/components/dashboard/repositories-tab.tsx`**

```typescript
import { useState } from "react";
import type { SafeJob, SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";
import { deriveStandardRepos } from "@/lib/repo-aggregator";
import { formatTB } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SobrDetailSheet } from "./sobr-detail-sheet";

interface RepositoriesTabProps {
  jobs: SafeJob[];
  sobr: SafeSobr[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
}

export function RepositoriesTab({ jobs, sobr, capExtents, archExtents }: RepositoriesTabProps) {
  const [selectedSobr, setSelectedSobr] = useState<SafeSobr | null>(null);
  const standardRepos = deriveStandardRepos(jobs);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 duration-300">
      {/* Standard Repositories */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Standard Repositories
        </h2>
        {standardRepos.length === 0 ? (
          <p className="text-muted-foreground text-sm">No repositories found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Repository</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Jobs</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase text-right">Source Data</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Encrypted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardRepos.map((repo) => (
                  <TableRow key={repo.repoName}>
                    <TableCell className="font-medium">{repo.repoName}</TableCell>
                    <TableCell>{repo.jobCount}</TableCell>
                    <TableCell className="text-right font-mono">
                      {repo.totalSourceTB !== null ? formatTB(repo.totalSourceTB) : "N/A"}
                    </TableCell>
                    <TableCell>
                      {repo.allEncrypted ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* SOBR Repositories */}
      {sobr.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Scale-Out Repositories
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Capacity Tier</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Archive Tier</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Immutability</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Extents</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Jobs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sobr.map((s) => (
                  <TableRow
                    key={s.Name}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => setSelectedSobr(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSobr(s);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{s.Name}</TableCell>
                    <TableCell>
                      {s.EnableCapacityTier ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.ArchiveTierEnabled ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.ImmutableEnabled ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                          {s.ImmutablePeriod != null ? `${s.ImmutablePeriod}d` : "Yes"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>{s.ExtentCount ?? "N/A"}</TableCell>
                    <TableCell>{s.JobCount ?? "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <SobrDetailSheet
        sobr={selectedSobr}
        capExtents={capExtents.filter((e) => selectedSobr && e.SobrName === selectedSobr.Name)}
        archExtents={archExtents.filter((e) => selectedSobr && e.SobrName === selectedSobr.Name)}
        open={selectedSobr !== null}
        onOpenChange={(open) => { if (!open) setSelectedSobr(null); }}
      />
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npm run test:run -- repositories-tab sobr-detail-sheet
```

**Step 5: Commit**

```bash
git add src/components/dashboard/repositories-tab.tsx src/__tests__/repositories-tab.test.tsx
git commit -m "feat(repos): add RepositoriesTab with standard and SOBR repo tables"
```

---

### Task 10: Wire `RepositoriesTab` into `DashboardView`

**Files:**

- Modify: `src/components/dashboard/dashboard-view.tsx`
- Test: `src/__tests__/dashboard-view.test.tsx`

**Step 1: Write failing test**

Add to `src/__tests__/dashboard-view.test.tsx`:

```typescript
it("renders repo names in Repositories tab", async () => {
  const { user } = render(
    <DashboardView data={MOCK_DATA} validations={ALL_PASS_VALIDATIONS} onReset={() => {}} />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Repositories" }));
  expect(screen.getByText("LinuxHardened")).toBeInTheDocument();
});
```

**Step 2: Run to verify fail**

```bash
npm run test:run -- dashboard-view
```

**Step 3: Update `dashboard-view.tsx`**

Add import:

```typescript
import { RepositoriesTab } from "./repositories-tab";
```

Replace the stub Repositories `TabsContent` with:

```typescript
<TabsContent
  value="repositories"
  className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 motion-safe:data-[state=active]:duration-150"
>
  <RepositoriesTab
    jobs={data.jobInfo}
    sobr={data.sobr}
    capExtents={data.capExtents}
    archExtents={data.archExtents}
  />
</TabsContent>
```

**Step 4: Run full test suite**

```bash
npm run test:run
```

**Step 5: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx src/__tests__/dashboard-view.test.tsx
git commit -m "feat(repos): wire RepositoriesTab into DashboardView"
```

---

## PHASE 3: Recharts Visuals

---

### Task 11: Create chart data selectors

**Files:**

- Create: `src/lib/chart-selectors.ts`
- Test: `src/__tests__/chart-selectors.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/chart-selectors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { SafeJob, SafeJobSession } from "@/types/domain";
import {
  groupByJobType,
  bucketChangeRates,
  groupByRepo,
} from "@/lib/chart-selectors";

function makeJob(overrides: Partial<SafeJob> = {}): SafeJob {
  return {
    JobName: "Job",
    JobType: "VMware Backup",
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

describe("groupByJobType", () => {
  it("sums source TB per job type, sorted descending", () => {
    const jobs: SafeJob[] = [
      makeJob({ JobType: "VMware Backup", SourceSizeGB: 2048 }),
      makeJob({ JobType: "VMware Backup", SourceSizeGB: 1024 }),
      makeJob({ JobType: "Agent Backup", SourceSizeGB: 512 }),
    ];
    const result = groupByJobType(jobs);
    expect(result[0]).toEqual({
      jobType: "VMware Backup",
      totalTB: expect.closeTo(3.0, 2),
    });
    expect(result[1]).toEqual({
      jobType: "Agent Backup",
      totalTB: expect.closeTo(0.5, 2),
    });
  });

  it("excludes jobs with null SourceSizeGB from totals", () => {
    const jobs = [makeJob({ JobType: "VMware Backup", SourceSizeGB: null })];
    const result = groupByJobType(jobs);
    expect(result[0].totalTB).toBe(0);
  });
});

describe("bucketChangeRates", () => {
  it("places jobs into correct buckets", () => {
    const jobs = [
      makeJob({ JobName: "J1" }),
      makeJob({ JobName: "J2" }),
      makeJob({ JobName: "J3" }),
    ];
    const sessions: SafeJobSession[] = [
      {
        JobName: "J1",
        AvgChangeRate: 3,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
      {
        JobName: "J2",
        AvgChangeRate: 12,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
      {
        JobName: "J3",
        AvgChangeRate: 60,
        MaxDataSize: null,
        SuccessRate: null,
        SessionCount: null,
        Fails: null,
        AvgJobTime: null,
        MaxJobTime: null,
      },
    ];
    const result = bucketChangeRates(jobs, sessions);
    expect(result.find((b) => b.bucket === "0–5%")?.count).toBe(1);
    expect(result.find((b) => b.bucket === "5–10%")?.count).toBe(0);
    expect(result.find((b) => b.bucket === "10–25%")?.count).toBe(1);
    expect(result.find((b) => b.bucket === ">50%")?.count).toBe(1);
  });
});

describe("groupByRepo", () => {
  it("sums source TB per repo, sorted descending", () => {
    const jobs = [
      makeJob({ RepoName: "Repo A", SourceSizeGB: 1024 }),
      makeJob({ RepoName: "Repo B", SourceSizeGB: 2048 }),
    ];
    const result = groupByRepo(jobs);
    expect(result[0].repoName).toBe("Repo B");
    expect(result[1].repoName).toBe("Repo A");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- chart-selectors
```

**Step 3: Create `src/lib/chart-selectors.ts`**

```typescript
import type { SafeJob, SafeJobSession } from "@/types/domain";

export interface JobTypeChartDatum {
  jobType: string;
  totalTB: number;
}

export interface ChangeRateBucket {
  bucket: string;
  count: number;
  color: string;
}

export interface RepoChartDatum {
  repoName: string;
  totalTB: number;
}

const CHANGE_RATE_BUCKETS: { label: string; max: number; color: string }[] = [
  { label: "0–5%", max: 5, color: "var(--color-primary)" },
  { label: "5–10%", max: 10, color: "var(--color-primary)" },
  { label: "10–25%", max: 25, color: "oklch(0.85 0.15 85)" },
  { label: "25–50%", max: 50, color: "oklch(0.75 0.18 40)" },
  { label: ">50%", max: Infinity, color: "var(--color-destructive)" },
];

export function groupByJobType(jobs: SafeJob[]): JobTypeChartDatum[] {
  const map = new Map<string, number>();
  for (const job of jobs) {
    const prev = map.get(job.JobType) ?? 0;
    map.set(job.JobType, prev + (job.SourceSizeGB ?? 0));
  }
  return Array.from(map.entries())
    .map(([jobType, sumGB]) => ({ jobType, totalTB: sumGB / 1024 }))
    .sort((a, b) => b.totalTB - a.totalTB);
}

export function bucketChangeRates(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): ChangeRateBucket[] {
  const rateByJob = new Map<string, number>();
  for (const s of sessions) {
    if (s.AvgChangeRate != null) rateByJob.set(s.JobName, s.AvgChangeRate);
  }

  const counts = CHANGE_RATE_BUCKETS.map(() => 0);
  for (const job of jobs) {
    const rate = rateByJob.get(job.JobName);
    if (rate == null) continue;
    for (let i = 0; i < CHANGE_RATE_BUCKETS.length; i++) {
      if (rate <= CHANGE_RATE_BUCKETS[i].max) {
        counts[i]++;
        break;
      }
    }
  }

  return CHANGE_RATE_BUCKETS.map((b, i) => ({
    bucket: b.label,
    count: counts[i],
    color: b.color,
  }));
}

export function groupByRepo(jobs: SafeJob[]): RepoChartDatum[] {
  const map = new Map<string, number>();
  for (const job of jobs) {
    const prev = map.get(job.RepoName) ?? 0;
    map.set(job.RepoName, prev + (job.SourceSizeGB ?? 0));
  }
  return Array.from(map.entries())
    .map(([repoName, sumGB]) => ({ repoName, totalTB: sumGB / 1024 }))
    .sort((a, b) => b.totalTB - a.totalTB);
}
```

**Step 4: Run tests**

```bash
npm run test:run -- chart-selectors
```

**Step 5: Commit**

```bash
git add src/lib/chart-selectors.ts src/__tests__/chart-selectors.test.ts
git commit -m "feat(charts): add chart data selector functions (groupByJobType, bucketChangeRates, groupByRepo)"
```

---

### Task 12: Create `JobsCharts` component

**Files:**

- Create: `src/components/dashboard/jobs-charts.tsx`
- Test: `src/__tests__/jobs-charts.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/jobs-charts.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock recharts — jsdom cannot render SVG
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div />,
}));

import { JobsCharts } from "@/components/dashboard/jobs-charts";
import type { EnrichedJob } from "@/types/enriched-job";

function makeJob(overrides: Partial<EnrichedJob> = {}): EnrichedJob {
  return {
    JobName: "Job", JobType: "VMware Backup", Encrypted: true, RepoName: "Repo",
    RetainDays: null, GfsDetails: null, SourceSizeGB: 1024, OnDiskGB: null,
    RetentionScheme: null, CompressionLevel: null, BlockSize: null, GfsEnabled: null,
    ActiveFullEnabled: null, SyntheticFullEnabled: null, BackupChainType: null,
    IndexingEnabled: null, sessionData: null, ...overrides,
  };
}

describe("JobsCharts", () => {
  it("renders source size by job type heading", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getByText(/source size by job type/i)).toBeInTheDocument();
  });

  it("renders change rate distribution heading", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getByText(/change rate distribution/i)).toBeInTheDocument();
  });

  it("renders recharts containers", () => {
    render(<JobsCharts jobs={[makeJob()]} />);
    expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
  });

  it("renders nothing when jobs array is empty", () => {
    const { container } = render(<JobsCharts jobs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- jobs-charts
```

**Step 3: Create `src/components/dashboard/jobs-charts.tsx`**

```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { EnrichedJob } from "@/types/enriched-job";
import { groupByJobType, bucketChangeRates } from "@/lib/chart-selectors";

interface JobsChartsProps {
  jobs: EnrichedJob[];
}

const CHART_HEIGHT = 200;

export function JobsCharts({ jobs }: JobsChartsProps) {
  if (jobs.length === 0) return null;

  const sessions = jobs
    .filter((j) => j.sessionData != null)
    .map((j) => j.sessionData!);

  const byType = groupByJobType(jobs);
  const changeRateBuckets = bucketChangeRates(jobs, sessions);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Source Size by Job Type
        </p>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toFixed(1)} TB`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="jobType"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={(v: number) => [`${v.toFixed(2)} TB`, "Source"]} />
            <Bar dataKey="totalTB" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Change Rate Distribution
        </p>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={changeRateBuckets} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v, "Jobs"]} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {changeRateBuckets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npm run test:run -- jobs-charts
```

**Step 5: Commit**

```bash
git add src/components/dashboard/jobs-charts.tsx src/__tests__/jobs-charts.test.tsx
git commit -m "feat(charts): add JobsCharts with source size by type and change rate distribution"
```

---

### Task 13: Create `RepoSizeChart` and wire all charts

**Files:**

- Create: `src/components/dashboard/repo-size-chart.tsx`
- Test: `src/__tests__/repo-size-chart.test.tsx`
- Modify: `src/components/dashboard/dashboard-view.tsx`
- Modify: `src/components/dashboard/repositories-tab.tsx`

**Step 1: Write failing tests**

Create `src/__tests__/repo-size-chart.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

import { RepoSizeChart } from "@/components/dashboard/repo-size-chart";
import type { RepoChartDatum } from "@/lib/chart-selectors";

describe("RepoSizeChart", () => {
  it("renders heading", () => {
    const data: RepoChartDatum[] = [{ repoName: "Repo A", totalTB: 2 }];
    render(<RepoSizeChart data={data} />);
    expect(screen.getByText(/source size by repository/i)).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<RepoSizeChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

**Step 2: Run to verify fail**

```bash
npm run test:run -- repo-size-chart
```

**Step 3: Create `src/components/dashboard/repo-size-chart.tsx`**

```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RepoChartDatum } from "@/lib/chart-selectors";

interface RepoSizeChartProps {
  data: RepoChartDatum[];
}

export function RepoSizeChart({ data }: RepoSizeChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Source Size by Repository
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v.toFixed(1)} TB`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="repoName"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} TB`, "Source"]} />
          <Bar dataKey="totalTB" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4: Wire `JobsCharts` into Jobs tab in `dashboard-view.tsx`**

Add import:

```typescript
import { JobsCharts } from "./jobs-charts";
```

In the jobs `TabsContent`, render charts above the table:

```typescript
<TabsContent value="jobs" ...>
  <div className="space-y-6">
    <JobsCharts jobs={enrichedJobs} />
    <JobTable
      jobs={enrichedJobs}
      excludedJobNames={excludedJobNames}
      onExcludedChange={setExcludedJobNames}
    />
  </div>
</TabsContent>
```

**Step 5: Wire `RepoSizeChart` into `RepositoriesTab`**

Add imports:

```typescript
import { groupByRepo } from "@/lib/chart-selectors";
import { RepoSizeChart } from "./repo-size-chart";
```

Add above the standard repos table:

```typescript
<RepoSizeChart data={groupByRepo(jobs)} />
```

**Step 6: Run full test suite**

```bash
npm run test:run
```

**Step 7: Commit**

```bash
git add src/components/dashboard/repo-size-chart.tsx src/__tests__/repo-size-chart.test.tsx src/components/dashboard/dashboard-view.tsx src/components/dashboard/repositories-tab.tsx
git commit -m "feat(charts): add RepoSizeChart and wire all charts into tabs"
```

---

## PHASE 4: Veeam Sizing API Integration

---

### Task 14: Define Veeam API types

**Files:**

- Create: `src/types/veeam-api.ts`

**Step 1: Create the type file** (no test — type-only):

```typescript
export interface VmAgentRequest {
  sourceTB: number;
  ChangeRate: number;
  Reduction: number;
  backupWindowHours: number;
  GrowthRatePercent: number;
  GrowthRateScopeYears: number;
  days: number;
  Weeklies: number;
  Monthlies: number;
  Yearlies: number;
  Blockcloning: boolean;
  ObjectStorage: boolean;
  moveCapacityTierEnabled: boolean;
  immutablePerf: boolean;
  immutablePerfDays: number;
  isCapTierVDCV: boolean;
  productVersion: number;
  instanceCount: number;
}

export interface ComputeVolume {
  diskGB: number;
  diskPurpose: number; // 3=perf, 13=capacity/cache, 4=logs
}

export interface ComputeSpec {
  cores: number;
  ram: number;
  volumes: ComputeVolume[];
}

export interface ComputeNode {
  compute: ComputeSpec;
}

export interface MonthlyTransactions {
  firstMonthTransactions: number;
  secondMonthTransactions: number;
  finalMonthTransactions: number;
}

export interface TransactionCosts {
  performanceTierTransactions?: MonthlyTransactions;
  capacityTierTransactions?: MonthlyTransactions;
  archiveTierTransactions?: MonthlyTransactions;
}

export interface VmAgentResponseData {
  totalStorageTB: number;
  proxyCompute: ComputeNode;
  repoCompute: ComputeNode;
  transactions: TransactionCosts;
  performanceTierImmutabilityTaxGB: number;
  capacityTierImmutabilityTaxGB: number;
}

export interface VmAgentResponse {
  success: boolean;
  data: VmAgentResponseData;
}
```

**Step 2: Verify it compiles**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/types/veeam-api.ts
git commit -m "feat(api): add Veeam sizing API request/response types"
```

---

### Task 15: Create `callVmAgentApi()` function

**Files:**

- Create: `src/lib/veeam-api.ts`
- Test: `src/__tests__/veeam-api.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/veeam-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CalculatorSummary } from "@/types/calculator";
import { buildVmAgentRequest, callVmAgentApi } from "@/lib/veeam-api";
import type { VmAgentResponse } from "@/types/veeam-api";

const MOCK_SUMMARY: CalculatorSummary = {
  totalSourceDataTB: 5.0,
  weightedAvgChangeRate: 8.0,
  immutabilityDays: 30,
  maxRetentionDays: 30,
  originalMaxRetentionDays: 14,
  gfsWeekly: 4,
  gfsMonthly: 12,
  gfsYearly: 1,
};

const MOCK_RESPONSE: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: {
      compute: {
        cores: 8,
        ram: 16,
        volumes: [{ diskGB: 13500, diskPurpose: 3 }],
      },
    },
    transactions: {},
    performanceTierImmutabilityTaxGB: 250,
    capacityTierImmutabilityTaxGB: 0,
  },
};

describe("buildVmAgentRequest", () => {
  it("maps summary fields to request payload", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 30);
    expect(req.sourceTB).toBe(5.0);
    expect(req.ChangeRate).toBe(8.0);
    expect(req.days).toBe(30);
    expect(req.Weeklies).toBe(4);
    expect(req.Monthlies).toBe(12);
    expect(req.Yearlies).toBe(1);
    expect(req.instanceCount).toBe(30);
  });

  it("uses hardcoded defaults", () => {
    const req = buildVmAgentRequest(MOCK_SUMMARY, 10);
    expect(req.Reduction).toBe(50);
    expect(req.backupWindowHours).toBe(8);
    expect(req.GrowthRatePercent).toBe(5);
    expect(req.GrowthRateScopeYears).toBe(1);
    expect(req.immutablePerf).toBe(true);
    expect(req.immutablePerfDays).toBe(30);
    expect(req.isCapTierVDCV).toBe(true);
    expect(req.productVersion).toBe(0);
  });

  it("falls back to 0 for null summary fields", () => {
    const nullSummary: CalculatorSummary = {
      ...MOCK_SUMMARY,
      totalSourceDataTB: null,
      weightedAvgChangeRate: null,
      gfsWeekly: null,
      gfsMonthly: null,
      gfsYearly: null,
    };
    const req = buildVmAgentRequest(nullSummary, 10);
    expect(req.sourceTB).toBe(0);
    expect(req.ChangeRate).toBe(0);
    expect(req.Weeklies).toBe(0);
  });
});

describe("callVmAgentApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the Veeam calculator API and returns parsed response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }),
    );
    const result = await callVmAgentApi(MOCK_SUMMARY, 30);
    expect(result.success).toBe(true);
    expect(result.data.totalStorageTB).toBe(12.5);
    expect(fetch).toHaveBeenCalledWith(
      "https://calculator.veeam.com/vse/api/VmAgent",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when the API returns a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Bad Request", { status: 400 }),
    );
    await expect(callVmAgentApi(MOCK_SUMMARY, 5)).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- veeam-api
```

**Step 3: Create `src/lib/veeam-api.ts`**

```typescript
import type { CalculatorSummary } from "@/types/calculator";
import type { VmAgentRequest, VmAgentResponse } from "@/types/veeam-api";

const API_URL = "https://calculator.veeam.com/vse/api/VmAgent";

export function buildVmAgentRequest(
  summary: CalculatorSummary,
  jobCount: number,
): VmAgentRequest {
  return {
    sourceTB: summary.totalSourceDataTB ?? 0,
    ChangeRate: summary.weightedAvgChangeRate ?? 0,
    Reduction: 50,
    backupWindowHours: 8,
    GrowthRatePercent: 5,
    GrowthRateScopeYears: 1,
    days: summary.maxRetentionDays ?? 30,
    Weeklies: summary.gfsWeekly ?? 0,
    Monthlies: summary.gfsMonthly ?? 0,
    Yearlies: summary.gfsYearly ?? 0,
    Blockcloning: false,
    ObjectStorage: false,
    moveCapacityTierEnabled: false,
    immutablePerf: true,
    immutablePerfDays: 30,
    isCapTierVDCV: true,
    productVersion: 0,
    instanceCount: jobCount,
  };
}

export async function callVmAgentApi(
  summary: CalculatorSummary,
  jobCount: number,
): Promise<VmAgentResponse> {
  const payload = buildVmAgentRequest(summary, jobCount);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Veeam API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<VmAgentResponse>;
}
```

**Step 4: Run tests**

```bash
npm run test:run -- veeam-api
```

**Step 5: Commit**

```bash
git add src/lib/veeam-api.ts src/__tests__/veeam-api.test.ts
git commit -m "feat(api): add callVmAgentApi and buildVmAgentRequest"
```

---

### Task 16: Create `SizingResults` component

**Files:**

- Create: `src/components/dashboard/sizing-results.tsx`
- Test: `src/__tests__/sizing-results.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/sizing-results.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SizingResults } from "@/components/dashboard/sizing-results";
import type { VmAgentResponse } from "@/types/veeam-api";

const MOCK_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: {
      compute: {
        cores: 8,
        ram: 16,
        volumes: [{ diskGB: 13500, diskPurpose: 3 }],
      },
    },
    transactions: {
      capacityTierTransactions: {
        firstMonthTransactions: 1000,
        secondMonthTransactions: 800,
        finalMonthTransactions: 600,
      },
    },
    performanceTierImmutabilityTaxGB: 250,
    capacityTierImmutabilityTaxGB: 0,
  },
};

describe("SizingResults", () => {
  it("displays total storage prominently", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText("12.50 TB")).toBeInTheDocument();
  });

  it("displays proxy compute", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/4 cores/i)).toBeInTheDocument();
    expect(screen.getByText(/8 GB RAM/i)).toBeInTheDocument();
  });

  it("displays repo compute", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/8 cores/i)).toBeInTheDocument();
    expect(screen.getByText(/16 GB RAM/i)).toBeInTheDocument();
  });

  it("displays immutability overhead", () => {
    render(<SizingResults result={MOCK_RESULT} />);
    expect(screen.getByText(/immutability overhead/i)).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify fail**

```bash
npm run test:run -- sizing-results
```

**Step 3: Create `src/components/dashboard/sizing-results.tsx`**

```typescript
import type { VmAgentResponse } from "@/types/veeam-api";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SizingResultsProps {
  result: VmAgentResponse;
}

function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

export function SizingResults({ result }: SizingResultsProps) {
  const { data } = result;

  const repoDisk = data.repoCompute.compute.volumes
    .filter((v) => v.diskPurpose === 3)
    .reduce((sum, v) => sum + v.diskGB, 0);

  const capTx = data.transactions.capacityTierTransactions;

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
      <CardHeader>
        <CardTitle>Sizing Estimate</CardTitle>
        <CardDescription>Based on your backup environment data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Hero metric */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Total Storage Required
          </p>
          <p className="font-mono text-3xl font-bold text-primary">
            {data.totalStorageTB.toFixed(2)} TB
          </p>
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Proxy Server</SectionHeading>
          <ResultRow label="CPU">{data.proxyCompute.compute.cores} cores</ResultRow>
          <ResultRow label="RAM">{data.proxyCompute.compute.ram} GB RAM</ResultRow>
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Repository Server</SectionHeading>
          <ResultRow label="CPU">{data.repoCompute.compute.cores} cores</ResultRow>
          <ResultRow label="RAM">{data.repoCompute.compute.ram} GB RAM</ResultRow>
          {repoDisk > 0 && (
            <ResultRow label="Disk">
              {(repoDisk / 1024).toFixed(1)} TB
            </ResultRow>
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <SectionHeading>Immutability Overhead</SectionHeading>
          <ResultRow label="Performance Tier">
            {(data.performanceTierImmutabilityTaxGB / 1024).toFixed(2)} TB
          </ResultRow>
        </div>

        {capTx && (
          <>
            <Separator />
            <div className="space-y-1">
              <SectionHeading>Monthly API Transactions (Capacity Tier)</SectionHeading>
              <ResultRow label="Month 1">
                {capTx.firstMonthTransactions.toLocaleString()}
              </ResultRow>
              <ResultRow label="Steady State">
                {capTx.finalMonthTransactions.toLocaleString()}
              </ResultRow>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 4: Run tests**

```bash
npm run test:run -- sizing-results
```

**Step 5: Commit**

```bash
git add src/components/dashboard/sizing-results.tsx src/__tests__/sizing-results.test.tsx
git commit -m "feat(api): add SizingResults display component"
```

---

### Task 17: Update `CalculatorInputs` for two-state API UI

**Files:**

- Modify: `src/components/dashboard/calculator-inputs.tsx`
- Test: `src/__tests__/calculator-inputs.test.tsx`

**Step 1: Write failing tests**

Add to `src/__tests__/calculator-inputs.test.tsx`:

```typescript
import { vi, beforeEach, afterEach } from "vitest";

// Place at top of file, before other tests
vi.mock("@/lib/veeam-api", () => ({
  callVmAgentApi: vi.fn(),
}));

import { callVmAgentApi } from "@/lib/veeam-api";
import type { VmAgentResponse } from "@/types/veeam-api";

const MOCK_API_RESULT: VmAgentResponse = {
  success: true,
  data: {
    totalStorageTB: 12.5,
    proxyCompute: { compute: { cores: 4, ram: 8, volumes: [] } },
    repoCompute: { compute: { cores: 8, ram: 16, volumes: [] } },
    transactions: {},
    performanceTierImmutabilityTaxGB: 0,
    capacityTierImmutabilityTaxGB: 0,
  },
};

it("shows Get Sizing Estimate button", () => {
  render(<CalculatorInputs data={MOCK_DATA} validations={[]} />);
  expect(screen.getByRole("button", { name: /get sizing estimate/i })).toBeInTheDocument();
});

it("shows sizing results after successful API call", async () => {
  vi.mocked(callVmAgentApi).mockResolvedValueOnce(MOCK_API_RESULT);
  render(<CalculatorInputs data={MOCK_DATA} validations={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /get sizing estimate/i }));
  expect(await screen.findByText(/12.50 TB/)).toBeInTheDocument();
});

it("shows error message on API failure", async () => {
  vi.mocked(callVmAgentApi).mockRejectedValueOnce(new Error("Network error"));
  render(<CalculatorInputs data={MOCK_DATA} validations={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /get sizing estimate/i }));
  expect(await screen.findByText(/could not retrieve sizing/i)).toBeInTheDocument();
});
```

**Step 2: Run to verify fail**

```bash
npm run test:run -- calculator-inputs
```

**Step 3: Update `calculator-inputs.tsx`**

```typescript
import { useState } from "react";
import { ExternalLink, Loader2, RotateCcw, Calculator } from "lucide-react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { callVmAgentApi } from "@/lib/veeam-api";
import { formatPercent, formatTB } from "@/lib/format-utils";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import type { VmAgentResponse } from "@/types/veeam-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MINIMUM_RETENTION_DAYS } from "@/lib/constants";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { SizingResults } from "./sizing-results";

interface CalculatorInputsProps {
  data: NormalizedDataset;
  validations: ValidationResult[];
  excludedJobNames?: Set<string>;
}

export function CalculatorInputs({ data, excludedJobNames = new Set() }: CalculatorInputsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VmAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = buildCalculatorSummary(data.jobInfo, data.jobSessionSummary, excludedJobNames);
  const activeJobCount = data.jobInfo.filter((j) => !excludedJobNames.has(j.JobName)).length;

  const handleGetEstimate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await callVmAgentApi(summary, activeJobCount);
      setResult(res);
    } catch {
      setError("Could not retrieve sizing estimate. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDays = (val: number | null) => (val === null ? "N/A" : `${val} days`);

  const formatGFS = (w: number | null, m: number | null, y: number | null) => {
    if (w === null && m === null && y === null) return "None configured";
    const parts = [];
    if (w !== null) parts.push(`Weekly: ${w}`);
    if (m !== null) parts.push(`Monthly: ${m}`);
    if (y !== null) parts.push(`Yearly: ${y}`);
    return parts.join(", ");
  };

  return (
    <div className="space-y-4">
      <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calculator Inputs
            <Badge variant="outline" className="font-normal">Estimated</Badge>
          </CardTitle>
          <CardDescription>
            Aggregated values from {activeJobCount} job{activeJobCount !== 1 ? "s" : ""}
            {excludedJobNames.size > 0 && (
              <span className="text-warning ml-1">({excludedJobNames.size} excluded)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Source Data</p>
              <p className="font-mono text-2xl font-semibold">{formatTB(summary.totalSourceDataTB)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Daily Change Rate</p>
              <p className="font-mono text-2xl font-semibold">{formatPercent(summary.weightedAvgChangeRate, 2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Immutability Period</p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">{summary.immutabilityDays} days</p>
                <span className="text-muted-foreground text-xs">(VDC Vault minimum)</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Retention</p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold">{formatDays(summary.maxRetentionDays)}</p>
                {summary.originalMaxRetentionDays !== null &&
                  summary.originalMaxRetentionDays < MINIMUM_RETENTION_DAYS && (
                    <span className="text-muted-foreground text-xs">(current: {summary.originalMaxRetentionDays} days)</span>
                  )}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Extended Retention</p>
              <p className="font-mono text-2xl font-semibold">
                {formatGFS(summary.gfsWeekly, summary.gfsMonthly, summary.gfsYearly)}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={handleGetEstimate} disabled={loading} className="sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Calculating…
              </>
            ) : result ? (
              <>
                <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                Re-calculate
              </>
            ) : (
              <>
                <Calculator className="mr-2 size-4" aria-hidden="true" />
                Get Sizing Estimate
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://www.veeam.com/calculators/simple/vdc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground"
            >
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              Advanced calculator
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && <SizingResults result={result} />}
    </div>
  );
}
```

**Step 4: Run full test suite**

```bash
npm run test:run
```

**Step 5: Run build**

```bash
npm run build
```

Expected: all tests pass, build succeeds.

**Step 6: Commit**

```bash
git add src/components/dashboard/calculator-inputs.tsx src/__tests__/calculator-inputs.test.tsx
git commit -m "feat(api): integrate Veeam sizing API into calculator tab with two-state UI"
```

---

## FINAL VERIFICATION

After each phase is complete, run the full suite and build before opening a PR:

```bash
npm run lint && npm run test:run && npm run build
```

All must pass before merging.

---

## CORS NOTE

The `callVmAgentApi` function calls `https://calculator.veeam.com/vse/api/VmAgent` directly from the browser. If CORS is blocked in production, the error handler will surface a useful message. Test in the browser (not just Vitest) before shipping Phase 4.
