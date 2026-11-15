# Immutability Period Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the incorrect `(VDC Vault minimum)` label from the Immutability Period field, make it editable inline via a pencil icon, and wire the value through to the Veeam sizing API.

**Architecture:** `DEFAULT_IMMUTABILITY_DAYS` constant is added to `constants.ts`. `buildVmAgentRequest` reads `summary.immutabilityDays` instead of hardcoding 30. `useCalculatorApi.calculate` gains an `immutabilityDays: number` parameter and patches the summary before calling the API. `CalculatorInputs` holds local `immutabilityDays` state (default 30), renders a pencil/edit UI, and passes the value to `onCalculate`.

**Tech Stack:** React 19, TypeScript 5, Vitest, React Testing Library, shadcn/ui (`Input`, `Button`), lucide-react (`Pencil`, `Check`, `X`, `RotateCcw`).

---

## File Map

| Action           | File                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Modify           | `src/lib/constants.ts`                                                                                          |
| Modify           | `src/lib/veeam-api.ts`                                                                                          |
| Modify (tests)   | `src/__tests__/veeam-api.test.ts`                                                                               |
| Modify           | `src/hooks/use-calculator-api.ts`                                                                               |
| Modify (tests)   | `src/__tests__/use-calculator-api.test.ts`                                                                      |
| Modify           | `src/components/dashboard/calculator-inputs.tsx`                                                                |
| Modify (tests)   | `src/__tests__/calculator-inputs.test.tsx`                                                                      |
| No change needed | `src/components/dashboard/dashboard-view.tsx` _(passes `calculate` as prop; TypeScript alignment is automatic)_ |

---

## Task 1: Add `DEFAULT_IMMUTABILITY_DAYS` and fix `buildVmAgentRequest`

**Files:**

- Modify: `src/lib/constants.ts`
- Modify: `src/lib/veeam-api.ts:60-63`
- Modify (tests): `src/__tests__/veeam-api.test.ts`

- [ ] **Step 1.1 — Write the failing test**

Add this test to the `"buildVmAgentRequest"` describe block in `src/__tests__/veeam-api.test.ts`, after the existing `"uses hardcoded defaults"` test:

```ts
it("reads immutablePerfDays and immutableCapDays from summary.immutabilityDays", () => {
  const customSummary: CalculatorSummary = {
    ...MOCK_SUMMARY,
    immutabilityDays: 14,
  };
  const req = buildVmAgentRequest(customSummary, 10, "13.0.1.1071");
  expect(req.immutablePerfDays).toBe(14);
  expect(req.immutableCapDays).toBe(14);
});
```

- [ ] **Step 1.2 — Run the test to confirm it fails**

```bash
npm run test:run -- --reporter=verbose src/__tests__/veeam-api.test.ts
```

Expected: FAIL — `expect(received).toBe(expected)` — received `30`, expected `14`.

- [ ] **Step 1.3 — Add `DEFAULT_IMMUTABILITY_DAYS` to constants**

In `src/lib/constants.ts`, add after `MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS`:

```ts
export const DEFAULT_IMMUTABILITY_DAYS = 30;
```

Full updated file:

```ts
import type { PipelineStep } from "@/types/domain";

export const CARD_LABEL =
  "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

export const MINIMUM_VBR_VERSION = "12.1.2";
export const EXCLUDED_JOB_TYPES = new Set(["Replica"]);
export const MINIMUM_RETENTION_DAYS = 30;
export const MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS = 30;
export const DEFAULT_IMMUTABILITY_DAYS = 30;

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "parse", label: "Parse healthcheck data" },
  { id: "vbr-version", label: "Validate VBR version" },
  { id: "encryption", label: "Check encryption rules" },
  { id: "aws-workload", label: "Scan for AWS workloads" },
  { id: "agent-checks", label: "Verify agent configuration" },
  { id: "license-edition", label: "Check license type" },
  { id: "sobr-analysis", label: "Analyze SOBR configuration" },
];
```

- [ ] **Step 1.4 — Fix `buildVmAgentRequest` to read from `summary.immutabilityDays`**

In `src/lib/veeam-api.ts`, replace lines 60–63:

```ts
// before
immutablePerfDays: 30,
immutableCapDays: 30,

// after
immutablePerfDays: summary.immutabilityDays,
immutableCapDays: summary.immutabilityDays,
```

- [ ] **Step 1.5 — Run all veeam-api tests to confirm they pass**

