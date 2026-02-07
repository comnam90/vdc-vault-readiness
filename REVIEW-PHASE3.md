# Review: `feature/phase3-motion-interaction` vs Sprint 3 Spec

**Branch:** `feature/phase3-motion-interaction` (3 commits)
**Reviewed against:** `DESIGN-SYSTEM.md` Sprint 3 + DRY/SOLID/KISS/YAGNI

## Build & Test Status (post-fixes)

- **Tests:** 167/167 pass (14 test files — 6 new `delay.test.ts` tests)
- **Build:** `tsc -b && vite build` succeeds cleanly
- **Lint:** 0 errors, 1 pre-existing warning (TanStack `useReactTable` memoization)

## Sprint 3 Acceptance Criteria

| Criterion                                   | Status         | Notes                                                                                                                                                 |
| ------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page elements animate on entrance           | **Partial**    | Dashboard + cards stagger correctly. Blockers lack per-item stagger (spec: 100ms each).                                                               |
| File upload drag/hover feedback             | **Done**       | Layered icon composition, border solid/dashed toggle, color transitions on drag.                                                                      |
| Success state feels like achievement        | **Missing**    | Spec §5.5 calls for checkmark draw + scale pulse + staggered text. No success animation added.                                                        |
| Animations respect `prefers-reduced-motion` | **Missing**    | No `motion-reduce:` / `motion-safe:` Tailwind classes or `@media` rules. Design Decision #7 says "Add Later" but Acceptance Criterion #8 requires it. |
| Dark mode polished and usable               | **Unverified** | CSS tokens set up in Sprint 1 but no Sprint 3 QA adjustments visible.                                                                                 |
| Button press feedback (scale)               | **Missing**    | Sprint 3 P3 task. `button.tsx` not modified. Spec: `scale(0.98)` on press.                                                                            |

**Coverage: ~60-70% of Sprint 3 scope.**

## DRY Issues

### 1. Repeated card animation classes (`dashboard-view.tsx:77-125`)

Each summary card repeats:

```
"animate-in fade-in border-b-2 shadow-sm transition-shadow duration-300 hover:shadow-md"
```

Only the stagger delay and border color differ. Extract a shared base string constant.

**Resolved:** Extracted `SUMMARY_CARD` and `CARD_LABEL` constants in `dashboard-view.tsx`.

### 2. Duplicated badge rendering (`blockers-list.tsx:59-72`)

Fail/warning badges are structurally identical except variant, colors, and label. Could consolidate with a mapping object.

**Resolved:** Created `SEVERITY` config object in `blockers-list.tsx` mapping fail/warning to icon, colors, badge variant, and label.

### 3. Repeated `CardDescription` label style (`dashboard-view.tsx:84, 107, 129`)

`"text-muted-foreground text-xs font-semibold tracking-wide uppercase"` is duplicated 3 times. This appears to be the standard card label style per the design system and should be a constant.

**Resolved:** Consolidated into the `CARD_LABEL` constant (see issue #1 fix).

## SOLID Issues

### 4. SRP: `tick()` utility in hook file (`use-analysis.ts:49-85`)

The `tick()` function is a 37-line general-purpose abort-aware delay. It belongs in `src/lib/` (e.g., `delay.ts`) for independent testing and reuse. Currently it is buried in a hook file.

**Resolved:** Extracted to `src/lib/delay.ts` with 6 dedicated tests in `src/__tests__/delay.test.ts`.

### 5. SRP: `PipelineStep` interface in `constants.ts` (`constants.ts:3-6`)

Type definitions belong in `src/types/` per project convention. `PipelineStep` should live in `src/types/domain.ts` or `src/types/pipeline.ts`, with only the runtime `PIPELINE_STEPS` array remaining in `constants.ts`.

**Resolved:** Moved `PipelineStep` interface to `src/types/domain.ts`. `constants.ts` now imports it.

## KISS Issues

### 6. Over-engineered `tick()` (`use-analysis.ts:49-85`)

37 lines for an abortable delay with a `settled` flag, `idHolder` object, and manual event listener cleanup. JavaScript's single-threaded event loop makes double-resolution impossible. Simpler equivalent (~5 lines):

```ts
function tick(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true },
    );
  });
}
```

### 7. `animate-pulse` with arbitrary overrides (`blockers-list.tsx:35`)

```
animate-pulse [animation-duration:600ms] [animation-iteration-count:1]
```

Using `animate-pulse` and overriding both its duration and iteration count fights the framework. Define a custom `@keyframes attention-pulse` in `index.css` instead. Current approach is fragile if Tailwind changes `animate-pulse` keyframes.

**Resolved:** Added `@keyframes attention-pulse` and `@utility animate-attention-pulse` in `index.css`. `blockers-list.tsx` now uses `animate-attention-pulse` instead of the override pattern.

## YAGNI Issues

### 8. Unused `info-muted` token (`index.css`)

`--info-muted` and `--color-info-muted` are defined in both light/dark mode but never referenced in any component.

**Resolved:** Removed `--info-muted` from `:root`, `.dark`, and `@theme inline` blocks in `index.css`.

### 9. Eagerly initialized `AbortController` (`use-analysis.ts:96`)

```ts
const abortRef = useRef<AbortController>(new AbortController());
```

Creates an unused controller on mount. Could be `useRef<AbortController | null>(null)` with a null check.

**Resolved:** Changed to `useRef<AbortController | null>(null)` with optional chaining (`?.abort()`) in `analyzeFile` and `reset`.

## Additional Concerns

### 10. Dropped `Alert` shadcn primitive (`blockers-list.tsx`)

The shadcn `Alert` + `AlertTitle` + `AlertDescription` was replaced with hand-rolled `<div role="alert">`. This breaks the convention of using shadcn primitives and loses built-in accessibility features. The styling control could have been achieved by extending or wrapping the Alert component.

### 11. No stagger on blockers (`blockers-list.tsx:33`)

Spec §5.3: "Blockers stagger in with 100ms delay each." All blockers animate simultaneously. Cards correctly use `delay-100`/`delay-200` but blockers don't apply dynamic `animationDelay`.

### 12. Missing hover state on file-upload (`file-upload.tsx`)

Spec §5.1: Hover should show "Border solidifies, icon rises 4px, slight background tint." Only `hover:border-muted-foreground/60` is applied — no background tint or icon rise on hover (only on drag-over).

### 13. Progress is cosmetic, not real (`use-analysis.ts:147-165`)

Design Decision #4: "Display actual validation progress, not fake progress bars." But `analyzeHealthcheck()` runs synchronously first (line 147-149), then steps are ticked through with `tick()` delays for visual effect. The analysis is already complete before the progress animation begins.

## Test Quality

- **Good:** `checklist-loader.test.tsx` — 7 tests covering progress, labels, accessibility
- **Good:** `use-analysis.test.ts` — Uses `{ stepDelay: 0 }` to avoid timing flakes
- **Good:** `job-table.test.tsx` — Tests unencrypted row highlighting
- ~~**Gap:** No test for `tick()` function (abort, zero-delay, already-aborted)~~ **Resolved:** 6 tests in `delay.test.ts`
- **Gap:** No test verifying card stagger delay behavior

## Recommendation

Address the **Missing** items (especially `prefers-reduced-motion` and the success celebration) before merge. The DRY and KISS fixes (shared card class constant, simplified `tick()`, custom keyframe) are low-effort improvements that reduce maintenance burden. The cosmetic progress concern (issue #13) should be documented as a known deviation from the design decision or refactored to tick steps during actual pipeline execution.
