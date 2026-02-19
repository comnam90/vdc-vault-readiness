# Roadmap Design: Job Table, Repositories Tab, Charts, and API Integration

**Date:** 2026-02-19
**Status:** Approved

## Overview

Four phases of improvements to the VDC Vault Readiness webapp. Ordered by dependency and daily-use impact.

---

## Phase 1: Job Table Improvements

Three tightly coupled changes to the existing Jobs tab, shipped together.

### 1A — Fix Horizontal Scrolling (Truncate + Tooltip)

**Problem:** Long job names and repository names cause horizontal scrolling in the job table.

**Approach:** Apply `max-w-[160px] truncate` to Job Name and Repository Name columns. Wrap cell content in a shadcn `Tooltip` that shows the full string on hover. No new interaction patterns, keeps the table in a fixed layout.

**Rejected alternative:** TanStack column resizing with drag handles — adds interaction complexity that isn't warranted here.

### 1B — Column-Level Filters (TanStack Native)

**Approach:** Use TanStack Table v8's `getFilteredRowModel()` for all filter logic. Render per-column filter UI inline in each column header cell.

| Column          | Filter UI                                             |
| --------------- | ----------------------------------------------------- |
| Job Name        | Text input (existing search, moved into header)       |
| Job Type        | Multiselect dropdown (shadcn Popover + Checkbox list) |
| Repository Name | Multiselect dropdown (same pattern)                   |
| Encrypted       | Three-state toggle: All / Encrypted / Unencrypted     |
| GFS             | Three-state toggle: All / Yes / No                    |

### 1C — Checkbox Exclusion Column for Sizing

**Approach:** Add a new first column containing a shadcn `Checkbox`. Checked = job is **excluded from sizing calculations**.

- Checkbox click stops event propagation so it does not open the job detail sheet
- Row click behaviour unchanged — still opens `JobDetailSheet`
- A badge/count indicator above the table shows "X jobs excluded" when any checkboxes are checked
- Excluded job IDs are lifted to `DashboardView` state via a new `excludedJobNames: Set<string>` state variable
- `buildCalculatorSummary()` receives the excluded set and filters those jobs out before aggregation
- The Sizing tab automatically reflects the filtered totals

---

## Phase 2: Repositories Tab

New fourth tab in the main dashboard `TabsList`. Contains two independent tables.

### Standard Repositories Table

**Data source:** Derived by grouping `SafeJob[]` by `RepositoryName`. If the healthcheck JSON contains a dedicated repositories section, parse it directly in the normalizer; otherwise aggregate from job data.

**Columns:** Repository Name, Type, Job Count, Total Source TB, All Encrypted (boolean badge).

### SOBR Repositories Table

**Data source:** Existing `SafeSobr[]` already normalized from the healthcheck.

**Columns:** SOBR Name, Capacity Tier Enabled, Archive Tier Enabled, Immutability Enabled, Extent Count, Job Count.

**Drill-down:** Clicking a SOBR row opens a slide-out `Sheet` (matching the `JobDetailSheet` pattern) with three sections:

- **Performance Tier** — `SafeCapExtent[]` rows where `Type` is not "Cloud", filtered by `SobrName`
- **Capacity Tier** — `SafeCapExtent[]` rows where `Type` is "Cloud" or object storage, filtered by `SobrName`
- **Archive Tier** — `SafeArchExtent[]` rows filtered by `SobrName`

Each section shows: Name, Encryption, Immutability, Status, Move/Copy policy, Size limits.

---

## Phase 3: Recharts Visuals

All charts use the Veeam brand oklch palette from `index.css`. All animations respect `prefers-reduced-motion`.

### Jobs Tab — Two Charts (above the job table)

**Chart 1: Source Size by Job Type**
Horizontal bar chart. Y-axis = job type (e.g. VMware, Hyper-V, Agent, etc.), X-axis = total source TB. Immediately surfaces which workload type dominates capacity.

**Chart 2: Change Rate Distribution**
Histogram with fixed buckets: 0–5%, 5–10%, 10–25%, 25–50%, >50%. Bar colours match existing change rate cell logic (green / amber / red). Highlights outlier jobs.

