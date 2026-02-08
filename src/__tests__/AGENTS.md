# src/\_\_tests\_\_ — Test Suite

150+ tests across 19 test files. Vitest + React Testing Library + jsdom.

## STRUCTURE

```
__tests__/
├── setup.ts                    # Registers @testing-library/jest-dom matchers
├── fixtures.ts                 # Shared test data: MOCK_DATA, PASS/FAIL/WARNING_RESULT, etc.
├── parser.test.ts              # zipSection() edge cases
├── normalizer.test.ts          # Error accumulation, missing fields, type coercion
├── validator.test.ts           # All 6 validation rules
├── pipeline.test.ts            # End-to-end analyzeHealthcheck()
├── version-compare.test.ts     # Semver comparison edge cases
├── delay.test.ts               # tick() with AbortSignal + fake timers
├── use-analysis.test.ts        # State machine transitions, race condition guard
├── app.test.tsx                # Top-level state rendering (idle/processing/success/error)
├── file-upload.test.tsx        # Drop zone, click, keyboard, drag states, error display
├── dashboard-view.test.tsx     # Summary cards, tabs, version display
├── blockers-list.test.tsx      # Severity ordering, affected items, truncation
├── job-table.test.tsx          # Search, sort, pagination, encryption badges
├── checklist-loader.test.tsx   # Step progression, progress bar, icons
├── success-celebration.test.tsx # All-pass celebration, stagger animation
├── reduced-motion.test.tsx     # motion-safe: class verification across components
├── button.test.tsx             # shadcn Button variant rendering
└── smoke.test.ts               # Import sanity checks
```

## WHERE TO LOOK

| Need                   | File                    | Notes                                               |
| ---------------------- | ----------------------- | --------------------------------------------------- |
| Shared test data       | fixtures.ts             | MOCK_DATA, ALL_PASS_VALIDATIONS, MIXED_VALIDATIONS  |
| Hook mocking pattern   | app.test.tsx            | vi.mock + module-level `let` for per-test overrides |
| Component test pattern | Any .test.tsx           | render → query → assert with Testing Library        |
| Motion/a11y tests      | reduced-motion.test.tsx | Verifies `motion-safe:` prefix on animation classes |

## CONVENTIONS

- **Naming**: `[module].test.ts` for logic, `[component].test.tsx` for UI
- **Fixtures**: Import from `./fixtures.ts`. Only define locally when test needs unique data
- **Mocking hooks**: `vi.mock("@/hooks/use-analysis")` at top, module-level `let` vars reassigned in each test via `beforeEach`
- **Typed mocks**: `vi.mocked(fn)` for type-safe mock access
- **Helpers**: `createMockFile(content, name)` for File objects; `findRule(results, ruleId)` for validation lookup; `createManyJobs(n)` for bulk data
- **Fake timers**: `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for tick/delay tests; always `vi.useRealTimers()` in afterEach
- **Selectors**: Prefer `getByRole`, `getByText`, `getByTestId` (in that order). `data-testid` used for structural queries (e.g., `drop-zone`, `checklist-loader`, `blockers-list`)
- **Keyboard a11y**: Test Enter/Space on `role="button"` elements
- **Animation classes**: Assert `motion-safe:` prefix exists on animation utility classes; never assert raw `animate-*` without prefix

## ANTI-PATTERNS

| Pattern                        | Reason                                    |
| ------------------------------ | ----------------------------------------- |
| Re-declaring MOCK_DATA locally | Import from fixtures.ts                   |
| `screen.getByClassName()`      | Not a Testing Library API; use roles/text |
| Testing implementation details | Test behavior, not internal state         |
| Skipping `vi.clearAllMocks()`  | Always clear in beforeEach                |
