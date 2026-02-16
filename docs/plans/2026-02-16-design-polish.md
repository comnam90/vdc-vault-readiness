# Design Polish Plan

**Date:** 2026-02-16
**Branch:** `feature/design-polish` (from `main`)
**Status:** Planned

## Context

A design review found the app reads as a generic shadcn/ui template rather than a distinctive product. The core issues: flat white backgrounds with no atmosphere, summary cards with barely-visible bottom borders, an empty/uninviting landing page, weak contrast on unencrypted job rows, and an understated passing checks heading. These changes elevate the UI from "correct" to "distinctive" while staying within the existing CSS-only animation approach and Veeam brand palette.

## Requirements Summary

1. **Atmosphere** — Subtle Veeam-green-tinted gradient backgrounds (light + dark mode)
2. **Stronger summary cards** — Thicker colored bottom borders, status-tinted backgrounds, visual emphasis on Readiness card
3. **Richer landing page** — Premium drop zone (frosted glass, shadow depth), value proposition text
4. **Job table contrast** — Clearer unencrypted row tinting, search result count indicator
5. **Celebratory passing checks** — Green heading with icon and entrance animation

## Files Modified

| File                                               | Change                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/index.css`                                    | Add gradient tokens, card tint tokens, `celebrate-in` keyframe/utility       |
| `src/App.tsx`                                      | Apply gradient background to outer wrapper, add value proposition text       |
| `src/components/dashboard/file-upload.tsx`         | Premium drop zone: frosted glass bg, shadow, larger icon/text, softer border |
| `src/components/dashboard/dashboard-view.tsx`      | `border-b-4`, tinted card backgrounds, Readiness card ring glow              |
| `src/components/dashboard/job-table.tsx`           | `bg-destructive/10` row tinting, conditional hover, search result count      |
| `src/components/dashboard/passing-checks-list.tsx` | Green icon + larger heading with `celebrate-in` animation                    |

## TDD Implementation Steps

Each step follows **Red-Green-Refactor**: write/update failing test first, implement minimum code to pass, then refactor.

### Step 1: CSS Foundation Tokens

**File:** `src/index.css`

**Red:** Update failing tests first to assert token/utility consumers:

- `src/__tests__/app.test.tsx`: app shell uses the surface gradient token (class or fallback style).
- `src/__tests__/dashboard-view.test.tsx`: summary cards can apply `bg-card-tint-*` classes.
- `src/__tests__/passing-checks-list.test.tsx`: heading/icon can apply `motion-safe:animate-celebrate-in`.

These assertions should fail before the new token/utility definitions are added.

**Green:** Add:

**`:root` (light mode):**

```css
/* Atmosphere gradients */
--surface-gradient: linear-gradient(
  180deg,
  oklch(0.97 0.01 155 / 40%) 0%,
  oklch(1 0 0) 60%
);

