# Design: Active Full Backup Warning

**Date:** 2026-05-29  
**Status:** Approved  
**Branch:** `feature/active-full-warning`

## Problem

The VDC Vault sizing calculator assumes all jobs use Synthetic Full backups. Jobs with Active Full enabled create a complete new backup chain on each scheduled run, consuming significantly more storage than the calculator estimates. Users need to know which jobs are affected before committing to a Vault sizing.

## Rule Definition

| Field           | Value                                                |
| --------------- | ---------------------------------------------------- |
| `ruleId`        | `"active-full-enabled"`                              |
| `title`         | `"Active Full Backup Schedules Detected"`            |
| `status`        | `"warning"` / `"pass"` / `"skipped"`                 |
| `affectedItems` | Names of all jobs where `ActiveFullEnabled === true` |

### Status conditions

- **`warning`** — one or more jobs have `ActiveFullEnabled === true`
- **`pass`** — all jobs have `ActiveFullEnabled` as `false` or `null`
- **`skipped`** — job data is absent (no jobs in normalized dataset)

### Messages

**Warning:**

> "N job(s) have Active Full enabled. The VDC Vault sizing calculator assumes Synthetic Full backups. Active Full runs create a complete new backup chain on each execution, consuming significantly more storage than the calculator estimates."

**Pass:**

> "No jobs have Active Full enabled. Sizing estimates assume Synthetic Full backups."

## Implementation

### New function

```typescript
// src/lib/validator.ts
export function validateActiveFull(jobs: SafeJob[]): ValidationResult;
```

- Filters `jobs` where `ActiveFullEnabled === true`
- Returns `skipped` if `jobs` is empty
- Returns `warning` with affected job names if any match
- Returns `pass` otherwise
- No job type filtering required — replica jobs will never have `ActiveFullEnabled: true` in practice

### Integration

Called from the existing `validate()` orchestrator in `src/lib/validator.ts`, added alongside the current 11 rules. No changes to types, UI components, or selectors — the `warning` status is already fully supported throughout the display pipeline.

## Testing

File: `src/__tests__/validator.test.ts` (new `validateActiveFull` describe block, or dedicated file if existing file is large)

| Scenario                                     | Expected                                |
| -------------------------------------------- | --------------------------------------- |
| All jobs have `ActiveFullEnabled: false`     | `pass`                                  |
| All jobs have `ActiveFullEnabled: null`      | `pass`                                  |
| One job has `ActiveFullEnabled: true`        | `warning`, that job in `affectedItems`  |
| Multiple jobs with `ActiveFullEnabled: true` | `warning`, all names in `affectedItems` |
| Empty job list                               | `skipped`                               |

## Out of scope

- No per-job-type filtering
- No severity escalation based on proportion of affected jobs
- No changes to the sizing calculator inputs or outputs
- No new UI components — existing `BlockersList` renders warnings already
