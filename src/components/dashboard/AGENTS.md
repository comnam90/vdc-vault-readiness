# src/components/dashboard — Dashboard UI

8 components composing the results view. Motion system with stagger animations and `prefers-reduced-motion` support. Three tabs: overview, jobs, sizing.

## STRUCTURE

```
dashboard/
├── file-upload.tsx          # Drop zone with drag/click/keyboard input + error shake
├── dashboard-view.tsx       # Main layout: header, summary cards, tabs (overview/jobs/sizing). 199 lines, 18 imports
├── blockers-list.tsx        # Fail/warning alerts with severity ordering + stagger entrance
├── job-table.tsx            # TanStack Table: search, sort, paginate SafeJob[]. 214 lines
├── success-celebration.tsx  # All-pass state: ring animation + stagger fade-in
├── checklist-loader.tsx     # Processing state: step checklist with progress bar
├── passing-checks-list.tsx  # Passing validations with stagger animation + check icons
└── calculator-inputs.tsx    # Vault sizing tab: displays aggregated source TB, change rate, retention, GFS
```

## WHERE TO LOOK

| Need                   | File                    | Notes                                                                         |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| Add validation display | blockers-list.tsx       | SEVERITY map drives icon/color/badge per status                               |
| Modify summary cards   | dashboard-view.tsx      | 3 cards: VBR version, total jobs, readiness                                   |
| Change table columns   | job-table.tsx           | TanStack columnHelper definitions at top of file                              |
| Adjust processing UX   | checklist-loader.tsx    | Reads PIPELINE_STEPS from @/lib/constants                                     |
| All-pass celebration   | success-celebration.tsx | Shown when no blockers; has "View Job Details" CTA                            |
| Show passing checks    | passing-checks-list.tsx | Uses getPassingValidations() from validation-selectors                        |
| Vault sizing display   | calculator-inputs.tsx   | Uses buildCalculatorSummary() from calculator-aggregator                      |
| Tab management         | dashboard-view.tsx      | 3 tabs: overview (blockers OR celebration), jobs (table), sizing (calculator) |

## CONVENTIONS

- **Motion classes**: Always `motion-safe:` prefix. Never bare `animate-*`
- **Stagger pattern**: `fill-mode-backwards` + inline `animationDelay` style or Tailwind `delay-*` utilities
- **Custom animations**: `animate-attention-pulse` (blockers), `animate-success-ring` (celebration icon), `animate-drag-pulse` (drag-over), `animate-shake` (error) — defined in `src/index.css` as `@utility` rules
- **Icons**: lucide-react only. `aria-hidden="true"` on all icons, paired with `sr-only` text when semantic
- **shadcn/ui first**: Check the shadcn/ui registry for a suitable component before creating a custom one
- **Severity config**: `blockers-list.tsx` uses a SEVERITY lookup object for fail/warning styling — extend here for new statuses
- **Affected items**: Truncated at `MAX_VISIBLE_ITEMS` (5) with "+ N more" overflow
- **Relative imports**: Within dashboard/ only. Cross-directory uses `@/` alias
- **Tabs**: `dashboard-view.tsx` manages tab state with shadcn Tabs component

## ANTI-PATTERNS

| Pattern                          | Reason                                        |
| -------------------------------- | --------------------------------------------- |
| Bare `animate-*` without prefix  | Violates `prefers-reduced-motion` support     |
| Inline keyframes                 | Use custom `@utility` animations in index.css |
| Direct prop drilling for onReset | Passed from App → DashboardView only          |
| Non-lucide icons                 | Consistency — all icons from lucide-react     |