```bash
npm run test:run -- --reporter=verbose src/__tests__/veeam-api.test.ts
```

Expected: all pass. The existing `"uses hardcoded defaults"` test still passes because `MOCK_SUMMARY.immutabilityDays` is already `30`.

- [ ] **Step 1.6 — Commit**

```bash
git add src/lib/constants.ts src/lib/veeam-api.ts src/__tests__/veeam-api.test.ts
git commit -m "$(cat <<'EOF'
fix(calculator): read immutability days from summary in buildVmAgentRequest

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `useCalculatorApi` to accept `immutabilityDays` parameter

**Files:**

- Modify: `src/hooks/use-calculator-api.ts`
- Modify (tests): `src/__tests__/use-calculator-api.test.ts`

- [ ] **Step 2.1 — Write the failing test**

Add this test to the `"calculate()"` describe block in `src/__tests__/use-calculator-api.test.ts`:

```ts
it("patches summary with the provided immutabilityDays before calling callVmAgentApi", async () => {
  const { result } = renderHook(() => useCalculatorApi(baseProps));

  await act(async () => {
    await result.current.calculate(14);
  });

  expect(vi.mocked(callVmAgentApi)).toHaveBeenCalledWith(
    { ...DEFAULT_SUMMARY, immutabilityDays: 14 },
    expect.any(Number),
    expect.any(String),
    undefined,
    DEFAULT_SETTINGS,
  );
});
```

- [ ] **Step 2.2 — Run the test to confirm it fails**

```bash
npm run test:run -- --reporter=verbose src/__tests__/use-calculator-api.test.ts
```

Expected: TypeScript compilation error or FAIL — `callVmAgentApi` called with `immutabilityDays: 30`, not `14`.

- [ ] **Step 2.3 — Update `UseCalculatorApiResult` interface and `calculate` implementation**

Replace the full content of `src/hooks/use-calculator-api.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import {
  generateGrowthSeries,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";
import type { NormalizedDataset } from "@/types/domain";
import type { GlobalSettings } from "@/types/settings";
import type { VmAgentResponse } from "@/types/veeam-api";
import { callVmAgentApi } from "@/lib/veeam-api";
import { isVersionAtLeast } from "@/lib/version-compare";

export interface UseCalculatorApiOptions {
  data: NormalizedDataset;
  excludedJobNames: Set<string>;
  settings: GlobalSettings;
}

export interface UseCalculatorApiResult {
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  grantConsent: () => void;
  calculate: (immutabilityDays: number) => Promise<void>;
}

export function useCalculatorApi({
  data,
  excludedJobNames,
  settings,
}: UseCalculatorApiOptions): UseCalculatorApiResult {
  const [result, setResult] = useState<VmAgentResponse | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<VmAgentResponse | null>(
    null,
  );
  const [growthSeries, setGrowthSeries] = useState<GrowthSeriesPoint[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  const requestIdRef = useRef(0);

  const inputKey = useMemo(
    () =>
      JSON.stringify({
        excluded: [...excludedJobNames].sort(),
        settings,
      }),
    [excludedJobNames, settings],
  );

  useEffect(() => {
    requestIdRef.current++;
    setResult(null);
    setUpgradeResult(null);
    setGrowthSeries(null);
    setError(null);
    setLoading(false);
  }, [inputKey]);

  const grantConsent = useCallback(() => {
    setHasConsented(true);
  }, []);

  const calculate = useCallback(
    async (immutabilityDays: number) => {
      const vbrVersion = data.backupServer?.[0]?.Version ?? "";
      const isVbr12 =
        vbrVersion !== "" && !isVersionAtLeast(vbrVersion, "13.0.0");
      const activeJobCount = data.jobInfo.filter(
        (j) => !excludedJobNames.has(j.JobName),
      ).length;
      const summary = buildCalculatorSummary(
        data.jobInfo,
        data.jobSessionSummary,
        excludedJobNames,
        settings,
      );
      const patchedSummary = { ...summary, immutabilityDays };
      const growthArgs = {
        jobs: data.jobInfo,
        sessions: data.jobSessionSummary,
        excludedJobNames,
        settings,
        jobCount: activeJobCount,
        vbrVersion,
      };

      const capturedId = ++requestIdRef.current;
      const isStale = () => requestIdRef.current !== capturedId;

      setLoading(true);
      setError(null);
      setResult(null);
      setUpgradeResult(null);
      setGrowthSeries(null);

      try {
        if (isVbr12) {
          const [v12Res, v13Res, growth] = await Promise.all([
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              undefined,
              settings,
            ),
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              0,
              settings,
            ),
            generateGrowthSeries(growthArgs),
          ]);
          if (isStale()) return;
          setResult(v12Res);
          setUpgradeResult(v13Res);
          setGrowthSeries(growth);
        } else {
          const [res, growth] = await Promise.all([
            callVmAgentApi(
              patchedSummary,
              activeJobCount,
              vbrVersion,
              undefined,
              settings,
            ),
            generateGrowthSeries(growthArgs),
          ]);
          if (isStale()) return;
          setResult(res);
          setGrowthSeries(growth);
        }
      } catch {
        if (!isStale()) {
          setError(
            "Could not retrieve sizing estimate. Check your connection and try again.",
          );
        }
      } finally {
        if (!isStale()) {
          setLoading(false);
        }
      }
    },
    [data, excludedJobNames, settings],
  );

  return {
    result,
    upgradeResult,
    growthSeries,
    error,
    loading,
    hasConsented,
    grantConsent,
    calculate,
  };
}
```

- [ ] **Step 2.4 — Update every `calculate()` call in the test file**

In `src/__tests__/use-calculator-api.test.ts`, change every `result.current.calculate()` call to `result.current.calculate(30)`. There are approximately 16 occurrences — use a global find-and-replace: `result.current.calculate()` → `result.current.calculate(30)`. Also change the `calculatePromise = result.current.calculate()` assignment (line ~387) to `calculatePromise = result.current.calculate(30)`.

The exact assertion at line 410–416 that checks `callVmAgentApi` was called with `DEFAULT_SUMMARY` continues to pass because `{ ...DEFAULT_SUMMARY, immutabilityDays: 30 }` is structurally identical to `DEFAULT_SUMMARY` (its `immutabilityDays` is already `30`).

- [ ] **Step 2.5 — Run the test file to confirm all tests pass**

```bash
npm run test:run -- --reporter=verbose src/__tests__/use-calculator-api.test.ts
```

Expected: all pass.

- [ ] **Step 2.6 — Commit**

```bash
git add src/hooks/use-calculator-api.ts src/__tests__/use-calculator-api.test.ts
git commit -m "$(cat <<'EOF'
fix(calculator): pass immutabilityDays through calculate() to API request

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `CalculatorInputs` — remove label, add inline edit UI, fix call sites

