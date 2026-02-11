# Validation Rules Specification

> **This document is the authoritative specification for all VDC Vault readiness validation rules.**
> New rules must be added here first, reviewed, and then implemented to match.
> For domain context and Vault limitations, see [`VDCVAULT-CHEETSHEET.md`](../VDCVAULT-CHEETSHEET.md). For functional requirements, see [`PRD.md`](../PRD.md).

## Status Taxonomy

| Status    | Meaning                                       | Icon            | Badge     | Display Location                          |
| --------- | --------------------------------------------- | --------------- | --------- | ----------------------------------------- |
| `fail`    | Hard blocker preventing Vault onboarding      | `CircleX`       | `Blocker` | Blockers list (sorted first, red styling) |
| `warning` | Actionable concern, not a hard blocker        | `TriangleAlert` | `Warning` | Blockers list (sorted after fails, amber) |
| `info`    | Informational note, no action strictly needed | --              | --        | Not currently displayed in overview       |
| `pass`    | Check passed, no issues found                 | `CheckCircle2`  | `Passed`  | Passing checks list (green styling)       |

**Sorting:** Blockers list shows `fail` results first, then `warning`, preserving order within each group. Passing checks appear below blockers when blockers exist, or a success celebration is shown when there are no blockers.

**Affected items:** Displayed as a bulleted list below the message, truncated to 5 visible items with "+ N more" overflow text.

---

## Rule Catalog

### `vbr-version` -- VBR Version Compatibility

|                       |                                                         |
| --------------------- | ------------------------------------------------------- |
| **Status on failure** | `fail`                                                  |
| **Data source**       | `NormalizedDataset.backupServer` (`SafeBackupServer[]`) |
| **Constants**         | `MINIMUM_VBR_VERSION` = `"12.1.2"`                      |

**Conditions:**

| Condition                                     | Status | Message                                                                                         |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| No VBR server found (`backupServer` is empty) | `fail` | `No VBR server found in the healthcheck data. VDC Vault requires VBR version 12.1.2 or higher.` |
| Any server below minimum version              | `fail` | `VBR version must be 12.1.2 or higher to use VDC Vault. Upgrade required.`                      |
| All servers at or above minimum version       | `pass` | `All VBR servers meet the minimum version requirement (12.1.2+).`                               |

**Affected items:** Server names (`SafeBackupServer.Name`) of servers below the minimum version.

**Recommendations:** Upgrade VBR to version 12.1.2 or higher. Version comparison uses the first three segments (major.minor.patch) and ignores the fourth (build number).

---

### `global-encryption` -- Global Encryption Configuration

|                       |                                                               |
| --------------------- | ------------------------------------------------------------- |
| **Status on failure** | `warning`                                                     |
| **Data source**       | `NormalizedDataset.securitySummary` (`SafeSecuritySummary[]`) |

**Conditions:**

| Condition                                                                 | Status    | Message                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No security summary found (`securitySummary` is empty)                    | `pass`    | `No security summary found. Skipping global encryption check.`                                                                                                                          |
| `BackupFileEncryptionEnabled` or `ConfigBackupEncryptionEnabled` is false | `warning` | `Global encryption is disabled. VDC Vault requires all data to be encrypted. Best practice is to enable BackupFileEncryption and ConfigBackupEncryption globally to ensure compliance.` |
| Both encryption flags are true                                            | `pass`    | `Global encryption settings are enabled.`                                                                                                                                               |

**Affected items:** None (global setting, not per-item).

**Recommendations:** Enable both `BackupFileEncryption` and `ConfigBackupEncryption` globally in the VBR console.

---

### `job-encryption` -- Job Encryption Audit

|                       |                                           |
| --------------------- | ----------------------------------------- |
| **Status on failure** | `fail`                                    |
| **Data source**       | `NormalizedDataset.jobInfo` (`SafeJob[]`) |

**Conditions:**

| Condition                        | Status | Message                                                                                                                                                                                  |
| -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any job has `Encrypted` = false  | `fail` | `Vault requires source-side encryption. You must enable encryption on these jobs or use an encrypted Backup Copy Job. Unencrypted data cannot use Move/Copy Backup to migrate to Vault.` |
| All jobs have `Encrypted` = true | `pass` | `All jobs have encryption enabled.`                                                                                                                                                      |

**Affected items:** Job names (`SafeJob.JobName`) of unencrypted jobs.

**Recommendations:** Enable encryption on each affected job, or create encrypted Backup Copy Jobs. Unencrypted data cannot use Move/Copy Backup to migrate to Vault.

---

### `aws-workload` -- AWS Workload Support

|                       |                                           |
| --------------------- | ----------------------------------------- |
| **Status on failure** | `fail`                                    |
| **Data source**       | `NormalizedDataset.jobInfo` (`SafeJob[]`) |

