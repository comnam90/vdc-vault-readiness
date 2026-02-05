# Contributing to VDC Vault Readiness Analyzer

Welcome! This guide covers contribution workflows for both **human developers** and **AI agents**. The project uses strict TDD practices with bleeding-edge tooling.

## Quick Reference

| Resource                                           | Purpose                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| [PRD.md](./PRD.md)                                 | Functional requirements (authoritative source) |
| [VDCVAULT-CHEETSHEET.md](./VDCVAULT-CHEETSHEET.md) | Domain knowledge & Vault limitations           |
| [AGENTS.md](./AGENTS.md)                           | Engineering standards & agent protocols        |
| `veeam-healthcheck.example.json`                   | Sample input data (30 jobs, 1863 lines)        |

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- Git configured with your identity

### Setup

```bash
git clone <repo-url>
cd vdc-vault-readiness
npm install
npm run test:run  # Verify setup
npm run dev       # Start dev server
```

### Available Commands

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Vite dev server with HMR            |
| `npm run build`         | TypeScript check + production build |
| `npm run lint`          | ESLint check                        |
| `npm run test`          | Vitest watch mode                   |
| `npm run test:run`      | Single test run                     |
| `npm run test:coverage` | Coverage report                     |
| `npm run preview`       | Preview production build            |

---

## Development Workflow

### 1. Branch Strategy (Gitflow)

| Branch      | Purpose                              |
| ----------- | ------------------------------------ |
| `main`      | Production-ready code                |
| `develop`   | Integration branch                   |
| `feature/*` | New features (`feature/json-parser`) |
| `fix/*`     | Bug fixes (`fix/encryption-check`)   |

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Start bug fix
git checkout -b fix/issue-description
```

### 2. Test-Driven Development (Mandatory)

This project enforces **strict TDD**. No implementation code without a failing test.

#### The Red-Green-Refactor Cycle

1. **Red**: Write a failing test in `src/__tests__/`

   ```bash
   npm run test  # Verify it fails
   ```

2. **Green**: Write _minimum_ code to pass

   ```bash
   npm run test  # Verify it passes
   ```

3. **Refactor**: Apply DRY/SOLID principles without breaking tests

#### Test File Conventions

| Implementation                 | Test File                                |
| ------------------------------ | ---------------------------------------- |
| `src/lib/parser.ts`            | `src/__tests__/parser.test.ts`           |
| `src/components/Dashboard.tsx` | `src/__tests__/Dashboard.test.tsx`       |
| `src/lib/rules/encryption.ts`  | `src/__tests__/rules/encryption.test.ts` |

#### Example Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { zipSection } from "@/lib/parser";

describe("zipSection", () => {
  it("should map headers to row values", () => {
    const input = {
      Headers: ["Name", "Encrypted"],
      Rows: [["Job A", "False"]],
    };

    expect(zipSection(input)).toEqual([{ Name: "Job A", Encrypted: "False" }]);
  });

  it("should return empty array for empty rows", () => {
    const input = { Headers: ["Name"], Rows: [] };
    expect(zipSection(input)).toEqual([]);
  });
});
```

### 3. Commit Strategy (Conventional Commits)

Format: `type(scope): description`

| Type       | Use Case                                |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `test`     | Adding/updating tests                   |
| `refactor` | Code restructuring (no behavior change) |
| `docs`     | Documentation only                      |
| `chore`    | Build, deps, tooling                    |

**Examples:**

```bash
feat(parser): add zipSection utility for JSON normalization
fix(ui): correct padding on mobile dashboard view
test(rules): add coverage for AWS workload detection
refactor(validator): extract version parsing to utility
```

**Commitlint is configured** - commits not matching this format will be rejected.

### 4. Pull Request Process

1. **Ensure all checks pass:**

   ```bash
   npm run lint
   npm run test:run
   npm run build
   ```

2. **PR Title**: Follow conventional commit format
   - `feat(parser): implement zipSection utility`

3. **PR Description**: Include:
   - What changed and why
   - How to test
   - Screenshots for UI changes
   - Link to related issues

4. **Review Requirements:**
   - All CI checks must pass
   - At least one approval required
   - No unresolved conversations

---

## Code Standards

### TypeScript (Strict Mode)

**Forbidden Patterns:**
| Pattern | Why |
|---------|-----|
| `as any` | Defeats type safety |
| `@ts-ignore` | Hides real issues |
| `@ts-expect-error` | Same as above |
| `// eslint-disable` | Fix the lint error instead |
| Empty `catch(e) {}` | Always handle errors |

**Required Patterns:**

```typescript
// Use explicit types for function parameters and returns
function parseVersion(version: string): VersionInfo { ... }

// Use path aliases
import { cn } from '@/lib/utils';        // Good
import { cn } from '../lib/utils';       // Avoid

// Handle errors properly
try {
  parseJSON(data);
} catch (error) {
  console.error('Failed to parse healthcheck:', error);
  throw new ParseError('Invalid JSON format', { cause: error });
}
```

### React Components

- One component per file
- Use functional components with hooks
- Use `cn()` from `@/lib/utils` for class merging
- Prefer composition over prop drilling

```tsx
// Component structure
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "ready" | "warning" | "error";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        status === "ready" && "bg-green-100 text-green-800",
        status === "warning" && "bg-yellow-100 text-yellow-800",
        status === "error" && "bg-red-100 text-red-800",
        className,
      )}
    >
      {status}
    </span>
  );
}
```

