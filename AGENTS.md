# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-05
**Commit:** f7949f4
**Branch:** main

## OVERVIEW

Client-side SPA validating Veeam VBR environments against VDC Vault requirements. Parses Healthcheck JSON locally, runs pre-flight checks. React 19 + Vite 7.3 + TypeScript 5.9 + Tailwind 4.1 + shadcn 3.8.

## STATUS: MVP COMPLETE

Full end-to-end pipeline operational: JSON upload → normalize → validate → dashboard. 152 tests across 12 test files. All 6 PRD validation rules implemented. Accessibility reviewed (keyboard nav, screen reader labels).

## STRUCTURE

```
./
├── PRD.md                        # Tech spec (START HERE)
├── VDCVAULT-CHEETSHEET.md        # Domain knowledge, Vault limitations
├── ARCHITECTURE.md               # Data flow, component hierarchy, decisions
├── veeam-healthcheck.example.json # Sample input (1863 lines, 30 jobs)
├── package.json                  # Dependencies locked per PRD
├── vite.config.ts                # React + Tailwind + Vitest config, @ alias
├── tsconfig.json                 # References app/node configs
├── eslint.config.js              # TS + React Hooks + React Refresh
├── components.json               # shadcn/ui config (new-york style)
└── src/
    ├── main.tsx                  # React 19 entry (StrictMode)
    ├── App.tsx                   # State-machine UI (idle/processing/success/error)
    ├── index.css                 # Tailwind + shadcn theme vars
    ├── types/
    │   ├── healthcheck.ts        # Raw JSON shape types
    │   ├── domain.ts             # NormalizedDataset, SafeJob
    │   └── validation.ts         # ValidationResult, RuleId
    ├── lib/
    │   ├── utils.ts              # cn() class merger
    │   ├── constants.ts          # Shared constants (MINIMUM_VBR_VERSION)
    │   ├── parser.ts             # zipSection() Headers/Rows normalizer
    │   ├── normalizer.ts         # Raw JSON → NormalizedDataset
    │   ├── validator.ts          # 6 validation rules per PRD §4
    │   ├── version-compare.ts    # Semantic version comparison
    │   └── pipeline.ts           # analyzeHealthcheck() orchestrator
    ├── hooks/
    │   └── use-analysis.ts       # State machine hook (idle/processing/success/error)
    ├── components/
    │   ├── ui/                   # 9 shadcn primitives (card, button, badge, etc.)
    │   └── dashboard/
    │       ├── file-upload.tsx    # Drag-drop zone (a11y: keyboard accessible)
    │       ├── dashboard-view.tsx # Summary cards + tabs (overview/jobs)
    │       ├── blockers-list.tsx  # Fail/warning alerts sorted by severity
    │       └── job-table.tsx      # TanStack table with search, sort, pagination
    └── __tests__/                # 12 test files, 152 tests
        ├── setup.ts              # jest-dom matchers
        ├── smoke.test.ts         # Setup verification
        ├── parser.test.ts        # zipSection tests
        ├── normalizer.test.ts    # Normalization pipeline tests
        ├── validator.test.ts     # Validation rule tests
        ├── version-compare.test.ts # Version parsing tests
        ├── pipeline.test.ts      # End-to-end pipeline tests
        ├── use-analysis.test.ts  # Hook state machine + race condition tests
        ├── app.test.tsx          # App component integration tests
        ├── file-upload.test.tsx  # Upload + drag-drop + keyboard a11y tests
        ├── dashboard-view.test.tsx # Dashboard rendering + summary cards tests
        ├── blockers-list.test.tsx # Blocker display + severity sorting tests
        └── job-table.test.tsx    # Table rendering + search + pagination + a11y tests
```

## WHERE TO LOOK

