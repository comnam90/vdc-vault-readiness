# src/components/dashboard — Dashboard UI

29 components composing the upload + results view. Motion system with stagger animations and `prefers-reduced-motion` support. Four tabs: overview, jobs, sizing, repositories.

## STRUCTURE

```
dashboard/
# Shell / layout
├── site-header.tsx           # App header: title, reset, opens SettingsDialog. Rendered by dashboard-view
├── site-footer.tsx           # Footer: app version + commit (__APP_VERSION__ / __APP_COMMIT__) + link
├── experimental-banner.tsx   # Unconditional Alert at top of App layout (FlaskConical icon)
├── settings-dialog.tsx       # Global settings (target cloud, GFS/retention caps, buffer). 483 lines
├── file-upload.tsx           # Drop zone (drag/click/keyboard) + recent-scans list via useRecentScans
├── dashboard-view.tsx        # Main layout: SiteHeader, 3 summary cards, 4 tabs. Memoizes enrichJobs(). 342 lines
├── checklist-loader.tsx      # Processing state: step checklist with progress bar (reads PIPELINE_STEPS)
# Overview tab
├── blockers-list.tsx         # Fail/warning alerts with severity ordering + stagger entrance
├── success-celebration.tsx   # All-pass state: ring animation + stagger fade-in
├── passing-checks-list.tsx   # Passing validations with stagger + check icons
├── notes-panel.tsx           # info/skipped validations as advisory notes (getNoteValidations; staggered after blockers)
# Jobs tab
├── job-table.tsx             # TanStack Table: search, sort, paginate EnrichedJob[]. Row click → sheet
├── job-detail-sheet.tsx      # Right-side Sheet: storage, protection, config, session sections
├── jobs-charts.tsx           # Bar charts: source TB by job type, change-rate distribution
# Sizing tab
├── calculator-inputs.tsx     # Sizing tab entry: summary, override inputs, API trigger → SizingResults. 830 lines
├── calculator-consent-dialog.tsx # Privacy-consent gate before any /api/veeam-proxy call
├── sizing-results.tsx        # Composes hero card + proportion bar + growth chart from API response
├── sizing-hero-card.tsx      # Headline total storage, edition upgrade comparison, savings
├── sizing-baselines-card.tsx # Baseline daily/weekly/monthly/yearly TB rows
├── sizing-metric-row.tsx     # Reusable label/value/annotation row (shared by sizing cards)
├── sizing-proportion-bar.tsx # Stacked bar of GFS + immutability + buffer composition (with tooltips)
├── growth-chart.tsx          # Multi-year projected-storage bar chart (recharts). 339 lines
# Repositories tab
├── repositories-tab.tsx      # Repo + SOBR table, size/immutability charts, row click → sheet. 407 lines
├── repositories-table.tsx    # Generic sortable/paginated table wrapper for repos & SOBRs
├── repo-detail-sheet.tsx     # Right-side Sheet: per-repo detail
├── repo-size-chart.tsx       # Bar chart: source vs on-disk TB per repo
├── repo-immutability-chart.tsx # Pie chart: immutable vs non-immutable repo counts
├── sobr-detail-sheet.tsx     # Right-side Sheet: SOBR + capacity/archive extent detail
# Shared
└── detail-sheet-helpers.tsx  # PropertyRow, SectionHeading, FreeSpaceValue — used by all detail sheets
```

## WHERE TO LOOK

