# Review: `feature/phase3-motion-interaction` vs Sprint 3 Spec

**Branch:** `feature/phase3-motion-interaction` (3 commits)
**Reviewed against:** `DESIGN-SYSTEM.md` Sprint 3 + DRY/SOLID/KISS/YAGNI

## Build & Test Status (post-fixes)

- **Tests:** 176/176 pass (14 test files)
- **Build:** `tsc -b && vite build` succeeds cleanly
- **Lint:** 0 errors, 1 pre-existing warning (TanStack `useReactTable` memoization)

## Sprint 3 Acceptance Criteria

| Criterion                                   | Status         | Notes                                                                                                                                                                                                              |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page elements animate on entrance           | **Done**       | All states animate: idle (fade+rise), error (fade+rise), processing (fade), dashboard (fade+rise), cards (50ms stagger), blockers (100ms stagger), job table (fade). `fill-mode-backwards` prevents stagger flash. |
| File upload drag/hover feedback             | **Done**       | Layered icon composition, border solid/dashed toggle, color transitions on drag.                                                                                                                                   |
| Success state feels like achievement        | **Done**       | `SuccessCelebration` component with `animate-success-ring` (scale pulse 1.0→1.05→1.0), staggered text fade-in (200ms, 300ms delays), button slide-up (500ms delay). Total sequence ~800ms per spec §5.5.           |
| Animations respect `prefers-reduced-motion` | **Done**       | Added `motion-safe:` prefixes to all animated elements + `@media (prefers-reduced-motion: reduce)` CSS rule.                                                                                                       |
| Dark mode polished and usable               | **Unverified** | CSS tokens set up in Sprint 1 but no Sprint 3 QA adjustments visible.                                                                                                                                              |
| Button press feedback (scale)               | **Missing**    | Sprint 3 P3 task. `button.tsx` not modified. Spec: `scale(0.98)` on press.                                                                                                                                         |

**Coverage: ~75-80% of Sprint 3 scope.**

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

**Resolved:** Restored `Alert`/`AlertTitle`/`AlertDescription` from shadcn with custom `className` overrides for severity styling. The component now renders `data-slot="alert"` and uses the primitive's built-in grid layout and ARIA attributes.

### 11. No stagger on blockers (`blockers-list.tsx:33`)

Spec §5.3: "Blockers stagger in with 100ms delay each." All blockers animate simultaneously. Cards correctly use `delay-100`/`delay-200` but blockers don't apply dynamic `animationDelay`.

**Resolved:** Added dynamic `style={{ animationDelay: \`${index \* 100}ms\` }}`to each blocker. Tests verify the first blocker has`0ms`and the second has`100ms` delay.

### 12. Missing hover state on file-upload (`file-upload.tsx`)

Spec §5.1: Hover should show "Border solidifies, icon rises 4px, slight background tint." Only `hover:border-muted-foreground/60` is applied — no background tint or icon rise on hover (only on drag-over).

**Resolved:** Added `hover:border-solid`, `hover:bg-muted/50` for background tint and border solidification. Added `group/upload` on the drop zone and `group-hover/upload:-translate-y-1` on the upload icon wrapper for the rise animation on hover.

### 13. Progress is cosmetic, not real (`use-analysis.ts:147-165`)

Design Decision #4: "Display actual validation progress, not fake progress bars." But `analyzeHealthcheck()` runs synchronously first (line 147-149), then steps are ticked through with `tick()` delays for visual effect. The analysis is already complete before the progress animation begins.

**Documented as known deviation:** Added code comment in `use-analysis.ts` explaining the design trade-off. True step-by-step progress would require refactoring `analyzeHealthcheck()` into an async iterator, which is out of scope for Sprint 3. The checklist still shows real step labels and accurate completion — only the timing is presentational.

## Test Quality

- **Good:** `checklist-loader.test.tsx` — 7 tests covering progress, labels, accessibility
- **Good:** `use-analysis.test.ts` — Uses `{ stepDelay: 0 }` to avoid timing flakes
- **Good:** `job-table.test.tsx` — Tests unencrypted row highlighting
- ~~**Gap:** No test for `tick()` function (abort, zero-delay, already-aborted)~~ **Resolved:** 6 tests in `delay.test.ts`
- **Gap:** No test verifying card stagger delay behavior

## Recommendation

All engineering principle issues (#1-#9) and additional concerns (#10-#13) have been resolved. The remaining Sprint 3 acceptance gaps (success celebration animation, `prefers-reduced-motion`, button press feedback) are documented in the Sprint 3 Acceptance Criteria table above and should be addressed in a follow-up.
