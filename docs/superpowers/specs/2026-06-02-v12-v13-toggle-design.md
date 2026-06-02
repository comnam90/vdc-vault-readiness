# Design: VBR 12 → 13 Upgrade Projection Toggle

**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** Sizing tab — calculator inputs + results

---

## Overview

When a VBR 12.x server is detected, the sizing calculator already fetches both a v12 result and a v13 result in parallel. This feature surfaces a toggle in the Calculator Inputs card header that lets the user flip the displayed results to show what Vault storage they would need _after_ upgrading to VBR 13 — without re-running the calculation.

The multi-year growth projection for the v13 view is fetched lazily on first toggle (one-time cost, only incurred if the user opts in).

---

## Goals

- Let users see v13 sizing with a single click, using data already in flight.
- Keep the v13 growth projection cost opt-in — zero extra API calls unless the toggle is used.
- Fit naturally into the existing design system (Switch, animate-celebrate-in, caption pattern).

---

## Non-Goals

- Changing the calculation inputs or triggering a new `calculate()` call when toggling.
- Showing the toggle for v13+ servers (they already are on v13; no projection needed).
- Persisting the toggle state across sessions.

---

## Data & State

### `use-calculator-api.ts` additions

| Addition                  | Type                          | Purpose                                         |
| ------------------------- | ----------------------------- | ----------------------------------------------- |
| `upgradeGrowthSeries`     | `GrowthSeriesPoint[] \| null` | v13 growth projection; null until generated     |
| `upgradeGrowthLoading`    | `boolean`                     | True while `generateUpgradeGrowth` is in flight |
| `upgradeGrowthError`      | `string \| null`              | Set on fetch failure; allows retry              |
| `generateUpgradeGrowth()` | `() => Promise<void>`         | Lazy-fetches the v13 growth series              |

**`generateUpgradeGrowth()` behaviour:**

- Builds `growthArgs` identically to the existing v12 growth call, but with `productVersionOverride: 0` (forces Veeam API to price as v13).
- Idempotent: no-ops if `upgradeGrowthSeries` is already populated or a fetch is currently in flight (tracked by a `upgradeGrowthLoadingRef`).
- Uses the same `requestIdRef` stale-check as `calculate()` — inflight calls from a prior input set are discarded automatically.
- On failure: sets `upgradeGrowthError`, leaves `upgradeGrowthSeries` null. The user can retry by toggling off then on again (the idempotency guard only skips if the series is already _populated_, not if it errored).

**`inputKey` change handling:**
The existing `useEffect` on `inputKey` that clears result state is extended to also clear `upgradeGrowthSeries`, `upgradeGrowthLoading`, and `upgradeGrowthError`.

**`UseCalculatorApiResult` interface additions:**

```ts
upgradeGrowthSeries: GrowthSeriesPoint[] | null;
upgradeGrowthLoading: boolean;
upgradeGrowthError: string | null;
generateUpgradeGrowth: () => Promise<void>;
```

### `calculator-inputs.tsx` addition

`showAsV13: boolean` — local `useState`, default `false`.

Reset rule: a `useEffect` on `result` resets `showAsV13` to `false` whenever `result` becomes `null` (i.e. inputs changed and results were cleared). This ensures the toggle always returns to off when the user modifies inputs.

---

## Component Changes

### `calculator-inputs.tsx` — toggle in `CardTitle` row

The `CardTitle` row becomes `flex items-center gap-2`. When `isVbr12 && !!upgradeResult`, a `Tooltip`-wrapped control appears on the right via `ml-auto`:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="ml-auto flex items-center gap-2">
      <Label
        htmlFor="v13-toggle"
        className="text-muted-foreground cursor-pointer text-sm font-normal"
      >
        VBR 13
      </Label>
      <Switch
        id="v13-toggle"
        size="sm"
        checked={showAsV13}
        onCheckedChange={(checked) => {
          setShowAsV13(checked);
          if (checked && !upgradeGrowthSeries) void generateUpgradeGrowth();
        }}
      />
    </div>
  </TooltipTrigger>
  <TooltipContent>
    See how much Vault storage you'd need after upgrading to VBR 13
  </TooltipContent>
</Tooltip>
```

The toggle is invisible before `upgradeResult` is available, so there is no intermediate state where it is shown but has nothing to display.

The `SizingResults` call gains three new props:

```tsx
<SizingResults
  result={result}
  upgradeResult={upgradeResult ?? undefined}
  showAsV13={showAsV13}
  upgradeGrowthSeries={upgradeGrowthSeries}
  upgradeGrowthLoading={upgradeGrowthLoading}
  upgradeGrowthError={upgradeGrowthError}
  {/* ...existing props unchanged */}
