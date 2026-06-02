# src/\_\_tests\_\_ — Test Suite

1267 tests across 57 test files. Vitest + React Testing Library + jsdom. `fake-indexeddb` for persistence tests. Run `npm run test:coverage` for current coverage.

## STRUCTURE

```
__tests__/
# Support
├── setup.ts                          # jest-dom matchers + fake-indexeddb/auto
├── fixtures.ts                       # Shared test data: MOCK_DATA, PASS/FAIL/WARNING_RESULT, etc.
├── fixtures/
│   └── vse-sample-response.json      # Sample Veeam VmAgent API response for sizing tests
# Pipeline / logic
├── parser.test.ts                    # zipSection() edge cases
├── normalizer.test.ts                # Error accumulation, missing fields, type coercion
├── normalizer-sobr.test.ts           # SOBR/CapExtent/ArchExtent normalization
├── validator.test.ts                 # Core validation rules (incl. retention-period, active-full)
├── validator-sobr.test.ts            # 4 SOBR validation rules
├── agent-classifier.test.ts          # classifyAgentJobType() pattern + legacy strings
├── pipeline.test.ts                  # End-to-end analyzeHealthcheck() with real sample data
├── version-compare.test.ts           # Semver comparison edge cases
├── constants.test.ts                 # MINIMUM_* constants + PIPELINE_STEPS
├── validation-selectors.test.ts      # Blocker/passing filter helpers
├── enrich-jobs.test.ts               # enrichJobs(): join matching, missing sessions, empty arrays
├── format-utils.test.ts              # formatSize, formatPercent, formatDuration, formatTB, formatRatio, formatGFS
├── relative-time.test.ts             # formatRelativeTime() relative/calendar strings
├── delay.test.ts                     # tick() with AbortSignal + fake timers
├── domain-types.test.ts              # Type contract verification for Safe* types
# Sizing / calculator / charts
├── calculator-aggregator.test.ts     # Sizing aggregation: source TB, change rates, GFS, retention
├── sizing-derivation.test.ts         # deriveSizing(): GFS/immutability/composition buckets
├── sizing-buffer.test.ts             # bufferFactor + applyBufferToSizing/Series
├── growth-projector.test.ts          # generateGrowthSeries() (mocks veeam-api)
├── chart-selectors.test.ts           # groupByJobType, bucketChangeRates, repoImmutabilityCounts, groupByRepo
├── repo-aggregator.test.ts           # aggregateRepoStatsMap() rollups
├── veeam-api.test.ts                 # buildVmAgentRequest + callVmAgentApi (stubs global fetch)
# Persistence
├── indexed-db.test.ts                # IndexedDB CRUD + FIFO cap (fake-indexeddb + __resetForTests)
├── recent-scans-fifo.test.ts         # selectIdsToEvict() pure eviction policy
# Hooks
├── use-analysis.test.ts              # State machine transitions, race condition guard
├── use-calculator-api.test.ts        # Sizing API flow (mocks veeam-api + growth-projector)
├── use-recent-scans.test.ts          # Recent-scans hook over IndexedDB
├── use-settings.test.ts              # Settings hook + localStorage persistence
# Components — shell / overview
├── app.test.tsx                      # Top-level state rendering (idle/processing/success/error)
├── experimental-banner.test.tsx      # Banner rendering + accessibility attributes
├── site-header.test.tsx              # Header: reset + settings trigger
├── site-footer.test.tsx              # Version/commit footer
├── settings-dialog.test.tsx          # Settings form, cloud/cap/buffer controls
├── file-upload.test.tsx              # Drop zone, keyboard, drag states, recent-scans list
├── dashboard-view.test.tsx           # Summary cards, 4 tabs, version display
├── checklist-loader.test.tsx         # Step progression, progress bar, icons
├── blockers-list.test.tsx            # Severity ordering, affected items, truncation
├── notes-panel.test.tsx              # Info-level advisory notes, stagger offset
├── passing-checks-list.test.tsx      # Passing validation display with stagger
├── success-celebration.test.tsx      # All-pass celebration, stagger animation
# Components — jobs
├── job-table.test.tsx                # Search, sort, pagination, encryption badges, row click → sheet
├── job-detail-sheet.test.tsx         # Sheet rendering, sections, null session handling
├── jobs-charts.test.tsx              # Job-type + change-rate charts
# Components — sizing
├── calculator-inputs.test.tsx        # Summary, overrides, consent gating, API trigger
├── calculator-consent-dialog.test.tsx # Consent gate before API call
├── sizing-results.test.tsx           # Composition of hero/proportion/growth from API response
├── sizing-hero-card.test.tsx         # Headline totals, upgrade comparison
├── sizing-proportion-bar.test.tsx    # Stacked composition bar + tooltips
├── growth-chart.test.tsx             # Multi-year projection chart
# Components — repositories
├── repositories-tab.test.tsx         # Repo/SOBR table + charts + row click → sheet
├── repositories-table.test.tsx       # Generic sortable/paginated table wrapper
├── repo-detail-sheet.test.tsx        # Per-repo detail sheet
├── repo-size-chart.test.tsx          # Source vs on-disk bar chart
├── repo-immutability-chart.test.tsx  # Immutable vs non-immutable pie chart
├── sobr-detail-sheet.test.tsx        # SOBR + extent detail sheet
├── detail-sheet-helpers.test.tsx     # PropertyRow, SectionHeading, FreeSpaceValue
# Misc
└── button.test.tsx                   # shadcn Button variant rendering
```

