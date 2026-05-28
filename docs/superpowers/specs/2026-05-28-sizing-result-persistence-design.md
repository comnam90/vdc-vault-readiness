# Design: Sizing Result Persistence Across Tab Navigation

**Date:** 2026-05-28
**Branch:** `fix/sizing-result-persistence`
**Status:** Approved

## Problem

The sizing calculator tab loses its results whenever the user navigates to another tab and returns. Because Radix UI's `TabsContent` unmounts inactive tab content by default, React destroys the local state of `CalculatorInputs` on every tab switch. The user must click two extra buttons — Re-calculate and Accept consent — to restore results they already had. This friction is especially disruptive during SE demos where switching between the Job Details and Sizing tabs is common.

## Goals

- Results persist until the page reloads, a new file is uploaded, the job selection changes, or a calculation-affecting setting changes.
- Changing a setting that affects the calculation clears the result and forces a re-run.
- Once the user accepts the consent dialog, they do not see it again for the rest of the page session.

## Non-Goals

- Persisting results across page reloads (sessionStorage or IndexedDB).
- Distinguishing individual "display-only" settings from "calculation-affecting" settings. All current settings in `GlobalSettings` feed into `buildCalculatorSummary` or `callVmAgentApi`, so all settings changes invalidate.

## Architecture

### What moves

`CalculatorInputs` currently owns six pieces of state that must survive tab switches:

| State           | Current location   | New location            |
| --------------- | ------------------ | ----------------------- |
| `result`        | `CalculatorInputs` | `useCalculatorApi` hook |
| `upgradeResult` | `CalculatorInputs` | `useCalculatorApi` hook |
| `growthSeries`  | `CalculatorInputs` | `useCalculatorApi` hook |
| `error`         | `CalculatorInputs` | `useCalculatorApi` hook |
| `loading`       | `CalculatorInputs` | `useCalculatorApi` hook |
| `hasConsented`  | does not exist     | `useCalculatorApi` hook |

`consentOpen` stays in `CalculatorInputs` — it is transient UI state that does not need to outlive the tab.

### New hook: `useCalculatorApi`

`DashboardView` instantiates this hook. It owns all calculator result state and exposes a stable interface to its consumer.

```typescript
// src/hooks/use-calculator-api.ts

interface UseCalculatorApiOptions {
  data: NormalizedDataset;
  excludedJobNames: Set<string>;
  settings: GlobalSettings;
}

interface UseCalculatorApiResult {
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  grantConsent: () => void; // marks consent given for the session
  calculate: () => Promise<void>; // fires the API call
}
```

### Invalidation

The hook watches `excludedJobNames` and `settings` via `useEffect`. When either changes after a result exists, the hook clears all result state.

```typescript
// Serialise the inputs that affect the calculation to a stable string.
// When the string changes, clear all result state. React bails out of
// re-renders when setState is called with the same value, so unconditional
// setResult(null) on mount (when result is already null) is free.
const inputKey = JSON.stringify({
  excluded: [...excludedJobNames].sort(),
  settings,
});

useEffect(() => {
  setResult(null);
  setUpgradeResult(null);
  setGrowthSeries(null);
  setError(null);
}, [inputKey]);
```

`hasConsented` is not cleared by invalidation. The user already accepted the data-sharing consent; changing inputs does not withdraw that acceptance.

### Updated `CalculatorInputs` props

```typescript
interface CalculatorInputsProps {
  data: NormalizedDataset;
  excludedJobNames?: Set<string>;
  // Lifted state (read-only)
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  // Callbacks
  onConsentGiven: () => void;
  onCalculate: () => Promise<void>;
}
```

### Updated consent flow

| Scenario                           | Behaviour                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `hasConsented` is false            | Button click opens consent dialog. On Accept: call `onConsentGiven()` then `onCalculate()`.      |
| `hasConsented` is true             | Button click calls `onCalculate()` directly. No dialog.                                          |
| Consent dialog declined            | Close dialog. Do nothing.                                                                        |
| Result invalidated by input change | User sees empty state. `hasConsented` remains true. Next click goes straight to `onCalculate()`. |
| Page reload / new file upload      | `DashboardView` re-mounts. Hook resets to initial state including `hasConsented: false`.         |

## Component Wiring

```
DashboardView
  ├─ useSettings()  →  settings
  └─ useCalculatorApi({ data, excludedJobNames, settings })
       ├─ returns: result, upgradeResult, growthSeries, error, loading, hasConsented, grantConsent, calculate
       └─ <CalculatorInputs
               result={result}
               upgradeResult={upgradeResult}
               growthSeries={growthSeries}
               error={error}
               loading={loading}
               hasConsented={hasConsented}
               onConsentGiven={grantConsent}
               onCalculate={calculate}
          />
```

`DashboardView` reads `settings` from `useSettings()` — it already has access to `data` and `excludedJobNames`. No additional prop drilling through intermediate components.

## Testing Strategy

### `src/__tests__/use-calculator-api.test.ts` (new)

- Result persists when hook re-renders with same inputs.
- Result clears when `excludedJobNames` changes.
- Result clears when any setting changes.
- `hasConsented` persists across re-renders.
- `hasConsented` is false after hook initialises.
- `calculate()` calls `callVmAgentApi` with the correct arguments.
- `grantConsent()` sets `hasConsented` to true.

### `src/__tests__/calculator-inputs.test.tsx` (update)

- Refactor test setup to pass controlled props instead of relying on internal state.
- "Get Sizing Estimate" button opens the consent dialog when `hasConsented=false`.
- "Re-calculate" button calls `onCalculate` directly when `hasConsented=true` (no dialog).
- Button label reads "Re-calculate" when `result` is non-null.
- Button label reads "Get Sizing Estimate" when `result` is null.

No tab-switch integration tests in `dashboard-view.test.tsx`. The hook tests cover the invariants. Tab-switch tests would test Radix UI's rendering behaviour, not our logic.

## Files Changed

| File                                             | Change                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| `src/hooks/use-calculator-api.ts`                | New hook                                         |
| `src/components/dashboard/calculator-inputs.tsx` | Replace local state with controlled props        |
| `src/components/dashboard/dashboard-view.tsx`    | Instantiate hook, pass props to CalculatorInputs |
| `src/__tests__/use-calculator-api.test.ts`       | New test file                                    |
| `src/__tests__/calculator-inputs.test.tsx`       | Update for controlled props interface            |

## Open Questions

None. All design decisions resolved during brainstorming.
