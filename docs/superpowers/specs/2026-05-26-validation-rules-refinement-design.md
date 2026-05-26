# Validation Rules Refinement — Design

**Date:** 2026-05-26
**Status:** Approved (pending user review of this spec)
**Scope:** Refine three MVP-era validation rules whose semantics were imprecise. Add a `skipped` validation status and a dashboard "Notes" panel to support the new rule outputs and surface existing `info` results that are silently dropped today.

## Background

The MVP shipped 11 validation rules in `src/lib/validator.ts`. Three were generated from generic statements and have drifted from how VDC Vault actually behaves:

1. **`license-edition`** flags Community/Free as if it were a problem. Veeam documents Vault as supported on Community Edition; the current message ("ensure you are aware of SOBR limitations") is misleading because Community Edition does not include SOBR at all — it has no SOBR to limit.
2. **`global-encryption`** has a misleading name. It conflates two distinct security-summary flags (`BackupFileEncryptionEnabled` and `ConfigBackupEncryptionEnabled`). The first is already covered by the per-job `job-encryption` rule. What this rule should be checking, exclusively, is whether the VBR configuration backup file is encrypted.
3. **`agent-workload`** treats every job whose `JobType` contains the substring "agent" as a single category needing a Gateway Server. In reality, agent jobs fall into three categories with different Vault compatibility:
   - **Managed Agent Jobs** (`Agent Backup`, `EpAgentBackup`) — can target Vault directly. No Gateway required.
   - **Managed Agent Policies** (`EpAgentPolicy`, `VmbApiPolicyTempJob`) — can target Vault only via a Gateway Server.
   - **Standalone Agents** (`Unmanaged Agent`) — cannot target Vault directly. Must use a Backup Copy Job.

During brainstorming, the matrix in `VDCVAULT-CHEETSHEET.md` was found to contradict the categorisation above (it claimed managed jobs need a Gateway and that managed policies cannot target Vault at all). The product owner authoritatively stated the matrix was stale. The cheatsheet update was originally flagged as out-of-scope but was ultimately folded into this PR — see Changes Overview below.

## Changes Overview