### File Organization

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui primitives
│   ├── Dashboard.tsx    # Feature components
│   └── JobTable.tsx
├── lib/                 # Utilities and logic
│   ├── utils.ts         # cn() and shared utils
│   ├── parser.ts        # JSON transformation
│   └── rules/           # Validation rules
│       ├── version.ts
│       ├── encryption.ts
│       └── index.ts
├── types/               # TypeScript interfaces
│   └── healthcheck.ts
└── __tests__/           # Test files mirror src/
    ├── setup.ts
    ├── parser.test.ts
    └── rules/
```

---

## Domain Knowledge

### Healthcheck JSON Format

The input JSON uses a decoupled `Headers`/`Rows` format that must be normalized:

```json
// Raw format
{
  "Headers": ["Name", "Encrypted"],
  "Rows": [["Job A", "False"], ["Job B", "True"]]
}

// After zipSection()
[
  { "Name": "Job A", "Encrypted": "False" },
  { "Name": "Job B", "Encrypted": "True" }
]
```

### Validation Rules (PRD Section 4)

| Rule              | Source Section         | Constraint                                   |
| ----------------- | ---------------------- | -------------------------------------------- |
| VBR Version       | `backupServer.Version` | Must be 12.1.2+                              |
| Global Encryption | `securitySummary`      | Both backup file AND config backup encrypted |
| Job Encryption    | `jobInfo[].Encrypted`  | All jobs must be "True"                      |
| AWS Workloads     | `jobInfo[].JobType`    | Block AWS backup types                       |
| Agent Gateway     | `jobInfo[].JobType`    | Warn on agent jobs (need gateway)            |
| License Edition   | `Licenses.Edition`     | Info warning for Community edition           |

### Critical Vault Limitations

These are deal-breakers - understand them before contributing to validation logic:

- **No AWS Backup Support**: Veeam Backup for AWS cannot target Vault directly
- **Agents Need Gateway**: Cannot write directly to object storage
- **Encryption Required**: All data must be encrypted at source
- **30-Day Immutability**: Cannot be disabled, affects storage costs

See [VDCVAULT-CHEETSHEET.md](./VDCVAULT-CHEETSHEET.md) for complete details.

---

## Architecture Constraints

### Client-Side Only

This is a **static SPA** hosted on Cloudflare Pages. No server-side code.

**Forbidden:**

```typescript
import fs from "fs"; // No Node.js filesystem
import path from "path"; // No Node.js path
import axios from "axios"; // No HTTP client (no backend)
process.env.SECRET; // No Node.js process
```

**Allowed:**

```typescript
// FileReader API for local file parsing
const reader = new FileReader();
reader.onload = (e) => parseJSON(e.target?.result as string);
reader.readAsText(file);

// Client-side only
localStorage.setItem("theme", "dark");
```

### Version Constraints (Locked)

These versions are non-negotiable per PRD. Do not upgrade without explicit approval.

| Package               | Version | Notes               |
| --------------------- | ------- | ------------------- |
| Vite                  | 7.3.1   | Build tool          |
| TypeScript            | 5.9.3   | Language            |
| React                 | 19.x    | UI framework        |
| Tailwind CSS          | 4.1.18  | Styling (v4 syntax) |
| shadcn/ui             | 3.8.3   | Component library   |
| @tanstack/react-table | 8.21.3  | Data grid           |
| recharts              | 3.7.0   | Charts              |

---

## For AI Agents

### Required Reading Before Contributing

1. **Always read first:**
   - `AGENTS.md` - Full engineering protocols
   - `PRD.md` - Functional requirements
   - This file - Contribution workflow

2. **Check before implementation:**
   - Existing patterns in similar files
   - Test coverage requirements
   - Type definitions in `src/types/`

### Verification Protocol (Before Claiming "Done")

No task is complete without:

- [ ] `lsp_diagnostics` clean on changed files
- [ ] `npm run test:run` passes
- [ ] `npm run build` succeeds
- [ ] New code has corresponding tests

### API Verification (Bleeding-Edge Stack)

This project uses versions newer than most training data. **Never implement from memory.**

| Technology | Verification Method                               |
| ---------- | ------------------------------------------------- |
| React 19   | Query Context7 or official docs                   |
| Tailwind 4 | Query Context7 (v4 uses different syntax)         |
| Vite 7     | Query Context7 for config patterns                |
| shadcn/ui  | Check existing components in `src/components/ui/` |

### Skill Loading Requirements

Before starting any task, evaluate which skills apply:

| Task Type       | Load Skills                                       |
| --------------- | ------------------------------------------------- |
| New feature     | `brainstorming`, `test-driven-development`        |
| Bug fix         | `systematic-debugging`, `test-driven-development` |
| UI work         | `frontend-ui-ux`, `web-design-guidelines`         |
| Completing work | `verification-before-completion`                  |
| Git operations  | `git-master`                                      |

### Authority Hierarchy (Conflict Resolution)

When instructions conflict, follow this precedence:

1. **PRD.md** - Functional requirements (highest authority)
2. **VDCVAULT-CHEETSHEET.md** - Domain constraints
3. **package.json** - Locked versions
4. **Official docs (Context7)** - API correctness
5. **AGENTS.md** - Conventions

### Anti-Patterns (Will Be Rejected)

| Pattern                      | Reason                        |
| ---------------------------- | ----------------------------- |
| Implementation without tests | Violates TDD requirement      |
| Type suppression (`as any`)  | Defeats TypeScript benefits   |
| Deleting failing tests       | Tests exist for a reason      |
| Shotgun debugging            | Fix root causes, not symptoms |
| Memory-based API usage       | Verify against current docs   |

---

## Getting Help

- **Architecture questions**: Consult Oracle agent or open a discussion
- **Domain questions**: Reference VDCVAULT-CHEETSHEET.md
- **Stack questions**: Use Context7 for current API documentation
- **Stuck on tests**: Check existing tests for patterns

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
