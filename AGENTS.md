# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-05
**Commit:** 5d858d9
**Branch:** main

## OVERVIEW

Client-side SPA to validate Veeam VBR environments against VDC Vault requirements. Parses Healthcheck JSON locally, runs pre-flight checks.

## STATUS: GREENFIELD

No code exists yet. PRD.md defines complete technical spec.

## STRUCTURE

```
./
├── PRD.md                        # Full technical spec (START HERE)
├── VDCVAULT-CHEETSHEET.md        # Domain knowledge, Vault limitations
├── veeam-healthcheck.example.json # Sample input data structure
├── README.md                     # Empty placeholder
└── LICENSE                       # MIT
```

## WHERE TO LOOK

| Need | File | Notes |
|------|------|-------|
| Tech stack | PRD.md §2 | Strict version locks: Vite 7.3.1, TS 5.9.3, Tailwind 4.1.18, shadcn 3.8.3 |
| Validation rules | PRD.md §4 | 6 rules: VBR version, encryption, job audit, AWS, agents, license |
| UI spec | PRD.md §5 | Dashboard + Job Explorer table |
| Vault limitations | VDCVAULT-CHEETSHEET.md | Red flags, edition diffs, workload matrix |
| Input format | veeam-healthcheck.example.json | Headers/Rows structure needs `zipSection()` |

## CONVENTIONS (from PRD)

- **Data transform**: Create `zipSection(section)` to normalize Headers/Rows → objects
- **Hosting**: Cloudflare Pages (static, client-side only)
- **No backend**: All parsing/validation in browser
- **No Node.js runtime:** Do not use `fs`, `path`, or `process` modules.
- **No External Calls:** Do not install `axios` or `fetch` to external endpoints.

## CRITICAL CONSTRAINTS

| Rule | Detail |
|------|--------|
| **VBR Version** | Must be 12.1.2+ (parse "12.1.0.123" format) |
| **Encryption** | Jobs AND config backup must be encrypted for Vault |
| **AWS Backup** | Cannot target Vault directly (blocker) |
| **Agents** | Need Gateway Server, cannot write direct to object storage |
| **Community Edition** | SOBR limitations warning |

## VAULT RED FLAGS (from Cheatsheet)

- No AWS Backup support (Veeam Backup for AWS)
- Agents require Gateway Server or Cloud Connect
- Azure Backup has restore gaps until v13.1
- No seeding via Azure Data Box
- Unencrypted data cannot use Move/Copy Backup

## INPUT DATA FORMAT

JSON uses decoupled format:
```json
{
  "Headers": ["Name", "Encrypted"],
  "Rows": [["Job A", "False"]]
}
```
Must normalize to: `[{ "Name": "Job A", "Encrypted": "False" }]`

Key sections: `backupServer`, `securitySummary`, `jobInfo`, `Licenses`

## COMMANDS

```bash
# After scaffolding (not yet created):
npm install
npm run dev
npm run build
```

## NOTES

- Sample JSON has 30 jobs, mixed encryption states
- VBR version in sample: 13.0.1.1071 (passes 12.1.2+ check)
- Security flags in sample: all True except MFA
- Contains jobs targeting "Veeam.Vault.AWS" repository (test case for Rule 4)

## ENGINEERING STANDARDS (NON-NEGOTIABLE)

### 1. The Development Loop (TDD)
We follow a strict **Red-Green-Refactor** cycle.
1. **Red:** Write a failing test case in `src/__tests__`. Verify it fails.
2. **Green:** Write the *minimum* code in `src/` to pass the test.
3. **Refactor:** Apply DRY/SOLID principles.

**Constraint:** Do not generate implementation code without a corresponding failing test.

### 2. Git Strategy (Gitflow)
- **main**: Production-ready code.
- **develop**: Integration branch.
- **feature/**: All new work. Example: `feature/json-parser`
- **fix/**: Bug fixes. Example: `fix/encryption-check`

### 3. Commit Strategy (Conventional Commits)
Format: `type(scope): description`
- `feat(parser): add zipSection utility`
- `fix(ui): resolve padding on mobile dashboard`
- `test(core): add coverage for aws workload rule`

### 4. Code Quality (SOLID, DRY, KISS)
- **Single Responsibility:** One component per file. One utility function per logic rule.
- **DRY:** If logic repeats twice, abstract it to `src/lib/utils.ts`.
- **KISS/YAGNI:** Do not implement "future proofing" fields that are not in the current PRD.
