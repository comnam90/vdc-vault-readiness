# Immutability Period — Editable Inline Field

**Date:** 2026-05-28
**Branch:** fix/immutability-period-editable

## Problem

The Calculator Inputs card displays an `Immutability Period` row hardcoded to 30 days with the label `(VDC Vault minimum)`. This label is factually wrong: VDC Vault enforces no minimum immutability period — only that immutability is enabled. The 30-day minimum is a retention constraint, already enforced separately. Additionally, the 30-day value is hardcoded in both the display layer and the Veeam sizing API request, so users cannot adjust the assumption for their environment.

## Goals

- Remove the incorrect `(VDC Vault minimum)` label.
- Allow users to edit the immutability period for the current session.
- Flow the edited value through to the Veeam sizing API (`immutablePerfDays` / `immutableCapDays`).
- Not persist the value across sessions — this is a per-session tweak, not a global setting.

## Out of Scope

- Adding immutability period to the Global Settings dialog or localStorage.
- Changing the 30-day default.
- Separate per-tier (perf vs cap) immutability period overrides.

## UI Design

### Three States

**Default (30 days):**

- Displays `30 days` in the standard monospace style.
- Muted pencil icon (`text-muted-foreground`) to the right, indicating the field is editable.
- No supplementary label.

**Overridden (non-default value):**

- Displays the custom value (e.g. `14 days`).
- Pencil icon tinted `text-primary`, signalling an active override.

**Editing:**

- Value replaced with a number input (min 1, no max enforced by the UI beyond the `min` attribute).
- Three action controls in a flex row:
  - ✓ Confirm button (primary style) — also triggered by Enter.
  - ✗ Cancel button (outline style) — also triggered by Esc.
  - ↺ Reset to 30 days button (ghost/muted style) — resets draft to `DEFAULT_IMMUTABILITY_DAYS` and exits edit mode.
- Input is auto-focused on entering edit mode.

### Behaviour

- Clicking the pencil opens edit mode and focuses the input.
- Committing a blank, NaN, or value ≤ 0 is rejected; the input stays open.
- On cancel, the displayed value reverts to whatever it was before editing started.
- The value resets to 30 when a new healthcheck file is uploaded (component re-mounts, local state reinitialised).

## Architecture

### New constant

```ts
// src/lib/constants.ts
export const DEFAULT_IMMUTABILITY_DAYS = 30;
```

### `src/components/dashboard/calculator-inputs.tsx`

- Remove the `<span>(VDC Vault minimum)</span>` from the Immutability Period cell.
- Add local state:
  ```ts
  const [immutabilityDays, setImmutabilityDays] = useState(
    DEFAULT_IMMUTABILITY_DAYS,
  );
  const [isEditingImmutability, setIsEditingImmutability] = useState(false);
  const [immutabilityDraft, setImmutabilityDraft] = useState(
    DEFAULT_IMMUTABILITY_DAYS,
  );
  ```
- Render the pencil/edit UI based on `isEditingImmutability`.
- Update both `onCalculate` call sites (button handler and consent dialog `onAccept`):
  ```ts
  // was: void onCalculate();
  void onCalculate(immutabilityDays);
  ```
- Update `CalculatorInputsProps`:
  ```ts
  onCalculate: (immutabilityDays: number) => Promise<void>;
  ```

### `src/hooks/use-calculator-api.ts`

- Change `calculate` signature:
  ```ts
  // was: calculate: () => Promise<void>
  calculate: (immutabilityDays: number) => Promise<void>;
  ```
- Inside `calculate`, patch the summary before the API call:
  ```ts
  const summary = buildCalculatorSummary(...);
  const patchedSummary = { ...summary, immutabilityDays };
  // pass patchedSummary to callVmAgentApi instead of summary
  ```
- Update `UseCalculatorApiResult` interface accordingly.

### `src/lib/veeam-api.ts`

- In `buildVmAgentRequest`, replace hardcoded values:
  ```ts
  // was:
  immutablePerfDays: 30,
  immutableCapDays: 30,
  // becomes:
  immutablePerfDays: summary.immutabilityDays,
  immutableCapDays: summary.immutabilityDays,
  ```

### `src/components/dashboard/dashboard-view.tsx`

- No logic change. The `calculate` function from `useCalculatorApi` already matches the new signature; TypeScript alignment only.

## Tests

| File                         | What to cover                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `calculator-inputs.test.tsx` | Renders without `(VDC Vault minimum)` text; pencil icon present; clicking pencil shows input + confirm + cancel + reset; confirm updates displayed value; cancel reverts; reset sets value back to 30; entering 0 or negative is rejected; non-default value tints pencil icon |
| `use-calculator-api.test.ts` | `calculate(days)` patches summary with provided `immutabilityDays` before calling `callVmAgentApi`                                                                                                                                                                             |
| `veeam-api.test.ts`          | `buildVmAgentRequest` reads `summary.immutabilityDays` for both `immutablePerfDays` and `immutableCapDays`                                                                                                                                                                     |

## Branch Strategy

Work goes on `fix/immutability-period-editable`. Conventional commit: `fix(calculator): make immutability period editable inline`.