**Conditions:**

| Condition                                                               | Status | Message                                                                                                                                                                |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any job has `JobType` containing `"veeam.vault.aws"` (case-insensitive) | `fail` | `VDC Vault cannot target Vault directly for Veeam Backup for AWS workloads. This is a hard limitation. Use Backup Copy Jobs to transfer AWS backups to Vault instead.` |
| No AWS workload jobs found                                              | `pass` | `No AWS workloads detected that would block Vault integration.`                                                                                                        |

**Affected items:** Job names (`SafeJob.JobName`) of AWS workload jobs.

**Recommendations:** Use Backup Copy Jobs to transfer AWS backups to Vault instead of targeting Vault directly. This is a hard platform limitation.

---

### `agent-workload` -- Agent Workload Configuration

|                       |                                           |
| --------------------- | ----------------------------------------- |
| **Status on failure** | `warning`                                 |
| **Data source**       | `NormalizedDataset.jobInfo` (`SafeJob[]`) |

**Conditions:**

| Condition                                                     | Status    | Message                                                                                                                                                                       |
| ------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any job has `JobType` containing `"agent"` (case-insensitive) | `warning` | `Agent workloads detected. Veeam Agents cannot write directly to object storage. Ensure you configure a Gateway Server or use Cloud Connect to route these backups to Vault.` |
| No agent workload jobs found                                  | `pass`    | `No agent workloads detected.`                                                                                                                                                |

**Affected items:** Job names (`SafeJob.JobName`) of agent-based jobs.

**Recommendations:** Configure a Gateway Server or use Cloud Connect to route agent backups to Vault. Agents cannot write directly to object storage.

---

### `license-edition` -- License/Edition Notes

|                       |                                                |
| --------------------- | ---------------------------------------------- |
| **Status on failure** | `info`                                         |
| **Data source**       | `NormalizedDataset.Licenses` (`SafeLicense[]`) |

**Conditions:**

| Condition                                                                                  | Status | Message                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| Any license has `Edition` containing `"community"` or `"free"` (case-insensitive, trimmed) | `info` | `Community Edition detected. Ensure you are aware of SOBR limitations when designing your Vault strategy.` |
| No community or free editions found                                                        | `pass` | `No Community or Free editions detected.`                                                                  |

**Affected items:** Edition strings (`SafeLicense.Edition`) of matched licenses.

**Recommendations:** Review SOBR (Scale-Out Backup Repository) limitations for Community Edition before designing a Vault strategy. See [`VDCVAULT-CHEETSHEET.md`](../VDCVAULT-CHEETSHEET.md) for edition-specific limitations.

---

### `retention-period` -- Retention Period

|                       |                                           |
| --------------------- | ----------------------------------------- |
| **Status on failure** | `warning`                                 |
| **Data source**       | `NormalizedDataset.jobInfo` (`SafeJob[]`) |
| **Constants**         | `MINIMUM_RETENTION_DAYS` = `30`           |

**Conditions:**

| Condition                                          | Status    | Message                                                                                                                                                          |
| -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any job has `RetainDays` non-null and less than 30 | `warning` | `VDC Vault enforces a 30-day minimum retention period. The following jobs have retention set below this minimum and will be subject to the 30-day minimum lock.` |
| All jobs have `RetainDays` >= 30 or null           | `pass`    | `All jobs meet the 30-day minimum retention requirement.`                                                                                                        |

**Affected items:** `"{JobName} ({RetainDays} days)"` for each affected job.

**Recommendations:** Increase retention to at least 30 days on affected jobs. VDC Vault enforces a 30-day minimum that cannot be disabled -- jobs below this threshold will have the minimum lock applied automatically.

---

## Adding a New Rule

1. **Document the rule** -- Add an entry to this file following the template above. Submit for review.
2. **Add constants** -- If the rule uses thresholds, add them to `src/lib/constants.ts`.
3. **Define types** -- If the rule needs new data fields, update `src/types/domain.ts` (`NormalizedDataset`) and `src/lib/normalizer.ts`.
4. **Write failing tests** -- Add test cases to `src/__tests__/` covering all conditions (fail/warning/info and pass). Verify they fail.
5. **Implement the rule** -- Create a `validate*` function in `src/lib/validator.ts` and add it to the `validateHealthcheck()` return array.
6. **Register in the pipeline** -- If the rule needs a UI step, add an entry to `PIPELINE_STEPS` in `src/lib/constants.ts` (note: pipeline steps are presentation-layer groupings and do not need to be 1:1 with rule IDs).
7. **Update selectors** -- If the rule uses a new status or needs special display handling, update `src/lib/validation-selectors.ts`.
8. **Verify** -- Run `npm run test:run` and `npm run build`. Confirm all conditions produce the documented messages verbatim.
