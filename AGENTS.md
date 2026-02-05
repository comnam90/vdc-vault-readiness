# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-05
**Commit:** f7949f4
**Branch:** main

## OVERVIEW

Client-side SPA validating Veeam VBR environments against VDC Vault requirements. Parses Healthcheck JSON locally, runs pre-flight checks. React 19 + Vite 7.3 + TypeScript 5.9 + Tailwind 4.1 + shadcn 3.8.

## STATUS: SCAFFOLDED

Vite scaffold complete. App.tsx is default template (needs replacement). Empty directories ready: `src/components/`, `src/__tests__/`.

## STRUCTURE

```
./
├── PRD.md                        # Tech spec (START HERE)
├── VDCVAULT-CHEETSHEET.md        # Domain knowledge, Vault limitations
├── veeam-healthcheck.example.json # Sample input (1863 lines, 30 jobs)
├── package.json                  # Dependencies locked per PRD
├── vite.config.ts                # React + Tailwind plugins, @ alias
├── tsconfig.json                 # References app/node configs
├── eslint.config.js              # TS + React Hooks + React Refresh
├── components.json               # shadcn/ui config (new-york style)
└── src/
    ├── main.tsx                  # React 19 entry (StrictMode)
    ├── App.tsx                   # ⚠️ Default template, replace
    ├── index.css                 # Tailwind + shadcn theme vars
    ├── lib/utils.ts              # cn() class merger
    ├── components/               # Empty, ready
    └── __tests__/                # Empty, TDD ready
```

## WHERE TO LOOK

| Need              | Location                       | Notes                                                                |
| ----------------- | ------------------------------ | -------------------------------------------------------------------- |
| Tech stack        | PRD.md §2                      | Strict versions: Vite 7.3.1, TS 5.9.3, Tailwind 4.1.18, shadcn 3.8.3 |
| Validation rules  | PRD.md §4                      | 6 rules: VBR version, encryption, job audit, AWS, agents, license    |
| UI spec           | PRD.md §5                      | Dashboard + Job Explorer table                                       |
| Vault limitations | VDCVAULT-CHEETSHEET.md         | Red flags, edition diffs, workload matrix                            |
| Input format      | veeam-healthcheck.example.json | Headers/Rows → needs `zipSection()`                                  |
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
- **Hosting**: Cloudflare Pages (static, client-side only)
- **Imports**: Use `@/lib/...` not `../lib/...`
- **Styling**: `cn()` from `@/lib/utils` for class merging

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
```

**Missing:** Test runner not yet installed. Add vitest when implementing TDD.

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

## NEXT STEPS

1. Install vitest + @testing-library/react
2. Create first failing test: `src/__tests__/parser.test.ts`
3. Implement `zipSection()` in `src/lib/parser.ts`
4. Replace App.tsx with Dashboard layout
5. Build validation rules per PRD §4
