# src/\_\_tests\_\_ — Test Suite

555 tests across 28 test files. Vitest + React Testing Library + jsdom. Coverage: 97% statements, 95% branches.

## STRUCTURE

```
__tests__/
├── setup.ts                      # Registers @testing-library/jest-dom matchers
├── fixtures.ts                   # Shared test data: MOCK_DATA, PASS/FAIL/WARNING_RESULT, etc.
├── parser.test.ts                # zipSection() edge cases
├── normalizer.test.ts            # Error accumulation, missing fields, type coercion
├── normalizer-sobr.test.ts       # SOBR/CapExtent/ArchExtent normalization (615 lines)
├── validator.test.ts             # Original 7 validation rules (incl. retention-period)
├── validator-sobr.test.ts        # 4 SOBR validation rules: cap-tier-encryption, sobr-immutability, archive-tier-edition, capacity-tier-residency (1107 lines)
├── pipeline.test.ts              # End-to-end analyzeHealthcheck() with real sample data
├── version-compare.test.ts       # Semver comparison edge cases
├── delay.test.ts                 # tick() with AbortSignal + fake timers
├── constants.test.ts             # MINIMUM_VBR_VERSION, MINIMUM_RETENTION_DAYS, MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS, PIPELINE_STEPS
├── validation-selectors.test.ts  # Blocker/passing filter helpers
├── calculator-aggregator.test.ts # Sizing aggregation: source TB, change rates, GFS, retention
├── enrich-jobs.test.ts           # enrichJobs(): join matching, missing sessions, empty arrays (10 tests)
├── format-utils.test.ts          # formatSize, formatPercent, formatDuration, formatTB, formatCompressionRatio (28 tests)
├── domain-types.test.ts          # Type contract verification for SafeJob, SafeJobSession, SafeSobr, SafeCapExtent, SafeArchExtent
├── use-analysis.test.ts          # State machine transitions, race condition guard
├── app.test.tsx                  # Top-level state rendering (idle/processing/success/error)
├── experimental-banner.test.tsx  # ExperimentalBanner rendering, accessibility attributes
├── file-upload.test.tsx          # Drop zone, click, keyboard, drag states, error display
├── dashboard-view.test.tsx       # Summary cards, tabs, version display
├── blockers-list.test.tsx        # Severity ordering, affected items, truncation
├── job-table.test.tsx            # Search, sort, pagination, encryption badges, row click → sheet (562 lines)
├── job-detail-sheet.test.tsx     # Sheet rendering, 4 sections, conditional fields, null session handling (425 lines)
├── checklist-loader.test.tsx     # Step progression, progress bar, icons
├── success-celebration.test.tsx  # All-pass celebration, stagger animation
├── passing-checks-list.test.tsx  # Passing validation display with stagger
├── calculator-inputs.test.tsx    # Calculator summary display with aggregated data
├── reduced-motion.test.tsx       # motion-safe: class verification across components
├── button.test.tsx               # shadcn Button variant rendering
└── smoke.test.ts                 # Import sanity checks
```

## WHERE TO LOOK

| Need                   | File                                          | Notes                                               |
| ---------------------- | --------------------------------------------- | --------------------------------------------------- |
| Shared test data       | fixtures.ts                                   | MOCK_DATA, ALL_PASS_VALIDATIONS, MIXED_VALIDATIONS  |
| Hook mocking pattern   | app.test.tsx                                  | vi.mock + module-level `let` for per-test overrides |
| Component test pattern | Any .test.tsx                                 | render → query → assert with Testing Library        |
| Motion/a11y tests      | reduced-motion.test.tsx                       | Verifies `motion-safe:` prefix on animation classes |
| Factory helpers        | calculator-aggregator.test.ts                 | makeJob(), makeSession() for unique test data       |
| Bulk data generator    | job-table.test.tsx                            | createManyJobs(n) for table pagination tests        |
| EnrichedJob fixtures   | job-table.test.tsx, job-detail-sheet.test.tsx | EnrichedJob factory with sessionData variants       |
| SOBR normalizer tests  | normalizer-sobr.test.ts                       | SafeSobr, SafeCapExtent, SafeArchExtent fixtures    |
| SOBR validator tests   | validator-sobr.test.ts                        | 4 SOBR rule tests with findRule() helper            |

## CONVENTIONS

- **Naming**: `[module].test.ts` for logic, `[component].test.tsx` for UI
- **Fixtures**: Import from `./fixtures.ts`. Only define locally when test needs unique data
- **Mocking hooks**: `vi.mock("@/hooks/use-analysis")` at top, module-level `let` vars reassigned in each test via `beforeEach`
- **Typed mocks**: `vi.mocked(fn)` for type-safe mock access
- **Helpers**: `createMockFile(content, name)` for File objects; `findRule(results, ruleId)` for validation lookup; `createManyJobs(n)` for bulk data; `makeJob(overrides)` / `makeSession(overrides)` for factory patterns
- **Fake timers**: `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for tick/delay tests; always `vi.useRealTimers()` in afterEach
- **Selectors**: Prefer `getByRole`, `getByText`, `getByTestId` (in that order). `data-testid` used for structural queries (e.g., `drop-zone`, `checklist-loader`, `blockers-list`)
- **Keyboard a11y**: Test Enter/Space on `role="button"` elements
- **Animation classes**: Assert `motion-safe:` prefix exists on animation utility classes; never assert raw `animate-*` without prefix
- **Float comparison**: Use `toBeCloseTo(expected, decimals)` for calculator aggregation tests
- **Real sample data**: `pipeline.test.ts` imports `veeam-healthcheck.example.json` for E2E validation

## ANTI-PATTERNS

| Pattern                        | Reason                                    |
| ------------------------------ | ----------------------------------------- |
| Re-declaring MOCK_DATA locally | Import from fixtures.ts                   |
| `screen.getByClassName()`      | Not a Testing Library API; use roles/text |
| Testing implementation details | Test behavior, not internal state         |
| Skipping `vi.clearAllMocks()`  | Always clear in beforeEach                |
| Snapshot tests                 | Not used in this project; assert behavior |