| Need              | Location                       | Notes                                                                |
| ----------------- | ------------------------------ | -------------------------------------------------------------------- |
| Tech stack        | PRD.md §2                      | Strict versions: Vite 7.3.1, TS 5.9.3, Tailwind 4.1.18, shadcn 3.8.3 |
| Validation rules  | PRD.md §4                      | 6 rules: VBR version, encryption, job audit, AWS, agents, license    |
| UI spec           | PRD.md §5                      | Dashboard + Job Explorer table                                       |
| Vault limitations | VDCVAULT-CHEETSHEET.md         | Red flags, edition diffs, workload matrix                            |
| Architecture      | ARCHITECTURE.md                | Data flow, component hierarchy, design decisions                     |
| Input format      | veeam-healthcheck.example.json | Headers/Rows → needs `zipSection()`                                  |
| Domain types      | src/types/                     | healthcheck.ts (raw), domain.ts (normalized), validation.ts (results)|
| Data pipeline     | src/lib/pipeline.ts            | Orchestrates normalize → validate flow                               |
| Validation impl   | src/lib/validator.ts           | All 6 rules, imports MINIMUM_VBR_VERSION from constants              |
| State management  | src/hooks/use-analysis.ts      | State machine hook with race condition guard                         |
| Dashboard UI      | src/components/dashboard/      | 4 components: file-upload, dashboard-view, blockers-list, job-table  |
| Path aliases      | tsconfig.json                  | `@/*` → `./src/*`                                                    |
| Theme vars        | src/index.css                  | oklch colors, radius tokens                                          |

## INPUT DATA FORMAT

JSON uses decoupled format:

```json
{
  "Headers": ["Name", "Encrypted"],
  "Rows": [["Job A", "False"]]
}
```

Must normalize to: `[{ "Name": "Job A", "Encrypted": "False" }]`

**Key sections:** `backupServer`, `securitySummary`, `jobInfo`, `Licenses`

**Sample data characteristics:**

- 30 jobs total (mixed encryption states)
- VBR version: 13.0.1.1071 (passes 12.1.2+ check)
- Security flags: all True except MFA
- Includes: Backup, Replica, Agent, File Backup, Tape, SureBackup jobs
- Repository types: LinuxHardened, WinLocal, VeeamVault, AmazonS3, DDBoost

## CONVENTIONS

- **Data transform**: `zipSection(section)` normalizes Headers/Rows → objects
- **Pipeline**: `analyzeHealthcheck()` in `pipeline.ts` orchestrates normalize → validate
- **State hook**: `useAnalysis()` manages idle/processing/success/error with race condition guard
- **Shared constants**: `src/lib/constants.ts` for values used across modules (e.g., `MINIMUM_VBR_VERSION`)
- **Hosting**: Cloudflare Pages (static, client-side only)
- **Imports**: Use `@/lib/...` not `../lib/...`; relative imports only within same directory
- **Styling**: `cn()` from `@/lib/utils` for class merging
- **Accessibility**: Drop-zones use `role="button"` + `tabIndex={0}` + keyboard handlers; icons use `aria-hidden` with `sr-only` text labels

## ANTI-PATTERNS (FORBIDDEN)

| Pattern                   | Reason             |
| ------------------------- | ------------------ |
| `fs`, `path`, `process`   | No Node.js runtime |
| `axios`, external `fetch` | No backend calls   |
| `as any`, `@ts-ignore`    | Strict TypeScript  |
| Empty `catch(e) {}`       | Handle errors      |
| Delete failing tests      | Fix them           |

## CRITICAL CONSTRAINTS

| Rule                  | Detail                                        |
| --------------------- | --------------------------------------------- |
| **VBR Version**       | Must be 12.1.2+ (parse "12.1.0.123" format)   |
| **Encryption**        | Jobs AND config backup must be encrypted      |
| **AWS Backup**        | Cannot target Vault directly (blocker)        |
| **Agents**            | Need Gateway Server, no direct object storage |
| **Community Edition** | SOBR limitations warning                      |

## VAULT RED FLAGS

- No AWS Backup support (Veeam Backup for AWS)
- Agents require Gateway Server or Cloud Connect
- Azure Backup has restore gaps until v13.1
- No seeding via Azure Data Box
- Unencrypted data cannot use Move/Copy Backup

