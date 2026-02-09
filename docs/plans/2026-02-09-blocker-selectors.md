# Blocker Selector Utilities Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize validation status filtering (blockers and passing checks) into shared selectors and refactor dashboard components to use them.

**Architecture:** Add a small selector module in `src/lib/validation-selectors.ts` and have `DashboardView`, `BlockersList`, and `PassingChecksList` consume those selectors to avoid duplicated status logic while preserving existing UI behavior.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, React Testing Library

---

### Task 1: Selector Utilities (New Module)

**Files:**

- Create: `src/lib/validation-selectors.ts`
- Test: `src/__tests__/validation-selectors.test.ts`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/types/validation";
import {
  getBlockerValidations,
  getPassingValidations,
  getBlockerCount,
  hasBlockers,
} from "@/lib/validation-selectors";
import { FAIL_RESULT, PASS_RESULT, WARNING_RESULT } from "./fixtures";

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: [],
};

describe("validation selectors", () => {
  it("returns blocker validations sorted fail before warning", () => {
    const blockers = getBlockerValidations([
      WARNING_RESULT,
      PASS_RESULT,
      FAIL_RESULT,
    ]);

    expect(blockers.map((blocker) => blocker.ruleId)).toEqual([
      "job-encryption",
      "agent-workload",
    ]);
  });

  it("returns only passing validations", () => {
    const passing = getPassingValidations([
      PASS_RESULT,
      FAIL_RESULT,
      WARNING_RESULT,
      INFO_RESULT,
    ]);

    expect(passing.map((result) => result.ruleId)).toEqual(["vbr-version"]);
  });

  it("reports blocker presence and count", () => {
    const validations = [PASS_RESULT, WARNING_RESULT];

    expect(hasBlockers(validations)).toBe(true);
    expect(getBlockerCount(validations)).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/validation-selectors.test.ts`
Expected: FAIL with module not found or missing exports.

**Step 3: Write minimal implementation**

```ts
import type { ValidationResult } from "@/types/validation";

const isBlocker = (result: ValidationResult) =>
  result.status === "fail" || result.status === "warning";

export const getBlockerValidations = (validations: ValidationResult[]) =>
  validations.filter(isBlocker).sort((a, b) => {
    if (a.status === "fail" && b.status !== "fail") return -1;
    if (a.status !== "fail" && b.status === "fail") return 1;
    return 0;
  });

export const getPassingValidations = (validations: ValidationResult[]) =>
  validations.filter((v) => v.status === "pass");

export const hasBlockers = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length > 0;

export const getBlockerCount = (validations: ValidationResult[]) =>
  getBlockerValidations(validations).length;
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/validation-selectors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/validation-selectors.ts src/__tests__/validation-selectors.test.ts
git commit -m "refactor: add validation selector helpers"
```

---

### Task 2: Refactor Dashboard Components to Use Selectors

**Files:**

- Modify: `src/components/dashboard/dashboard-view.tsx`
- Modify: `src/components/dashboard/blockers-list.tsx`
- Modify: `src/components/dashboard/passing-checks-list.tsx`
- Test: `src/__tests__/dashboard-view.test.tsx`
- Test: `src/__tests__/blockers-list.test.tsx`
- Test: `src/__tests__/passing-checks-list.test.tsx`

**Step 1: Write failing tests**

Update component tests to use new props (e.g., `BlockersList` accepts `blockers` array, `PassingChecksList` uses `blockerCount` from selector count). Ensure tests import the selector helpers and assert consistent ordering/count values. Run tests for these files and expect failure until components are updated.

**Step 2: Implement minimal refactor**

- `DashboardView`: compute `const blockers = getBlockerValidations(validations)`; `const hasBlockers = blockers.length > 0; const blockerCount = blockers.length;` and pass `blockers` to `BlockersList` and `blockerCount` to `PassingChecksList`.
- `BlockersList`: update props to accept `blockers: ValidationResult[]` and remove inline filtering/sorting.
- `PassingChecksList`: use `getPassingValidations(validations)`.

**Step 3: Run tests**

Run: `npm run test:run -- src/__tests__/dashboard-view.test.tsx src/__tests__/blockers-list.test.tsx src/__tests__/passing-checks-list.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/dashboard/*.tsx src/__tests__/*.test.tsx
git commit -m "refactor: reuse validation selectors in dashboard"
```

---

### Task 3: Full Verification

**Step 1:** `npm run test:run`

**Step 2:** `npm run build`

**Step 3:** `lsp_diagnostics` on modified files

**Step 4:** Report results