### Repositories Tab — One Chart (above the standard repos table)

**Chart 3: Source Size by Repository**
Horizontal bar chart. Y-axis = repository name, X-axis = total source TB. Shows which repository holds the most data at a glance.

**Recharts component:** `BarChart` from recharts v3.7.0 (already installed). Use `ResponsiveContainer` for fluid width.

---

## Phase 4: Veeam Sizing API Integration

### API

`POST https://calculator.veeam.com/vse/api/VmAgent`

### Request Payload Mapping

| Field                  | Source                                    |
| ---------------------- | ----------------------------------------- |
| `sourceTB`             | `calculatorSummary.totalSourceDataTB`     |
| `ChangeRate`           | `calculatorSummary.weightedAvgChangeRate` |
| `days`                 | `calculatorSummary.maxRetentionDays`      |
| `Weeklies`             | `calculatorSummary.gfsWeekly`             |
| `Monthlies`            | `calculatorSummary.gfsMonthly`            |
| `Yearlies`             | `calculatorSummary.gfsYearly`             |
| `instanceCount`        | count of non-excluded jobs                |
| `backupWindowHours`    | **hardcoded:** `8`                        |
| `GrowthRatePercent`    | **hardcoded:** `5`                        |
| `GrowthRateScopeYears` | **hardcoded:** `1`                        |
| `Reduction`            | **hardcoded:** `50`                       |
| `isCapTierVDCV`        | **hardcoded:** `true`                     |
| `immutablePerf`        | **hardcoded:** `true`                     |
| `immutablePerfDays`    | **hardcoded:** `30`                       |
| `productVersion`       | **hardcoded:** `0` (v13)                  |

The call uses the excluded job set from Phase 1 — excluded jobs are filtered out of the `CalculatorSummary` before the payload is built.

### UI — Two States on the Sizing Tab

**Pre-call state:**
"Get Sizing Estimate" button replaces the existing "Open Calculator" external link. On click, fires the API call with a loading spinner.

**Post-call state:**
Results render inline below the existing inputs card. Key outputs:

| Output                       | API field                                        |
| ---------------------------- | ------------------------------------------------ |
| Total Storage Required       | `data.totalStorageTB` (large, prominent display) |
| Proxy: CPU / RAM             | `data.proxyCompute.compute.cores` / `.ram`       |
| Repository: CPU / RAM / Disk | `data.repoCompute.compute` fields                |
| Immutability Overhead        | `data.performanceTierImmutabilityTaxGB`          |
| Monthly API Transactions     | `data.transactions.capacityTierTransactions`     |

A "Re-calculate" button allows re-running. A small disclaimer note links to the full Veeam calculator for advanced customisation.

### Error Handling

Display an inline error alert if the API returns 400 or network failure. Do not crash the sizing tab — the inputs card remains visible.

### Phase 4b — Restore Point Timeline (Future, Not In Scope)

After Phase 4 ships: a Recharts area/bar chart on the Sizing tab visualising `data.restorePoints[]` — daily backup file sizes across the simulation period, colour-coded by tier (performance / capacity / archive). Deferred to a separate design.

---

## Priority Order

| Phase | Feature                                                   | Rationale                                                       |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------- |
| 1     | Job table improvements (scroll fix + filters + exclusion) | Highest daily-use impact; exclusion is prerequisite for Phase 4 |
| 2     | Repositories tab                                          | Self-contained, no cross-phase dependencies                     |
| 3     | Recharts visuals                                          | Enhances Phases 1+2; recharts already installed                 |
| 4     | Veeam API integration                                     | Most complex; depends on Phase 1 exclusion state                |
| 4b    | Restore point chart                                       | Depends entirely on Phase 4 API response data                   |

---

## Constraints

- No new dependencies. recharts is already installed.
- All API calls are client-side `fetch()` only — no backend.
- No `as any`, `@ts-ignore`, or `@ts-expect-error`.
- TDD: failing test first, then implementation.
- Conventional Commits per phase/feature (separate PRs per phase).
