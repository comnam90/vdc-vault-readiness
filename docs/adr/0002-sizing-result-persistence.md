# ADR 0002: Sizing result persistence across tab navigation

- **Status:** Accepted
- **Date:** 2026-05-28
- **Branch:** fix/sizing-result-persistence

## Context

The Sizing tab ran its calculator state entirely inside `CalculatorInputs`, which is rendered inside a Radix UI `TabsContent`. Radix unmounts `TabsContent` children when the user navigates to a different tab, destroying all component state — including a completed sizing result. Switching to Jobs and back would blank the results, forcing the user to re-consent and re-fetch.

Three questions had to be settled before the refactor:

1. **Where should sizing state live?** It must survive above the `TabsContent` unmount boundary.
2. **When should a cached result be invalidated?** Results computed for one set of inputs must not persist when inputs change.
3. **What counts as "inputs" for invalidation purposes?** Not every piece of state that feeds the calculation should trigger a reset.

## Decision

### 1. State is lifted into `useCalculatorApi` in `DashboardView`

All sizing state — `result`, `upgradeResult`, `growthSeries`, `error`, `loading`, `hasConsented` — is extracted from `CalculatorInputs` into a new hook, `src/hooks/use-calculator-api.ts`, called in `DashboardView` above the `Tabs` component. `CalculatorInputs` becomes a fully controlled component: it receives state as props and calls `onCalculate` / `onConsentGiven` callbacks.

This is the minimal viable boundary. The hook owns the lifetime of results; the component owns only transient local UI state (the consent dialog's open/closed state).

### 2. Invalidation uses a serialised `inputKey` via `useMemo`, not direct Set deps

`excludedJobNames` is a `Set<string>`. React cannot detect Set mutations — two different Set references are `===`-unequal even with identical contents, making Set a brittle `useEffect` dependency. The invalidation effect uses:

```typescript
const inputKey = useMemo(
  () => JSON.stringify({ excluded: [...excludedJobNames].sort(), settings }),
  [excludedJobNames, settings],
);

useEffect(() => {
  requestIdRef.current++;
  setResult(null);
  setUpgradeResult(null);
  setGrowthSeries(null);
  setError(null);
}, [inputKey]);
```

Sorting the exclusion list before serialising ensures that `new Set(["B", "A"])` and `new Set(["A", "B"])` produce identical keys. The `useMemo` dependency list includes the raw `excludedJobNames` and `settings` references, so the key is recomputed exactly when React sees a reference change — no missed invalidations, no spurious resets.

### 3. `requestIdRef` guards against stale in-flight results

If `calculate()` is in flight and inputs change (triggering the invalidation effect), the cleared state must not be overwritten when the pending API call eventually resolves. The hook uses an integer ref as a monotonically incrementing generation counter:

```typescript
const requestIdRef = useRef(0);

// In the invalidation effect:
requestIdRef.current++;

// In calculate():
const capturedId = ++requestIdRef.current;
const isStale = () => requestIdRef.current !== capturedId;
// ... after every await:
if (isStale()) return;
```

This is the same pattern used in `use-analysis.ts` for the file-parsing pipeline. Any async path that races with an input change or a concurrent `calculate()` call is silently discarded.

### 4. `hasConsented` is excluded from the invalidation key

Consent is a session-level privacy acknowledgement, not a calculation input. If the user excludes a job or changes a settings knob, the privacy consent they gave minutes ago does not need to be revoked. Consent only resets when the SPA is reloaded (i.e. `useState` initial value of `false`).

Keeping `hasConsented` out of `inputKey` means the "Get Sizing Estimate" button shows immediately after any input change, without forcing a re-consent dialog.

### 5. `data` is excluded from the invalidation key

`DashboardView` is instantiated (and `useCalculatorApi` initialised) fresh every time the user uploads a new file — the App state machine transitions through `idle` when the upload button is pressed, destroying the previous `DashboardView` and mounting a new one. Because a new file always produces a new component instance, there is no scenario in which `data` changes while the hook is alive. Including `data` in `inputKey` would add JSON serialisation cost on every render for no benefit.

## Alternatives Considered

### Alternative A: Render `CalculatorInputs` outside `TabsContent` (CSS hide/show)

Mount `CalculatorInputs` unconditionally in `DashboardView`, and use CSS `display: none` / `visibility: hidden` to hide it when the Sizing tab is not active.

- **Pro:** Zero state-lifting refactor; component keeps all state internally.
- **Con:** The Sizing tab is not the primary tab; hiding it in the DOM still reserves layout and paint resources. It also breaks the semantics of the Tabs component — if the sizing content is always mounted, keyboard/screen-reader users may encounter it outside the active tab context.

Rejected. The controlled-props refactor is cleaner and less fragile.

### Alternative B: Persist results to `sessionStorage`

Serialise results to `sessionStorage` on calculation completion; deserialise on mount.

- **Pro:** Results survive even if `DashboardView` remounts (e.g. user uploads same file again).
- **Con:** `VmAgentResponse` is not opaque — it contains deeply nested objects. Serialisation round-trips add complexity and can silently drop non-serialisable fields. It also couples the hook to browser storage, making unit tests heavier. Results are cheap to re-fetch (one consent-gated button press) and are specific to the current file upload, so survival across remounts is not a goal.

Rejected.

### Alternative C: `useRef` to cache the previous result across renders

Store the last `result` in a ref; read from it on mount if state is null.

- **Con:** Ref values do not trigger re-renders. The component would not know to display the ref-cached result without additional synchronisation logic, effectively reimplementing `useState` with extra steps.

Rejected.

### Alternative D: Context provider for calculator state

Wrap the app in a `CalculatorContext`; consumer components subscribe to results.

- **Con:** Sizing results are consumed in exactly one place (`CalculatorInputs`). A context is the right tool when many consumers need the same state; for a single consumer, prop-passing via a parent hook is simpler and more explicit about ownership.

Rejected.

## Consequences

### Positive

- Results survive tab navigation. The user's sizing result and growth chart are preserved for the session duration.
- `CalculatorInputs` is now a controlled component: its behaviour is fully determinable from props, making it easier to test without mocking internal API calls.
- The hook can be tested in isolation via `renderHook` with mocked API dependencies.
- The `requestIdRef` guard matches the existing pattern in `use-analysis.ts`, keeping the codebase consistent.

### Negative

- `DashboardView` now calls `useSettings()` directly (previously only `CalculatorInputs` did). Both components now have a dependency on the settings context — not a problem, but worth noting if settings are ever split.
- `CalculatorInputs` props list grew by 8 fields. Call sites that render the component must supply all controlled props; `dashboard-view.tsx` is currently the only call site, so the blast radius is contained.

## References

- `src/hooks/use-calculator-api.ts` — the new hook
- `src/hooks/use-analysis.ts` — existing `requestIdRef` pattern this mirrors
- `src/components/dashboard/calculator-inputs.tsx` — controlled component refactor
- `src/components/dashboard/dashboard-view.tsx` — hook call site, wires all props
- `src/__tests__/use-calculator-api.test.ts` — 17 tests covering all cases above
