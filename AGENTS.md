# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 4547a24
**Branch:** feature/phase3-motion-interaction

## OVERVIEW

Client-side SPA validating Veeam VBR environments against VDC Vault requirements. Parses Healthcheck JSON locally, runs pre-flight checks. React 19 + Vite 7.3 + TypeScript 5.9 + Tailwind 4.1 + shadcn 3.8.

## STATUS: MVP COMPLETE + MOTION SYSTEM

Full pipeline operational: JSON upload → normalize → validate → dashboard. 150+ tests across 19 test files. All 6 PRD validation rules implemented. Phase 3 adds motion/animation system with `prefers-reduced-motion` support, checklist loader, and success celebration.

## STRUCTURE

```
./
├── PRD.md                        # Tech spec (START HERE)
├── VDCVAULT-CHEETSHEET.md        # Domain knowledge, Vault limitations
├── ARCHITECTURE.md               # Data flow, component hierarchy, decisions
├── DESIGN-SYSTEM.md              # Motion tokens, animation philosophy (41KB)
├── CONTRIBUTING.md               # Branch/commit/PR/testing conventions (15KB)
├── MIGRATION.md                  # Branch strategy migration notes
├── veeam-healthcheck.example.json # Sample input (1863 lines, 30 jobs)
├── package.json                  # Dependencies locked per PRD
├── vite.config.ts                # React + Tailwind + Vitest config, @ alias
├── tsconfig.json                 # References app/node configs, @/* alias
├── eslint.config.js              # TS + React Hooks + React Refresh (flat config)
├── components.json               # shadcn/ui config (new-york style)
├── .prettierrc                   # Tailwind class sorting plugin
├── commitlint.config.js          # Conventional Commits enforcement
├── .husky/                       # pre-commit (lint-staged) + commit-msg hooks
├── .github/workflows/
│   ├── ci.yml                    # Lint + test on push/PR (Node 20)
│   └── release.yml               # Release Please auto-versioning
└── src/
    ├── main.tsx                  # React 19 entry (StrictMode)
    ├── App.tsx                   # State-machine UI (idle/processing/success/error)
    ├── index.css                 # Tailwind 4 + motion tokens + custom @utility animations
    ├── types/
    │   ├── healthcheck.ts        # Raw JSON shape types (HealthcheckRoot)
    │   ├── domain.ts             # NormalizedDataset, SafeJob, PipelineStep
    │   └── validation.ts         # ValidationResult, ValidationStatus
    ├── lib/                      # → see src/lib/AGENTS.md
    ├── hooks/
    │   └── use-analysis.ts       # State machine hook w/ race condition guard + step progression
    ├── components/
    │   ├── ui/                   # 9 shadcn primitives (card, button, badge, etc.)
    │   └── dashboard/            # → see src/components/dashboard/AGENTS.md
    └── __tests__/                # → see src/__tests__/AGENTS.md
```

## WHERE TO LOOK

| Need              | Location                       | Notes                                                                                                      |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Tech stack        | PRD.md §2                      | Strict versions: Vite 7.3.1, TS 5.9.3, Tailwind 4.1.18, shadcn 3.8.3                                       |
| Validation rules  | PRD.md §4                      | 6 rules: VBR version, encryption, job audit, AWS, agents, license                                          |
| UI spec           | PRD.md §5                      | Dashboard + Job Explorer table                                                                             |
| Vault limitations | VDCVAULT-CHEETSHEET.md         | Red flags, edition diffs, workload matrix                                                                  |
| Architecture      | ARCHITECTURE.md                | Data flow, component hierarchy, design decisions                                                           |
| Motion/animation  | DESIGN-SYSTEM.md               | Tokens (§4), keyframes, `motion-safe:` prefix, `prefers-reduced-motion`                                    |
| Contributing      | CONTRIBUTING.md                | Branch, commit, PR, testing, code standards (authoritative for process)                                    |
| Input format      | veeam-healthcheck.example.json | Headers/Rows → needs `zipSection()`                                                                        |
| Domain types      | src/types/                     | healthcheck.ts (raw), domain.ts (normalized), validation.ts (results)                                      |
| Data pipeline     | src/lib/AGENTS.md              | Parser, normalizer, validator, pipeline orchestrator                                                       |
| State management  | src/hooks/use-analysis.ts      | State machine hook with race condition guard + visual step progression                                     |
| Dashboard UI      | src/components/dashboard/      | 6 components: file-upload, dashboard-view, blockers-list, job-table, success-celebration, checklist-loader |
| Path aliases      | tsconfig.json                  | `@/*` → `./src/*`                                                                                          |
| Theme/motion      | src/index.css                  | oklch colors, Veeam brand palette, motion duration/easing tokens, custom keyframes                         |
| Test patterns     | src/**tests**/AGENTS.md        | Fixtures, helpers, mocking, a11y testing conventions                                                       |

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

**Sample data:** 30 jobs, VBR 13.0.1.1071, mixed encryption, repos: LinuxHardened/WinLocal/VeeamVault/AmazonS3/DDBoost

## CONVENTIONS