## WHERE TO LOOK

| Need                   | File                                          | Notes                                                 |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Shared test data       | fixtures.ts                                   | MOCK_DATA, ALL_PASS_VALIDATIONS, MIXED_VALIDATIONS    |
| Sample API response    | fixtures/vse-sample-response.json             | Imported by sizing/derivation tests                   |
| Hook mocking pattern   | app.test.tsx, use-calculator-api.test.ts      | vi.mock + module-level `let` for per-test overrides   |
| `fetch` mocking        | veeam-api.test.ts                             | `vi.stubGlobal("fetch", vi.fn())` + mockResolvedValue |
| IndexedDB testing      | indexed-db.test.ts                            | fake-indexeddb `IDBFactory` + `__resetForTests()`     |
| localStorage testing   | use-settings.test.ts                          | Settings persistence under STORAGE_KEY                |
| Component test pattern | Any .test.tsx                                 | render → query → assert with Testing Library          |
| Factory helpers        | calculator-aggregator.test.ts                 | makeJob(), makeSession() for unique test data         |
| Bulk data generator    | job-table.test.tsx                            | createManyJobs(n) for table pagination tests          |
| EnrichedJob fixtures   | job-table.test.tsx, job-detail-sheet.test.tsx | EnrichedJob factory with sessionData variants         |
| SOBR normalizer tests  | normalizer-sobr.test.ts                       | SafeSobr, SafeCapExtent, SafeArchExtent fixtures      |
| SOBR validator tests   | validator-sobr.test.ts                        | SOBR rule tests with findRule() helper                |

## CONVENTIONS

- **Naming**: `[module].test.ts` for logic, `[component].test.tsx` for UI
- **Fixtures**: Import from `./fixtures.ts`. Only define locally when test needs unique data. JSON fixtures live in `fixtures/`
- **Mocking hooks**: `vi.mock("@/hooks/...")` at top, module-level `let` vars reassigned per test via `beforeEach`
- **Mocking fetch**: `vi.stubGlobal("fetch", vi.fn())`, then `vi.mocked(fetch).mockResolvedValueOnce(...)`; assert request shape via `fetch.mock.calls`
- **Mocking IndexedDB**: `setup.ts` loads `fake-indexeddb/auto`; tests reset state with the module's `__resetForTests()` and a fresh `IDBFactory`
- **Mocking lib boundaries**: Hook/component tests `vi.mock` the async lib modules they depend on (`veeam-api`, `growth-projector`, `indexed-db`) rather than hitting real network/DB
- **Typed mocks**: `vi.mocked(fn)` for type-safe mock access
- **Helpers**: `createMockFile(content, name)`; `findRule(results, ruleId)`; `createManyJobs(n)`; `makeJob(overrides)` / `makeSession(overrides)`
- **Fake timers**: `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for tick/delay tests; always `vi.useRealTimers()` in afterEach
- **Selectors**: Prefer `getByRole`, `getByText`, `getByTestId` (in that order). `data-testid` for structural queries
- **Keyboard a11y**: Test Enter/Space on `role="button"` elements
- **Animation classes**: Assert `motion-safe:` prefix exists; never assert raw `animate-*` without prefix
- **Float comparison**: Use `toBeCloseTo(expected, decimals)` for calculator/sizing aggregation tests
- **Charts**: recharts renders an SVG in jsdom with zero dimensions — assert on data/labels/legend text, not pixel geometry
- **Real sample data**: `pipeline.test.ts` imports `veeam-healthcheck.example.json` for E2E validation

## ANTI-PATTERNS

| Pattern                        | Reason                                         |
| ------------------------------ | ---------------------------------------------- |
| Re-declaring MOCK_DATA locally | Import from fixtures.ts                        |
| `screen.getByClassName()`      | Not a Testing Library API; use roles/text      |
| Real fetch / real IndexedDB    | Mock fetch; use fake-indexeddb for persistence |
| Testing implementation details | Test behavior, not internal state              |
| Skipping reset in beforeEach   | Clear mocks; reset fake-indexeddb state        |
| Snapshot tests                 | Not used in this project; assert behavior      |