| Area                                         | Change                                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/validation.ts`                    | Add `"skipped"` to `ValidationStatus` union.                                                                                                                                                                                      |
| `src/lib/validation-selectors.ts`            | Add `getNoteValidations()` returning `info` + `skipped` results.                                                                                                                                                                  |
| `src/lib/validator.ts`                       | Reword `validateLicenseEdition`. Rename + narrow `validateGlobalEncryption` → `validateConfigBackupEncryption`. Replace `validateAgentWorkload` with `validateAgentStandaloneUnsupported` + `validateAgentPolicyGatewayRequired`. |
| `src/lib/CLAUDE.md`                          | Update rules table (11 rules → 12 rules) and rule-IDs.                                                                                                                                                                            |
| `docs/validation-rules.md`                   | Update status taxonomy with `skipped` row. Update rule entries for the four affected rules.                                                                                                                                       |
| `src/components/dashboard/`                  | Add Notes panel rendering `info` + `skipped` validations in a neutral/grey style. Wire into `dashboard-view.tsx` alongside blockers and passing checks.                                                                           |
| `src/__tests__/validator.test.ts`            | Update describe blocks, ruleId references, and add new test cases per new rule semantics.                                                                                                                                         |
| `src/__tests__/validation-selectors.test.ts` | Add tests for `getNoteValidations()`.                                                                                                                                                                                             |
| `src/__tests__/` (new)                       | Add component test file for the Notes panel.                                                                                                                                                                                      |
| `src/lib/constants.ts`                       | Rename `PIPELINE_STEPS` step id `agent-workload` → `agent-checks` so the presentational id matches the post-split rule grouping. `encryption` step id is unchanged.                                                               |
| `VDCVAULT-CHEETSHEET.md`                     | Correct the "Agents Can't Go Direct" red flag and the workload matrix row for managed agents so the cheatsheet matches the new agent-job categorisation.                                                                          |

Resulting validator count: **11 → 12 rules**.

## Rule Specifications

### Rule 1 — `license-edition` (reframed, info only)

|                 |                                     |
| --------------- | ----------------------------------- |
| **Type**        | Reframe (no rename)                 |
| **ruleId**      | `license-edition` (unchanged)       |
| **title**       | `License/Edition Notes` (unchanged) |
| **Data source** | `NormalizedDataset.Licenses`        |

**Behavior:**

- **`pass`** — no license has `Edition` containing `"community"` or `"free"` (case-insensitive, trimmed).
- **`info`** — at least one license is Community or Free Edition.

**Messages:**

- `pass`: _"No Community or Free editions detected."_
- `info`: _"Community or Free edition detected. VDC Vault is fully supported on Community Edition. Note: Community / Free editions do not include Scale-Out Backup Repository (SOBR), so capacity-tier offload patterns are not available."_

**`affectedItems`** — list of matching `Edition` strings (unchanged).

### Rule 2 — `config-backup-encryption` (renamed and narrowed)

|                 |                                                                           |
| --------------- | ------------------------------------------------------------------------- |
| **Type**        | Rename + narrow                                                           |
| **ruleId**      | `global-encryption` → **`config-backup-encryption`**                      |
| **title**       | `Global Encryption Configuration` → **`Configuration Backup Encryption`** |
| **Data source** | `NormalizedDataset.securitySummary[0].ConfigBackupEncryptionEnabled`      |

`BackupFileEncryptionEnabled` is no longer read by this rule. Per-job backup file encryption remains the responsibility of `job-encryption`.

**Behavior:**

- **`pass`** — `securitySummary[0].ConfigBackupEncryptionEnabled === true`.
- **`skipped`** — `securitySummary` array is empty (cannot determine).
- **`warning`** — `ConfigBackupEncryptionEnabled === false`.

**Messages:**

- `pass`: _"VBR configuration backup encryption is enabled."_
- `skipped`: _"Configuration backup encryption check skipped — security summary section is missing from the healthcheck data."_
- `warning`: _"VBR configuration backup encryption is not enabled. Once VDC Vault is in use, VBR automatically disables configuration backups unless they are encrypted, so encryption becomes a requirement at that point. It is also a best practice generally — the configuration backup contains sensitive information such as credentials and certificates."_

**`affectedItems`** — `[]` (single-server configuration, no per-item enumeration).

### Rule 3a — `agent-standalone-unsupported` (NEW, blocker)

|                 |                                        |
| --------------- | -------------------------------------- |
| **Type**        | New rule (split from `agent-workload`) |
| **ruleId**      | `agent-standalone-unsupported`         |
| **title**       | `Standalone Agent Workloads`           |
| **Data source** | `NormalizedDataset.jobSummary[]`       |

**Detection:** any `jobSummary` row whose `JobType` equals `"Unmanaged Agent"` (case-insensitive, exact match after trim) AND `Count > 0`. `jobSummary` is used instead of `jobInfo` because VBR does NOT include unmanaged agent rows in `jobInfo` — they only appear in the `jobSummary` aggregate.

**Behavior:**

- **`pass`** — no matching row, or matching row has `Count === 0`.
- **`fail`** — at least one matching row with `Count > 0`.

**Messages:**

- `pass`: _"No standalone agent workloads detected."_
- `fail`: _"{count} standalone (unmanaged) agent {job|jobs} detected. Standalone agents cannot target VDC Vault directly. Use a Backup Copy Job with encryption enabled to land their backups in Vault — that is the only supported path."_ (count and pluralisation are interpolated.)

**`affectedItems`** — `[]`. `jobSummary` does not enumerate per-job names, so the detected count is conveyed in the message instead.

### Rule 3b — `agent-policy-gateway-required` (NEW, warning)

|                 |                                        |
| --------------- | -------------------------------------- |
| **Type**        | New rule (split from `agent-workload`) |
| **ruleId**      | `agent-policy-gateway-required`        |
| **title**       | `Managed Agent Policies`               |
| **Data source** | `NormalizedDataset.jobInfo[].JobType`  |

**Detection:** `job.JobType` equals `"EpAgentPolicy"` or `"VmbApiPolicyTempJob"` (case-insensitive, exact match after trim).

**Behavior:**

- **`pass`** — no jobs match.
- **`warning`** — one or more jobs match.

**Messages:**

- `pass`: _"No managed agent policies detected."_
- `warning`: _"Managed agent policies require a VBR Gateway Server to reach VDC Vault — they cannot write directly to object storage. Ensure a Gateway Server is configured for these policies."_

**`affectedItems`** — `JobName` values of matching jobs.

### Removed: `agent-workload`

The current `validateAgentWorkload` function is removed. Managed agent backup jobs (`Agent Backup`, `EpAgentBackup`) produce no validation entry under this design — they are silently fine for Vault. If future work wants to surface them as `info` ("X managed agent jobs detected; no Gateway needed"), that is a deliberate follow-up, not part of this spec.

## Status Taxonomy Changes

Adding a fourth display category. Updated taxonomy:

| Status    | Meaning                                        | Icon / Style    | Display Location                   |
| --------- | ---------------------------------------------- | --------------- | ---------------------------------- |
| `fail`    | Hard blocker preventing Vault onboarding       | `CircleX`       | Blockers list (sorted first, red)  |
| `warning` | Actionable concern, not a hard blocker         | `TriangleAlert` | Blockers list (after fails, amber) |
| `info`    | Advisory note (FYI, no action strictly needed) | neutral / grey  | **Notes panel** (new)              |
| `skipped` | Check could not run due to missing input data  | neutral / grey  | **Notes panel** (new)              |
| `pass`    | Check passed, no issues found                  | `CheckCircle2`  | Passing checks list (green)        |

Notes panel renders below blockers and above passing checks. Title: "Notes". Visual treatment: neutral grey background with a subdued icon (e.g., `Info` for `info`, `CircleSlash` or `MinusCircle` for `skipped`). Same affectedItems handling (bulleted, truncated to 5 with "+ N more").

## Component / Selector Changes

### `src/lib/validation-selectors.ts`

- Add `getNoteValidations(validations)` returning entries with `status === "info" || status === "skipped"`.
- Existing `isBlocker` (fail + warning) is unaffected.
- Existing `getPassingValidations` (pass-only) is unaffected.

### `src/components/dashboard/notes-panel.tsx` (NEW)

- Props: `validations: ValidationResult[]`.
- Filters via `getNoteValidations`.
- Renders nothing when no notes.
- Each entry: title, message, optional affectedItems list (same truncation pattern as blockers).
- Neutral / grey styling per Tailwind tokens, no animation beyond the existing motion conventions.

### `src/components/dashboard/dashboard-view.tsx`

- Render order: experimental banner → blockers list (if any) → notes panel (if any) → success celebration or passing checks list.

## Test Plan

All test changes follow the existing project conventions (TDD, query priority `getByRole` → `getByText` → `getByTestId`, factory helpers for unique data, fixtures.ts for shared baseline).

### `src/__tests__/validator.test.ts`

- **Rule 1 (`vbr-version`)**: unchanged.
- **Rule 2 block "Global Encryption Check"**: rename describe to "Configuration Backup Encryption Check". Drop tests for `BackupFileEncryptionEnabled` (no longer read). Keep / update tests for: pass when ConfigBackup encrypted; warning when ConfigBackup not encrypted; new `skipped` test when securitySummary array is empty.
- **Rule 5 block "Agent Workload Check"**: delete. Add two new describe blocks:
  - "Standalone Agent Workloads (`agent-standalone-unsupported`)": pass when no matches; fail with `"Unmanaged Agent"` job; case-insensitive matching; exact-match (does not fire on `"Agent Backup"` or `"EpAgentBackup"`).
  - "Managed Agent Policies (`agent-policy-gateway-required`)": pass when no matches; warning with `"EpAgentPolicy"` and/or `"VmbApiPolicyTempJob"`; case-insensitive matching; exact-match (does not fire on `"Agent Backup"`).
- **Rule 6 block "License/Edition Check"**: keep three info-status tests; update the message assertions to the new text; keep pass tests.

### `src/__tests__/validation-selectors.test.ts`

- Add tests for `getNoteValidations`: returns `info` + `skipped`, excludes pass/fail/warning, preserves order.

### `src/__tests__/notes-panel.test.tsx` (NEW)

- Renders nothing when no notes.
- Renders one entry per note.
- Renders title, message, and affectedItems truncated at 5.
- Accessible (uses appropriate semantic role).

### `src/__tests__/pipeline.test.ts`

- Update existing assertions that reference removed ruleId `"agent-workload"` to the new split ruleIds.
- Update assertions on `"global-encryption"` ruleId to `"config-backup-encryption"`.

### `src/__tests__/dashboard-view.test.tsx`

- Add render-order assertion: blockers → notes → passing.
- Add assertion that a `skipped` validation appears in the notes panel.

## Out of Scope

- Adding an `info` entry for managed agent backup jobs (`Agent Backup`, `EpAgentBackup`). They are silently fine in this design.
- Visual design polish beyond a basic neutral panel (e.g., motion treatments, sub-headings, expand/collapse).
- Any other validation rule (vbr-version, job-encryption, aws-workload, retention-period, the four SOBR rules) — out of scope per agreed "only the three flagged" scope.

## Open Questions

None at this point. All design questions have been resolved during brainstorming.
