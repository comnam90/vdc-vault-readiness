# ADR 0001: Multi-year growth projection — API fan-out and greenfield simulation

- **Status:** Accepted
- **Date:** 2026-05-08
- **Branch:** feature/growth-chart

## Context

The Sizing tab needs a stacked-bar chart that visualizes how the storage footprint grows over time, broken down by retention tier (Daily, Weekly, Monthly, Yearly, Immutability). Two questions had to be settled before implementation:

1. **Where does per-year composition data come from?** The first instinct — and the literal reading of the original feature brief — was to loop a pure local function (`buildCalculatorSummary`) once per projected year. Investigation revealed that `CalculatorSummary` does not carry composition data. Composition lives on `DerivedSizing` (`src/lib/sizing-derivation.ts`), produced by `deriveSizing(VmAgentResponseData)`. The `restorePoints[].flags` that classify each point into a tier (D/W/M/Y) come from Veeam's proprietary sizing engine and arrive only via the consent-gated `/api/veeam-proxy` Cloudflare Function. There is no local-only path.

2. **What does "year N" mean?** Customers fall into two distinct scenarios. Some are starting greenfield — at year 1 they have ~1 year of GFS chain accumulated; at year 5, ~5 years. Others are seeded — the GFS chain reaches full retention immediately, and only source data grows. Modeling either as a straight `growthYears = N` loop misrepresents the other.

## Decision

### 1. Per-year composition is sourced from N concurrent Veeam API calls

The growth chart fans out N parallel calls to `callVmAgentApi` (one per projected year, varying `growthYears`), runs `deriveSizing` on each response, and emits a typed `GrowthSeriesPoint[]`. All N pipelines run inside a single `Promise.all`; total latency equals the slowest call, not the sum.

Implementation lives in a new module `src/lib/growth-projector.ts`. It composes the existing `buildCalculatorSummary`, `callVmAgentApi`, and `deriveSizing` rather than reimplementing any of them. It is **not** added to `src/lib/calculator-aggregator.ts`, which is a synchronous, pure module — adding an async network composer there would cross an SRP boundary documented in `src/lib/CLAUDE.md`.

`projectionYears` is computed as `Math.min(10, settings.limitCalculationYears ?? Math.max(5, settings.growthYears || 0))`. The hard cap of 10 bounds the parallel proxy fan-out.

### 2. Greenfield vs seeded modes are surfaced as `GlobalSettings.greenfieldSimulation`

A new `greenfieldSimulation: boolean` field is added to `GlobalSettings` (default `false`). Inside the projection loop, the per-iteration settings are constructed as:

- **Greenfield ON:** `{ ...settings, growthYears: year, limitCalculationYears: year }` — both knobs vary together.
- **Greenfield OFF (default):** `{ ...settings, growthYears: year }` — only source-data growth varies; the user's existing retention cap is preserved.

The toggle appears in two places: the Settings Dialog (durable preference) and the chart card header (quick toggle). Both write through `useSettings().updateSettings`; the shared `useSyncExternalStore` keeps them in sync.

## Alternatives Considered

### Alternative A: Local approximation, no extra API calls

Hold the current `compositionProportions` constant; scale `compositionTotalTB` by `(1 + growthPercent/100)^year` per bar.

- **Pro:** Zero additional network calls; instant render.
- **Con:** Composition mix never shifts — at year 5 the daily/weekly/monthly/yearly ratio looks identical to year 1, just scaled. Real customer GFS chains do shift composition over time. The chart would mislead.

Rejected.

### Alternative B: Single API call, slice `restorePoints[].day` into year ranges

Run one API call, then bucket each restore point into a year based on its `day` field.

- **Pro:** Cheapest possible.
- **Con:** Shows _retention chain buildup_, which is a function of the GFS schedule, not source-data growth. Users asking "how big will Vault be in year 5 with 20% YoY growth?" cannot answer that from this view.

Rejected.

### Alternative C: Overload `limitCalculationYears` to drive both modes

Vary `limitCalculationYears` per iteration unconditionally; let the user "pick" the seeded scenario by setting the field manually.

- **Con:** `limitCalculationYears` is a retention cap — its name and existing UI describe truncating retention math, not simulating greenfield buildup. Reusing the knob for two semantically different jobs would confuse users and make tests harder to read. Adding an explicit boolean costs one localStorage field and removes the ambiguity.

Rejected.

## Consequences

### Positive

- Per-year composition is faithful to Veeam's sizing engine. No hand-rolled approximation.
- Greenfield and seeded scenarios are first-class. The toggle name maps directly to the customer question.
- The growth projector is a single composition module — easy to test in isolation by mocking `callVmAgentApi`.
- Theme tokens (`var(--chart-1..5)`) reuse the existing composition-bar palette, so dark mode and any future palette change apply automatically.

### Negative

- Peak parallel proxy fan-out is N+1 (≤11) requests per analysis: the existing initial sizing call plus up to 10 projection calls. The Cloudflare Pages Function and the upstream `calculator.veeam.com` endpoint must absorb this. Calls are issued only after the user has accepted the consent dialog for the initial sizing.
- Settings shape grows by one field; localStorage payloads from earlier versions still load (the normalizer falls back to the default).
- The growth chart depends on a successful initial sizing call before it can fetch. Failure modes (network error, rate limit) need a graceful empty state.

### Mitigations

- Stale-response guard via a `requestId` ref inside the chart's `useEffect` discards any in-flight projection whose settings have since changed.
- Empty / loading / error states render a muted card placeholder — the chart never crashes the Sizing tab.
- The clamp at 10 prevents pathological projections (e.g. 50-year sliders) from inflating fan-out.

## References

- `src/lib/sizing-derivation.ts` — `deriveSizing`, `CompositionBuckets`, `DerivedSizing`
- `src/lib/veeam-api.ts` — `callVmAgentApi`, `buildVmAgentRequest`
- `src/lib/calculator-aggregator.ts` — `buildCalculatorSummary`
- `src/components/dashboard/sizing-proportion-bar.tsx` — `SEGMENT_COLOR` token mapping reused by the chart
- `src/types/settings.ts` — `GlobalSettings`, including the new `greenfieldSimulation` field
- `functions/api/veeam-proxy.ts` — Cloudflare Pages Function carrying the API traffic
