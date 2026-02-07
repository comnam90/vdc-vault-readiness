# Architecture

## Overview

VDC Vault Readiness is a **client-side SPA** that validates Veeam VBR environments against VDC Vault requirements. Users upload a Veeam Healthcheck JSON export, and the app parses it locally, runs six validation rules, and renders a dashboard with results.

**No backend. No network calls. All processing happens in the browser.**

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI | React | 19 |
| Styling | Tailwind CSS (oklch) | 4.1 |
| Components | shadcn/ui + Radix UI | 3.8 |
| Tables | TanStack React Table | 8 |
| Icons | Lucide React | 0.563 |
| Types | TypeScript (strict) | 5.9 |
| Build | Vite | 7.3 |
| Tests | Vitest + Testing Library | 4.0 |
| Hosting | Cloudflare Pages (static) | — |

## Directory Structure

```
src/
├── main.tsx                          # React 19 entry (StrictMode)
├── App.tsx                           # Root state machine (idle/processing/success/error)
├── index.css                         # Tailwind 4 + shadcn theme vars
│
├── types/
│   ├── healthcheck.ts                # Raw JSON input types (HealthcheckRoot, Section)
│   ├── domain.ts                     # Normalized types (SafeJob, NormalizedDataset)
│   └── validation.ts                 # ValidationResult, ValidationStatus
│
├── lib/
│   ├── parser.ts                     # zipSection(): Headers/Rows → object[]
│   ├── normalizer.ts                 # Raw strings → typed SafeJob/SafeBackupServer/etc
│   ├── validator.ts                  # 6 validation rules → ValidationResult[]
│   ├── version-compare.ts            # Semantic version comparison (X.Y.Z.build)
│   ├── pipeline.ts                   # Orchestrates parser → normalizer → validator
│   └── utils.ts                      # cn() class merger (clsx + tailwind-merge)
│
├── hooks/
│   └── use-analysis.ts               # FileReader → JSON.parse → pipeline → state
│
├── components/
│   ├── ui/                           # shadcn/ui primitives (card, button, badge, etc)
│   └── dashboard/
│       ├── file-upload.tsx            # Drag-and-drop upload zone
│       ├── dashboard-view.tsx         # Main dashboard container (cards, tabs)
│       ├── blockers-list.tsx          # Fail/warning alert list
│       └── job-table.tsx              # Searchable, sortable, paginated job grid
│
└── __tests__/                        # All test files (mirrors src/ structure)
```

## Data Flow

```
  File Drop/Select
        │
        ▼
  ┌──────────────┐
  │  useAnalysis  │  FileReader → JSON.parse → analyzeHealthcheck()
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   pipeline    │  Orchestrator
  └──────┬───────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  ┌────┐┌────┐┌────┐
  │zip ││zip ││zip │  zipSection() per section
  │Sect││Sect││Sect│  Headers/Rows → Record[]
  └─┬──┘└─┬──┘└─┬──┘
    └────┬─┘─────┘
         ▼
  ┌──────────────┐
  │  normalizer   │  String → typed (boolean, trimmed strings)
  │               │  Builds DataError[] for invalid fields
  └──────┬───────┘
         ▼
  ┌──────────────┐    6 rules:
  │  validator    │    1. VBR version ≥ 12.1.2
  │               │    2. Global encryption enabled
  │               │    3. All jobs encrypted
  │               │    4. No AWS Backup jobs
  │               │    5. Agent gateway configured
  │               │    6. License edition check
  └──────┬───────┘
         ▼
  { data: NormalizedDataset, validations: ValidationResult[] }
         │
         ▼
  ┌──────────────┐
  │ DashboardView │  Summary cards + Tabs (Overview / Job Details)
  └──────────────┘
```

### Input Format

Veeam Healthcheck JSON uses a decoupled Headers/Rows format:

```json
{
  "Sections": {
    "backupServer": {
      "Headers": ["Name", "Version"],
      "Rows": [["VBR-01", "13.0.1.1071"]]
    }
  },
  "Licenses": [{ "Edition": "Enterprise Plus", "Status": "Active" }]
}
```

`zipSection()` normalizes this to `[{ Name: "VBR-01", Version: "13.0.1.1071" }]`.

### Output Types

```typescript
// After normalization (all fields validated & typed)
NormalizedDataset {
  backupServer: SafeBackupServer[]     // { Version, Name }
  securitySummary: SafeSecuritySummary[] // { BackupFileEncryptionEnabled, ConfigBackupEncryptionEnabled }
  jobInfo: SafeJob[]                   // { JobName, JobType, Encrypted: boolean, RepoName }
  Licenses: SafeLicense[]             // { Edition, Status }
  dataErrors: DataError[]             // Invalid rows tracked, not silently dropped
}

// After validation (6 rules applied)
ValidationResult {
  ruleId: string
  title: string
  status: "pass" | "fail" | "warning" | "info"
  message: string
  affectedItems: string[]
}
```

## Component Hierarchy

```
App (state machine)
├── [idle]       → FileUpload
├── [processing] → Loader spinner
├── [error]      → Alert + "Try Again" button
└── [success]    → DashboardView
                    ├── Header (title + Badge + "Upload New" button)
                    ├── Summary Cards (VBR Version | Total Jobs | Readiness)
                    └── Tabs
                        ├── Overview → BlockersList (fail/warning alerts)
                        └── Job Details → JobTable (search + sort + pagination)
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Client-side only | Healthcheck JSON is sensitive; no data leaves the browser |
| Defensive normalizer | Every field validated individually; partial failures produce DataError[] instead of crashing |
| Pure validation functions | Each rule is independent, testable, and composable |
| TanStack Table (headless) | Sorting, filtering, pagination without external calls |
| shadcn/ui | Unstyled Radix primitives with Tailwind; fully customizable, no vendor lock-in |
| oklch color space | Modern color model from Tailwind 4; perceptually uniform |

## Testing Strategy

Tests follow TDD (Red-Green-Refactor). All tests live in `src/__tests__/`.

| Layer | Files | Coverage |
|-------|-------|----------|
| Parser | `parser.test.ts` | zipSection edge cases |
| Normalizer | `normalizer.test.ts` | Field validation, DataError generation |
| Version | `version-compare.test.ts` | Semantic version parsing & comparison |
| Validator | `validator.test.ts` | All 6 rules × pass/fail/warning/edge cases |
| Pipeline | `pipeline.test.ts` | End-to-end: raw JSON → AnalysisResult |
| Hook | `use-analysis.test.ts` | State transitions, error handling |
| Components | `file-upload.test.tsx`, `job-table.test.tsx`, `blockers-list.test.tsx`, `dashboard-view.test.tsx`, `app.test.tsx` | Rendering, interaction, integration |

Run: `npm run test:run` (single pass) or `npm run test` (watch mode).

## Commands

```bash
npm run dev           # Vite dev server (HMR)
npm run build         # tsc -b && vite build → dist/
npm run test:run      # All tests, single pass
npm run test:coverage # Tests with coverage report
npm run lint          # ESLint
```