/* Card status tints */
--card-tint-success: oklch(0.97 0.03 155);
--card-tint-destructive: oklch(0.97 0.03 25);
--card-tint-neutral: oklch(0.97 0.005 280);
```

**Dark mode overrides:**

```css
--surface-gradient: linear-gradient(
  180deg,
  oklch(0.18 0.01 155 / 30%) 0%,
  oklch(0.15 0 0) 60%
);
--card-tint-success: oklch(0.19 0.03 155);
--card-tint-destructive: oklch(0.19 0.03 25);
--card-tint-neutral: oklch(0.19 0.005 280);
```

**`@theme inline` block:** Register `--color-card-tint-success`, `--color-card-tint-destructive`, `--color-card-tint-neutral`.

**New keyframe + utility (after `animate-shake`):**

```css
@keyframes celebrate-in {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  60% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@utility animate-celebrate-in {
  animation: celebrate-in var(--duration-emphasis) var(--ease-spring) forwards;
}
```

### Step 2: Landing Page — Value Proposition Text

**Red:** Add test to `src/__tests__/app.test.tsx`:

```tsx
it("renders value proposition text on landing page", () => {
  render(<App />);
  expect(screen.getByText(/checks vbr version/i)).toBeInTheDocument();
});
```

**Green:** In `src/App.tsx`, add a `<p>` after the subtitle:

```tsx
<p className="text-muted-foreground/60 mt-3 text-xs tracking-wide">
  Checks VBR version, encryption, SOBR configuration, licensing, and workload
  compatibility
</p>
```

### Step 3: Landing Page — Gradient Background

**Red:** Add test to `src/__tests__/app.test.tsx`:

```tsx
it("applies atmosphere gradient on app shell", () => {
  render(<App />);
  const shell = screen.getByTestId("app-shell");
  expect(shell.className).toMatch(/bg-\[var\(--surface-gradient\)\]/);
});
```

**Green:** In `src/App.tsx`, add a testable shell wrapper and apply gradient with class first:

```tsx
<div data-testid="app-shell" className="flex min-h-screen flex-col bg-[var(--surface-gradient)]">
```

If this class form is not viable in this repo after verification, fallback to inline style while keeping the same test target and behavior across all states (idle, processing, success, error).

### Step 4: Premium Drop Zone

**Red:** Update test in `src/__tests__/file-upload.test.tsx` line 117:

```tsx
// Was: expect(dropZone.className).toMatch(/hover:bg-muted\/50/);
expect(dropZone.className).toMatch(/hover:shadow-md/);
```

**Green:** In `src/components/dashboard/file-upload.tsx`, update default state classes:

- `border-muted-foreground/40` → `border-muted-foreground/25`
- Remove `hover:bg-muted/50`
- Add `bg-card/80 shadow-sm hover:shadow-md backdrop-blur-sm`
- `hover:border-muted-foreground/60` → `hover:border-muted-foreground/50`
- `p-12` → `px-12 py-16`
- `FileJson` icon: `size-14` → `size-16`
- Primary text: `text-lg font-medium` → `text-xl font-semibold`

### Step 5: Stronger Summary Cards

**Red:** Update/add tests in `src/__tests__/dashboard-view.test.tsx` to assert:

- summary cards use `border-b-4` (not `border-b-2`)
- status cards include expected tint classes
- Readiness card glow is present only when all checks pass

In `src/components/dashboard/dashboard-view.tsx`:

- `SUMMARY_CARD` constant: `border-b-2` → `border-b-4`
- VBR Version card: add conditional `bg-card-tint-success` / `bg-card-tint-destructive`
- Total Jobs card: add `bg-card-tint-neutral`
- Add explicit condition: `const allChecksPass = validations.every((v) => v.status === "pass")`
- Readiness card: add conditional `bg-card-tint-success` / `bg-card-tint-destructive`, plus `ring-2 ring-primary/20` when `allChecksPass`

### Step 6: Job Table — Row Tinting

**Red:** Update tests in `src/__tests__/job-table.test.tsx`:

- Line 238: `toHaveClass("bg-destructive/5")` → `toHaveClass("bg-destructive/10")`
- Line 242: `toHaveClass("bg-destructive/5")` → `toHaveClass("bg-destructive/10")`
- Line 247: `not.toHaveClass("bg-destructive/5")` → `not.toHaveClass("bg-destructive/10")`

**Green:** In `src/components/dashboard/job-table.tsx`, update row classes:

```tsx
className={cn(
  "cursor-pointer transition-colors",
  row.original.Encrypted
    ? "hover:bg-muted/30"
    : "bg-destructive/10 hover:bg-destructive/15",
)}
```

### Step 7: Job Table — Search Result Count

**Red:** Add tests to `src/__tests__/job-table.test.tsx`:

```tsx
it("shows result count when search filter is active", () => {
  render(<JobTable jobs={MOCK_JOBS} />);
  const searchInput = screen.getByPlaceholderText(/search jobs/i);
  fireEvent.change(searchInput, { target: { value: "SQL" } });
  expect(screen.getByText(/\d+ of \d+ jobs/i)).toBeInTheDocument();
});

it("does not show result count when search filter is empty", () => {
  render(<JobTable jobs={MOCK_JOBS} />);
  expect(screen.queryByText(/of \d+ jobs/i)).not.toBeInTheDocument();
});
```

**Green:** Wrap search `<Input>` in a flex container with a conditional count:

```tsx
<div className="flex items-center gap-3">
  <Input ... />
  {globalFilter && (
    <span className="text-muted-foreground text-sm tabular-nums">
      {table.getFilteredRowModel().rows.length} of {jobs.length}{" "}
      {jobs.length === 1 ? "job" : "jobs"}
    </span>
  )}
</div>
```

### Step 8: Celebratory Passing Checks Heading

**Red:** Add tests to `src/__tests__/passing-checks-list.test.tsx`:

```tsx
it("uses celebrate-in animation classes on passing checks heading and icon", () => {
  render(<PassingChecksList validations={[passValidation, passValidation2]} />);
  const heading = screen.getByText(/2 checks passed/i);
  expect(heading.className).toMatch(/motion-safe:animate-celebrate-in/);
  const icon = screen.getByTestId("passing-checks").querySelector("svg");
  expect(icon?.className).toMatch(/motion-safe:animate-celebrate-in/);
});
```

Optionally add one cross-component motion-safe assertion in `src/__tests__/reduced-motion.test.tsx` to keep motion coverage centralized.

**Green:** In `src/components/dashboard/passing-checks-list.tsx`, replace heading:

```tsx
<div className="flex items-center gap-2">
  <CheckCircle2
    className="text-primary motion-safe:animate-celebrate-in size-5"
    aria-hidden="true"
  />
  <h3 className="text-primary motion-safe:animate-celebrate-in text-lg font-semibold">
    {passing.length} {passing.length === 1 ? "check" : "checks"} passed
  </h3>
</div>
```

## Verification

1. `npm run test:run` — all tests pass (557+ after new additions)
2. `npm run build` — clean TypeScript compilation
3. `npm run lint` — no ESLint errors
4. Visual smoke test via `npm run dev`:
   - Landing page: subtle green-tinted gradient, frosted drop zone with shadow
   - Dashboard: summary cards with visible colored borders and tinted backgrounds
   - Job table: unencrypted rows clearly distinguishable, search count appears when filtering
   - Passing checks: green heading with icon and spring animation
   - Dark mode (system preference): gradient and tints adapt correctly