**Files:**

- Modify: `src/components/dashboard/calculator-inputs.tsx`
- Modify (tests): `src/__tests__/calculator-inputs.test.tsx`

### 3a — Remove the incorrect label

- [ ] **Step 3a.1 — Update the existing test that asserts `(VDC Vault minimum)`**

In `src/__tests__/calculator-inputs.test.tsx`, find the `"displays aggregated values correctly"` test. Replace:

```ts
// before
expect(screen.getByText("(VDC Vault minimum)")).toBeInTheDocument();

// after
expect(screen.queryByText("(VDC Vault minimum)")).not.toBeInTheDocument();
```

- [ ] **Step 3a.2 — Run to confirm this assertion now fails**

```bash
npm run test:run -- --reporter=verbose src/__tests__/calculator-inputs.test.tsx
```

Expected: FAIL — element `(VDC Vault minimum)` is found in the DOM but the test now expects it to be absent.

### 3b — Add new tests for the inline edit UI

- [ ] **Step 3b.1 — Add a new describe block for the inline edit**

Add a new `describe("immutability period inline edit", ...)` block at the bottom of the top-level `describe("CalculatorInputs", ...)` in `src/__tests__/calculator-inputs.test.tsx`:

```ts
describe("immutability period inline edit", () => {
  it("does not render '(VDC Vault minimum)' label", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    expect(
      screen.queryByText("(VDC Vault minimum)"),
    ).not.toBeInTheDocument();
  });

  it("renders a pencil button to edit the immutability period", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    expect(
      screen.getByRole("button", { name: /edit immutability period/i }),
    ).toBeInTheDocument();
  });

  it("clicking the pencil shows the number input and action buttons", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel immutability period edit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset to 30/i }),
    ).toBeInTheDocument();
  });

  it("confirm updates the displayed value and exits edit mode", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    expect(screen.getByText("14 days")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("Enter key confirms and exits edit mode", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });
    expect(screen.getByText("14 days")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("cancel reverts to the previous value and exits edit mode", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /cancel immutability period edit/i,
      }),
    );
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("Escape key cancels and reverts to the previous value", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Escape" });
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("reset sets value back to 30 and exits edit mode", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    // First set a custom value
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    expect(screen.getByText("14 days")).toBeInTheDocument();
    // Now open again and reset
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reset to 30/i }));
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("rejects a value of 0 — stays in edit mode without updating", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "0" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.queryByText("0 days")).not.toBeInTheDocument();
  });

  it("pencil icon has text-primary class when override is active", () => {
    render(<CalculatorInputs data={mockData} {...defaultControlledProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    expect(
      screen.getByRole("button", { name: /edit immutability period/i }),
    ).toHaveClass("text-primary");
  });

  it("passes the immutabilityDays override to onCalculate on button click", () => {
    const onCalculate = vi.fn().mockResolvedValue(undefined);
    render(
      <CalculatorInputs
        data={mockDataVbr13}
        {...defaultControlledProps}
        onCalculate={onCalculate}
        hasConsented={true}
        result={MOCK_API_RESULT}
      />,
    );
    // Set a custom value
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    // Trigger calculation
    fireEvent.click(screen.getByRole("button", { name: /re-calculate/i }));
    expect(onCalculate).toHaveBeenCalledWith(14);
  });

  it("passes immutabilityDays to onCalculate when consent dialog is accepted", () => {
    const onCalculate = vi.fn().mockResolvedValue(undefined);
    const onConsentGiven = vi.fn();
    render(
      <CalculatorInputs
        data={mockDataVbr13}
        {...defaultControlledProps}
        onCalculate={onCalculate}
        onConsentGiven={onConsentGiven}
        hasConsented={false}
      />,
    );
    // Set a custom value
    fireEvent.click(
      screen.getByRole("button", { name: /edit immutability period/i }),
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm immutability period/i }),
    );
    // Trigger consent flow
    fireEvent.click(
      screen.getByRole("button", { name: /get sizing estimate/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept & calculate/i }),
    );
    expect(onCalculate).toHaveBeenCalledWith(14);
  });
});
```

