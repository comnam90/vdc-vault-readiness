## [2026-02-09T22:10:00Z] Task 4: Calculator Inputs Component Complete

**Completed**: Created `src/components/dashboard/calculator-inputs.tsx` and tests.

### Key Patterns Applied

1.  **Component Structure**:
    - Used `Card` with `CardHeader`, `CardContent`, `CardFooter` for structured layout.
    - Used `grid-cols-2 sm:grid-cols-3` for responsive layout of 5 items.
    - Used helper functions for consistent formatting of TB, %, Days, GFS.

2.  **Mocking Strategy**:
    - Mocked `buildCalculatorSummary` in tests to isolate component logic from aggregation logic.
    - This allowed testing the component's rendering of various data states (valid, null, empty) without relying on the aggregator's implementation details or complex data setup.

3.  **Accessibility**:
    - Ensured CTA link has `target="_blank"` and `rel="noopener noreferrer"` for security and UX.
    - Used semantic HTML (headings, paragraphs) for data display.

4.  **Integration**:
    - Component accepts `NormalizedDataset` and calls the aggregator internally.
    - This keeps the parent component (`DashboardView` or similar) clean and focused on layout.

### Verification

✅ Tests pass: `npm run test:run src/__tests__/calculator-inputs.test.tsx`
✅ Lint passes: `npm run lint`
✅ Build passes: `npm run build`