| Need                    | File                                         | Notes                                                                          |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| Add validation display  | blockers-list.tsx                            | SEVERITY map drives icon/color/badge per status                                |
| Advisory/info notes     | notes-panel.tsx                              | Renders info/skipped validations (getNoteValidations); staggers after blockers |
| Modify summary cards    | dashboard-view.tsx                           | 3 cards: VBR version, total jobs, readiness                                    |
| App header / reset      | site-header.tsx                              | Hosts reset + SettingsDialog trigger; rendered inside dashboard-view           |
| Global settings UI      | settings-dialog.tsx                          | Target cloud, GFS/retention caps, buffer; persisted via useSettings            |
| Change table columns    | job-table.tsx                                | TanStack columnHelper definitions at top; uses EnrichedJob type                |
| Job detail drill-down   | job-detail-sheet.tsx                         | Controlled Sheet: Storage, Protection, Config, Session                         |
| Job charts              | jobs-charts.tsx                              | Uses chart-selectors (groupByJobType, bucketChangeRates)                       |
| Adjust processing UX    | checklist-loader.tsx                         | Reads PIPELINE_STEPS from @/lib/constants                                      |
| All-pass celebration    | success-celebration.tsx                      | Shown when no blockers; has "View Job Details" CTA                             |
| Show passing checks     | passing-checks-list.tsx                      | Uses getPassingValidations() from validation-selectors                         |
| Sizing tab / overrides  | calculator-inputs.tsx                        | Summary + override inputs; gates API behind calculator-consent-dialog          |
| Sizing API consent      | calculator-consent-dialog.tsx                | Must be accepted before any outbound /api/veeam-proxy call                     |
| Sizing results display  | sizing-results.tsx                           | Composes hero/proportion/growth from VmAgentResponse                           |
| Growth projection chart | growth-chart.tsx                             | Multi-year bar chart; data from growth-projector                               |
| Repositories tab        | repositories-tab.tsx                         | Table + charts + detail sheets; uses repo-aggregator + chart-selectors         |
| Repo/SOBR detail        | repo-detail-sheet.tsx, sobr-detail-sheet.tsx | Controlled Sheets; share detail-sheet-helpers                                  |
| Detail sheet primitives | detail-sheet-helpers.tsx                     | PropertyRow, SectionHeading, FreeSpaceValue (shared across all sheets)         |
| Recent scans list       | file-upload.tsx                              | useRecentScans() hook surfaces IndexedDB-persisted prior uploads               |
| App status banner       | experimental-banner.tsx                      | Unconditional Alert at top of App layout; lucide FlaskConical icon             |

## CONVENTIONS

- **Motion classes**: Always `motion-safe:` prefix. Never bare `animate-*`
- **Stagger pattern**: `fill-mode-backwards` + inline `animationDelay` style or Tailwind `delay-*` utilities
- **Custom animations**: `animate-attention-pulse` (blockers), `animate-success-ring` (celebration icon), `animate-drag-pulse` (drag-over), `animate-shake` (error) — defined in `src/index.css` as `@utility` rules
- **Icons**: lucide-react only. `aria-hidden="true"` on all icons, paired with `sr-only` text when semantic
- **Charts**: recharts only, wrapped in `ResponsiveContainer`. Aggregation/selection lives in `@/lib/chart-selectors` and `@/lib/repo-aggregator`, not in the component
- **shadcn/ui first**: Check the shadcn/ui registry for a suitable component before creating a custom one
- **Severity config**: `blockers-list.tsx` uses a SEVERITY lookup object for fail/warning styling — extend here for new statuses
- **Affected items**: Truncated at `MAX_VISIBLE_ITEMS` (5) with "+ N more" overflow
- **Sheet pattern**: All detail sheets (job/repo/sobr) are fully controlled (open/onOpenChange from parent) and compose primitives from `detail-sheet-helpers.tsx`
- **Color coding**: ChangeRate: red >50%, amber 10-50%, default <10%. SuccessRate: red <80%, amber 80-95%, green >95%. Encryption: blue=yes, red=no
- **Formatters**: Detail sheets, tables, and sizing cards use shared formatters from `@/lib/format-utils`
- **Outbound calls**: Only the sizing tab makes one, only after `calculator-consent-dialog` is accepted, only via `@/lib/veeam-api` → `/api/veeam-proxy`
- **Relative imports**: Within dashboard/ only. Cross-directory uses `@/` alias
- **Tabs**: `dashboard-view.tsx` manages tab state with shadcn Tabs component (overview / jobs / sizing / repositories)

## ANTI-PATTERNS

| Pattern                          | Reason                                               |
| -------------------------------- | ---------------------------------------------------- |
| Bare `animate-*` without prefix  | Violates `prefers-reduced-motion` support            |
| Inline keyframes                 | Use custom `@utility` animations in index.css        |
| Chart aggregation in component   | Put it in chart-selectors / repo-aggregator          |
| Outbound fetch outside veeam-api | All sizing calls go through veeam-api, consent-gated |
| Non-lucide icons                 | Consistency — all icons from lucide-react            |
| Uncontrolled detail sheets       | Must receive open/onOpenChange from parent           |