- **Imports**: `@/lib/...` not `../lib/...`; relative imports only within same directory
- **Styling**: `cn()` from `@/lib/utils`; Prettier auto-sorts Tailwind classes
- **Motion**: `motion-safe:` prefix on all animations; respect `prefers-reduced-motion`
- **Accessibility**: `role="button"` + `tabIndex={0}` + keyboard handlers on interactive zones; `aria-hidden` on icons with `sr-only` text
- **Components**: One component per file. shadcn ESLint exception for `src/components/ui/`
- **State**: `useAnalysis()` hook manages idle → processing → success/error with `requestIdRef` race guard
- **Pipeline**: `analyzeHealthcheck()` runs synchronously; visual step progression is presentational only (artificial `tick()` delays)
- **Hosting**: Cloudflare Pages (static, client-side only)
- **Git hooks**: Husky pre-commit runs lint-staged (Prettier); commit-msg runs commitlint

## ANTI-PATTERNS (FORBIDDEN)

| Pattern                       | Reason                                                   |
| ----------------------------- | -------------------------------------------------------- |
| `fs`, `path`, `process`       | No Node.js runtime                                       |
| `axios`, external `fetch`     | No backend calls                                         |
| `as any`, `@ts-ignore`        | Strict TypeScript                                        |
| `@ts-expect-error`            | Same as @ts-ignore                                       |
| `// eslint-disable`           | Fix the lint error                                       |
| Empty `catch(e) {}`           | Handle errors                                            |
| Delete failing tests          | Fix them                                                 |
| Relative imports across dirs  | Use `@/` aliases                                         |
| Multiple components per file  | SRP — one component/file                                 |
| Upgrading locked dependencies | Explicit approval required                               |
| Implementing from memory      | Verify via Context7/web for React 19, Vite 7, Tailwind 4 |

## CRITICAL CONSTRAINTS

| Rule                  | Detail                                        |
| --------------------- | --------------------------------------------- |
| **VBR Version**       | Must be 12.1.2+ (parse "12.1.0.123" format)   |
| **Encryption**        | Jobs AND config backup must be encrypted      |
| **AWS Backup**        | Cannot target Vault directly (blocker)        |
| **Agents**            | Need Gateway Server, no direct object storage |
| **Community Edition** | SOBR limitations warning                      |
| **Immutability**      | 30-day cannot be disabled                     |

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

### 2. Git Strategy (GitHub Flow)

- **main**: Production-ready, always deployable
- **feature/**: New work, branched from `main`
- **fix/**: Bug fixes, branched from `main`

**Rules:** PRs target `main`. Conventional Commits required (Release Please). Delete branches after merge.

### 3. Commit Strategy (Conventional Commits)

Format: `type(scope): description` — enforced by commitlint hook.

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`. `feat:` → minor release, `fix:` → patch.

### 4. Code Quality (SOLID, DRY, KISS)

- **SRP:** One component per file. One utility per logic rule.
- **DRY:** If logic repeats twice, extract to `src/lib/`.
- **YAGNI:** No "future proofing" beyond current PRD.

## CI/CD

- **ci.yml**: Lint + test on push to `main` and all PRs (Node 20, npm cache)
- **release.yml**: Release Please on push to `main` (auto-versions from Conventional Commits)
- **Deploy**: Cloudflare Pages (not yet configured — `dist/` output)

## AGENT CAPABILITIES (MANDATORY PROTOCOLS)

### 1. Skill Loading (ALWAYS check before implementation)

| Task Type       | Required Skills                                   |
| --------------- | ------------------------------------------------- |
| New feature     | `brainstorming`, `test-driven-development`        |
| Bug fix         | `systematic-debugging`, `test-driven-development` |
| UI work         | `frontend-ui-ux`, `web-design-guidelines`         |
| Completing work | `verification-before-completion`                  |
| Git operations  | `git-master`                                      |

### 2. External Verification (NEVER trust training data)

| Technology   | Verify Via                                                   | Trigger              |
| ------------ | ------------------------------------------------------------ | -------------------- |
| React 19     | `context7_query-docs(libraryId="/facebook/react")`           | Any React API usage  |
| Vite 7.x     | `context7_query-docs(libraryId="/vitejs/vite")`              | Vite config, plugins |
| Tailwind 4.x | `context7_query-docs(libraryId="/tailwindlabs/tailwindcss")` | New utility classes  |
| shadcn/ui    | `context7_resolve-library-id` → `context7_query-docs`        | Component patterns   |
| Vitest       | `context7_query-docs(libraryId="/vitest-dev/vitest")`        | Test setup, matchers |

### 3. Authority Hierarchy (Conflict Resolution)

1. **PRD.md** — Functional requirements (authoritative)
2. **VDCVAULT-CHEETSHEET.md** — Domain constraints & red flags
3. **package.json** — Locked versions (non-negotiable)
4. **Official Docs (via Context7)** — API correctness
5. **This file** — Conventions & quick reference

### 4. Verification Checkpoint (Before "Done")

- [ ] `lsp_diagnostics` clean on changed files
- [ ] `npm run test:run` passes (or note pre-existing failures)
- [ ] `npm run build` succeeds
- [ ] Context7 or web search confirms API usage is current

## NEXT STEPS

1. ~~MVP pipeline + UI~~ ✅ Done (steps 1-18)
2. Polish: loading states, error recovery UX, mobile responsiveness
3. Cloudflare Pages deployment configuration