/>
```

### `sizing-results.tsx` — primary/comparison selection

New props: `showAsV13?: boolean`, `upgradeGrowthSeries?: GrowthSeriesPoint[] | null`, `upgradeGrowthLoading?: boolean`, `upgradeGrowthError?: string | null`.

Internal selection logic:

```ts
const primaryResult = showAsV13 && upgradeResult ? upgradeResult : result;
const comparisonResult = showAsV13 ? result : (upgradeResult ?? null);
const activeGrowthSeries = showAsV13 ? upgradeGrowthSeries : growthSeries;
const activeGrowthLoading = showAsV13 ? (upgradeGrowthLoading ?? false) : false;
const activeGrowthError = showAsV13 ? (upgradeGrowthError ?? null) : null;
```

`sizing` is derived from `primaryResult`; `comparisonSizing` is derived from `comparisonResult`.

**Savings derivation in `sizing-results.tsx`** — both savings values must use `Math.abs` so they remain positive regardless of which result is primary:

```ts
const storageSavingsTB =
  comparisonSizing !== null
    ? Math.abs(sizing.totalStorageTB - comparisonSizing.totalStorageTB)
    : 0;
const immutabilitySavingsGB =
  comparisonSizing !== null
    ? Math.abs(sizing.performanceTaxGB - comparisonSizing.performanceTaxGB)
    : 0;
```

The existing `Math.max(0, sizing - upgradeSizing)` pattern produces 0 in v13 mode (primary is the smaller v13 value), which would incorrectly hide the immutability savings line. `Math.abs` fixes both directions.

`upgradePerfTaxGB` passed to `SizingHeroCard` becomes `comparisonSizing?.performanceTaxGB ?? null` — it is the comparison result's perf tax in both modes, used only as a null guard for `showImmutabilitySavings`.

`sobrBlocksUpgrade` is forced `false` when `showAsV13` is true — the SOBR migration caveat only applies in v12 mode where the user has not yet "chosen" to upgrade.

**Growth chart slot:**

```tsx
{activeGrowthError ? (
  <Alert variant="destructive">
    <AlertDescription>{activeGrowthError}</AlertDescription>
  </Alert>
) : activeGrowthLoading ? (
  <Card className="flex min-h-[200px] items-center justify-center gap-2">
    <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
    <span className="text-muted-foreground text-sm">
      Calculating VBR 13 projection…
    </span>
  </Card>
) : activeGrowthSeries != null ? (
  <GrowthChart data={bufferedActiveGrowthSeries} {/* ...existing props */} />
) : null}
```

The skeleton card uses `min-h-[200px]` to match approximate chart height and prevent layout reflow when the series arrives.

### `sizing-hero-card.tsx` — caption flip and number re-animation

**Prop rename:** `upgradeTotalStorageTB: number | null` → `comparisonTotalStorageTB: number | null`.  
**New prop:** `showAsV13?: boolean` (default `false`).

**Savings computation** — uses `Math.abs` since direction varies:

```ts
const storageSavingsTB =
  comparisonTotalStorageTB !== null
    ? Math.abs(sizing.totalStorageTB - comparisonTotalStorageTB)
    : 0;
```

**Hero number re-animation** — `key` prop forces remount on toggle, re-firing `animate-celebrate-in`:

```tsx
<p
  key={showAsV13 ? "v13" : "v12"}
  className="text-foreground motion-safe:animate-celebrate-in font-mono text-5xl ..."
>
  {formatTB(sizing.totalStorageTB)}
</p>
```

**Caption logic:**

```tsx
{
  /* v12 mode (existing behaviour) */
}
{
  !showAsV13 && showStandardUpgradeCaption && (
    <p className="text-muted-foreground motion-safe:fade-in text-sm motion-safe:delay-300 ...">
      Upgrade to VBR 13 could reduce this to{" "}
      <span className="font-mono">{formatTB(comparisonTotalStorageTB)}</span>{" "}
      (saving {formatTB(storageSavingsTB)})
    </p>
  );
}