## COMMANDS

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # Preview production build
npm run test         # Vitest watch mode
npm run test:run     # Single test run
npm run test:coverage # With coverage report
```

## ENGINEERING STANDARDS (NON-NEGOTIABLE)

### 1. Development Loop (TDD)

Strict **Red-Green-Refactor** cycle:

1. **Red:** Write failing test in `src/__tests__`. Verify it fails.
2. **Green:** Write _minimum_ code to pass.
3. **Refactor:** Apply DRY/SOLID.

**Constraint:** No implementation code without corresponding failing test.

### 2. Git Strategy (Gitflow)

- **main**: Production-ready
- **develop**: Integration branch
- **feature/**: New work (`feature/json-parser`)
- **fix/**: Bug fixes (`fix/encryption-check`)

### 3. Commit Strategy (Conventional Commits)

Format: `type(scope): description`

- `feat(parser): add zipSection utility`
- `fix(ui): resolve padding on mobile dashboard`
- `test(core): add coverage for aws workload rule`

### 4. Code Quality (SOLID, DRY, KISS)

- **SRP:** One component per file. One utility per logic rule.
- **DRY:** If logic repeats twice, extract to `src/lib/`.
- **YAGNI:** No "future proofing" beyond current PRD.

## AGENT CAPABILITIES (MANDATORY PROTOCOLS)

### 1. Skill Loading (ALWAYS check before implementation)

Before starting ANY non-trivial task, agents MUST evaluate applicable skills:

| Task Type       | Required Skills                                   |
| --------------- | ------------------------------------------------- |
| New feature     | `brainstorming`, `test-driven-development`        |
| Bug fix         | `systematic-debugging`, `test-driven-development` |
| UI work         | `frontend-ui-ux`, `web-design-guidelines`         |
| Completing work | `verification-before-completion`                  |
| Git operations  | `git-master`                                      |

**Protocol:** Use `/skill [skill-name]` or include in `delegate_task(load_skills=[...])` calls.

### 2. External Verification (NEVER trust training data)

This project uses **bleeding-edge versions**. Training data is stale.

| Technology   | Verify Via                                                   | Trigger              |
| ------------ | ------------------------------------------------------------ | -------------------- |
| React 19     | `context7_query-docs(libraryId="/facebook/react")`           | Any React API usage  |
| Vite 7.x     | `context7_query-docs(libraryId="/vitejs/vite")`              | Vite config, plugins |
| Tailwind 4.x | `context7_query-docs(libraryId="/tailwindlabs/tailwindcss")` | New utility classes  |
| shadcn/ui    | `context7_resolve-library-id` → `context7_query-docs`        | Component patterns   |
| Vitest       | `context7_query-docs(libraryId="/vitest-dev/vitest")`        | Test setup, matchers |

**Fallback:** If Context7 lacks coverage, use `websearch_web_search_exa` or `google_search`.

**ANTI-PATTERN:** Implementing React 19, Tailwind 4, or Vite 7 patterns from memory → **BLOCKED**.

### 3. Authority Hierarchy (Conflict Resolution)

When instructions conflict, follow this precedence:

1. **PRD.md** — Functional requirements (authoritative)
2. **VDCVAULT-CHEETSHEET.md** — Domain constraints & red flags
3. **package.json** — Locked versions (non-negotiable)
4. **Official Docs (via Context7)** — API correctness
5. **This file** — Conventions & quick reference

### 4. Verification Checkpoint (Before "Done")

No task is complete without:

- [ ] `lsp_diagnostics` clean on changed files
- [ ] `npm run test:run` passes (or note pre-existing failures)
- [ ] `npm run build` succeeds
- [ ] Context7 or web search confirms API usage is current

## NEXT STEPS

1. ~~Install vitest + @testing-library/react~~ ✅ Done
2. ~~Create first failing test: `src/__tests__/parser.test.ts`~~ ✅ Done
3. ~~Implement `zipSection()` in `src/lib/parser.ts`~~ ✅ Done
4. ~~Build types: `healthcheck.ts`, `domain.ts`, `validation.ts`~~ ✅ Done
5. ~~Build normalizer: raw JSON → `NormalizedDataset`~~ ✅ Done
6. ~~Build validator: 6 rules per PRD §4~~ ✅ Done
7. ~~Build pipeline: `analyzeHealthcheck()` orchestrator~~ ✅ Done
8. ~~Install shadcn components (card, button, badge, table, alert, input, scroll-area, separator, tabs)~~ ✅ Done
9. ~~Create `useAnalysis` hook with state machine~~ ✅ Done
10. ~~Create FileUpload component with drag-and-drop~~ ✅ Done
11. ~~Replace App.tsx with state-based rendering~~ ✅ Done
12. ~~Build DashboardView with summary cards + tabs~~ ✅ Done
13. ~~Build JobTable with search, sort, pagination~~ ✅ Done
14. ~~Build BlockersList with severity sorting~~ ✅ Done
15. ~~Fix race condition guard in useAnalysis~~ ✅ Done (PR review)
16. ~~Add JSON shape guard before pipeline~~ ✅ Done (PR review)
17. ~~DRY/YAGNI refactor (shared constants, error helpers)~~ ✅ Done
18. ~~Accessibility fixes (keyboard nav, screen reader labels)~~ ✅ Done (PR review)
19. Merge PR to develop
20. Polish: loading states, error recovery UX, mobile responsiveness
21. Cloudflare Pages deployment configuration