- [ ] **Step 3b.2 — Run tests to confirm the new tests fail**

```bash
npm run test:run -- --reporter=verbose src/__tests__/calculator-inputs.test.tsx
```

Expected: multiple FAILs — pencil button not found, inline edit UI not present, `(VDC Vault minimum)` still present, `onCalculate` called without args.

### 3c — Implement the changes in `calculator-inputs.tsx`

- [ ] **Step 3c.1 — Update imports**

Replace the lucide-react import block and add the `Input` import and `DEFAULT_IMMUTABILITY_DAYS` constant import:

```ts
import {
  Archive,
  Calculator,
  Check,
  Clock,
  Cloud,
  ExternalLink,
  Info,
  Loader2,
  Pencil,
  RotateCcw,
  Server,
  TrendingUp,
  X,
} from "lucide-react";
```

```ts
import {
  MINIMUM_RETENTION_DAYS,
  DEFAULT_IMMUTABILITY_DAYS,
} from "@/lib/constants";
```

```ts
import { Input } from "@/components/ui/input";
```

- [ ] **Step 3c.2 — Update `CalculatorInputsProps` interface**

```ts
interface CalculatorInputsProps {
  data: NormalizedDataset;
  excludedJobNames?: Set<string>;
  result: VmAgentResponse | null;
  upgradeResult: VmAgentResponse | null;
  growthSeries: GrowthSeriesPoint[] | null;
  error: string | null;
  loading: boolean;
  hasConsented: boolean;
  onConsentGiven: () => void;
  onCalculate: (immutabilityDays: number) => Promise<void>;
}
```

- [ ] **Step 3c.3 — Add local state and handlers**

Inside `CalculatorInputs`, after the existing `const [consentOpen, setConsentOpen] = useState(false);` line, add:

```ts
const [immutabilityDays, setImmutabilityDays] = useState<number>(
  DEFAULT_IMMUTABILITY_DAYS,
);
const [isEditingImmutability, setIsEditingImmutability] =
  useState<boolean>(false);
const [immutabilityDraft, setImmutabilityDraft] = useState<number>(
  DEFAULT_IMMUTABILITY_DAYS,
);

const handleImmutabilityConfirm = () => {
  if (!Number.isFinite(immutabilityDraft) || immutabilityDraft <= 0) return;
  setImmutabilityDays(immutabilityDraft);
  setIsEditingImmutability(false);
};

const handleImmutabilityCancel = () => {
  setIsEditingImmutability(false);
  setImmutabilityDraft(immutabilityDays);
};

const handleImmutabilityReset = () => {
  setImmutabilityDays(DEFAULT_IMMUTABILITY_DAYS);
  setImmutabilityDraft(DEFAULT_IMMUTABILITY_DAYS);
  setIsEditingImmutability(false);
};
```

- [ ] **Step 3c.4 — Update `handleButtonClick` to pass `immutabilityDays`**

Replace:

```ts
const handleButtonClick = () => {
  if (hasConsented) {
    void onCalculate();
  } else {
    setConsentOpen(true);
  }
};
```

With:

```ts
const handleButtonClick = () => {
  if (hasConsented) {
    void onCalculate(immutabilityDays);
  } else {
    setConsentOpen(true);
  }
};
```

- [ ] **Step 3c.5 — Replace the immutability period cell JSX**

Replace the entire `<div className="space-y-1">` block containing `Immutability Period` (the one with the `(VDC Vault minimum)` span) with:

```tsx
<div className="space-y-1">
  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
    Immutability Period
  </p>
  {isEditingImmutability ? (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="number"
        min={1}
        value={Number.isNaN(immutabilityDraft) ? "" : immutabilityDraft}
        onChange={(e) => setImmutabilityDraft(parseInt(e.target.value, 10))}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleImmutabilityConfirm();
          if (e.key === "Escape") handleImmutabilityCancel();
        }}
        className="w-20 font-mono"
        autoFocus
      />
      <span className="text-muted-foreground text-sm">days</span>
      <Button
        type="button"
        size="icon"
        className="size-7"
        onClick={handleImmutabilityConfirm}
        aria-label="Confirm immutability period"
      >
        <Check className="size-3" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={handleImmutabilityCancel}
        aria-label="Cancel immutability period edit"
      >
        <X className="size-3" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 text-xs"
        onClick={handleImmutabilityReset}
      >
        <RotateCcw className="mr-1 size-3" aria-hidden="true" />
        Reset to {DEFAULT_IMMUTABILITY_DAYS}
      </Button>
    </div>
  ) : (
    <div className="flex items-baseline gap-2">
      <p className="font-mono text-2xl font-semibold">
        {immutabilityDays} days
      </p>
      <button
        type="button"
        onClick={() => {
          setImmutabilityDraft(immutabilityDays);
          setIsEditingImmutability(true);
        }}
        aria-label="Edit immutability period"
        className={cn(
          "inline-flex items-center justify-center motion-safe:transition-colors",
          immutabilityDays !== DEFAULT_IMMUTABILITY_DAYS
            ? "text-primary"
            : "text-muted-foreground/70 hover:text-foreground",
        )}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 3c.6 — Update the consent dialog `onAccept` to pass `immutabilityDays`**

Find the `<CalculatorConsentDialog` usage and update `onAccept`:

```tsx
onAccept={() => {
  onConsentGiven();
  void onCalculate(immutabilityDays);
}}
```

- [ ] **Step 3c.7 — Run the full calculator-inputs test suite**

```bash
npm run test:run -- --reporter=verbose src/__tests__/calculator-inputs.test.tsx
```

Expected: all pass.

- [ ] **Step 3c.8 — Run the full test suite to confirm no regressions**

```bash
npm run test:run
```

Expected: all pass (or only pre-existing failures if any).

- [ ] **Step 3c.9 — Run the TypeScript build to verify type alignment**

```bash
npm run build
```

Expected: success. `dashboard-view.tsx` passes `calculate` (now typed `(immutabilityDays: number) => Promise<void>`) as `onCalculate` to `CalculatorInputs` (now typed identically) — TypeScript validates this automatically.

- [ ] **Step 3c.10 — Commit**

```bash
git add src/lib/constants.ts src/components/dashboard/calculator-inputs.tsx src/__tests__/calculator-inputs.test.tsx
git commit -m "$(cat <<'EOF'
fix(calculator): make immutability period editable inline

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Done

All three tasks complete. Verify the full test suite and build one final time before opening a PR:

```bash
npm run test:run && npm run build
```