{
  /* v13 mode (new) */
}
{
  showAsV13 && hasUpgradeSavings && (
    <p className="text-muted-foreground motion-safe:fade-in text-sm motion-safe:delay-300 ...">
      Currently requires{" "}
      <span className="font-mono">{formatTB(comparisonTotalStorageTB)}</span> on
      VBR 12 ({formatTB(storageSavingsTB)} more without upgrading)
    </p>
  );
}
```

Both captions use the same Tailwind classes as today — no new animation tokens.

**Immutability savings line** — label flips based on `showAsV13`:

- v12 mode: _"Upgrading to VBR 13 saves `{formatPerfTax(immutabilitySavingsGB)}` in immutability overhead."_
- v13 mode: _"Includes `{formatPerfTax(immutabilitySavingsGB)}` less immutability overhead vs. VBR 12."_

The `showImmutabilitySavings` guard (`upgradePerfTaxGB !== null && immutabilitySavingsGB > 0`) is unchanged.

---

## Edge Cases

| Scenario                                    | Behaviour                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| v13+ server                                 | Toggle never renders (`isVbr12` is false)                                                                                                    |
| Toggle before `upgradeResult` arrives       | Toggle not mounted (conditional on `!!upgradeResult`)                                                                                        |
| `generateUpgradeGrowth` fails               | `upgradeGrowthError` set; chart slot shows destructive Alert; retry by toggling off/on                                                       |
| No savings (v12 ≈ v13 sizing)               | `hasUpgradeSavings` is false; neither comparison caption renders                                                                             |
| SOBR present + v13 mode                     | `sobrBlocksUpgrade` forced false; SOBR caveat hidden (user has "chosen" the upgrade path)                                                    |
| Input change while toggle is on             | `inputKey` effect clears all results; `useEffect` on `result` resets `showAsV13` to false; toggle disappears until next successful calculate |
| Second toggle-on when series already loaded | `generateUpgradeGrowth()` no-ops (idempotency guard)                                                                                         |

---

## Testing

All tests in `src/__tests__/`, following existing patterns (factory helpers, `getByRole` priority, no snapshots).

### `use-calculator-api.test.ts`

- `generateUpgradeGrowth()` calls `generateGrowthSeries` with `productVersionOverride: 0`
- Idempotent: second call when `upgradeGrowthSeries` already populated does not re-call the API
- Sets `upgradeGrowthLoading` true during fetch, false on completion
- On failure: sets `upgradeGrowthError`, leaves `upgradeGrowthSeries` null
- `inputKey` change clears `upgradeGrowthSeries`, `upgradeGrowthLoading`, `upgradeGrowthError`

### `calculator-inputs.test.tsx`

- Toggle not rendered for v13 server
- Toggle not rendered before `upgradeResult` is available
- Toggle renders once `upgradeResult` is present on a v12 server
- Toggling on calls `generateUpgradeGrowth()` when `upgradeGrowthSeries` is null
- Toggling on does NOT call `generateUpgradeGrowth()` when `upgradeGrowthSeries` already set
- Toggle resets to off when `result` becomes null

### `sizing-results.test.tsx`

- With `showAsV13=true`, `upgradeResult` data drives hero sizing (not `result`)
- With `showAsV13=true` and `upgradeGrowthLoading=true`, skeleton renders instead of chart
- With `showAsV13=true` and `upgradeGrowthSeries` present, chart renders with upgrade series
- With `showAsV13=true` and `upgradeGrowthError` set, destructive Alert renders in chart slot

### `sizing-hero-card.test.tsx`

- v13 caption renders when `showAsV13=true` and savings > 0
- v12 caption renders when `showAsV13=false` and savings > 0
- Neither caption renders when savings = 0
- Hero `<p>` key changes between "v12" and "v13" to re-trigger animation

---

## Files Touched

| File                                             | Change                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/use-calculator-api.ts`                | Add `upgradeGrowthSeries`, `upgradeGrowthLoading`, `upgradeGrowthError` state; add `generateUpgradeGrowth()`; extend `inputKey` effect                        |
| `src/components/dashboard/calculator-inputs.tsx` | Add `showAsV13` state + reset effect; render toggle in `CardTitle`; pass new props to `SizingResults`                                                         |
| `src/components/dashboard/sizing-results.tsx`    | Add `showAsV13`, `upgradeGrowthSeries`, `upgradeGrowthLoading`, `upgradeGrowthError` props; primary/comparison selection logic; growth chart slot conditional |
| `src/components/dashboard/sizing-hero-card.tsx`  | Rename prop, add `showAsV13`, `key` on hero number, caption flip, savings `Math.abs`, immutability label flip                                                 |
| `src/__tests__/use-calculator-api.test.ts`       | New tests for upgrade growth lazy fetch                                                                                                                       |
| `src/__tests__/calculator-inputs.test.tsx`       | New tests for toggle visibility + idempotency                                                                                                                 |
| `src/__tests__/sizing-results.test.tsx`          | New tests for v13 mode rendering                                                                                                                              |
| `src/__tests__/sizing-hero-card.test.tsx`        | New tests for caption flip and key re-animation                                                                                                               |
