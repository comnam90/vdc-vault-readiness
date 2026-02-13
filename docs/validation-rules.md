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

|                       |                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Status on failure** | `fail`                                                                             |
| **Data source**       | `NormalizedDataset.jobInfo` (`SafeJob[]`), `NormalizedDataset.sobr` (`SafeSobr[]`) |

**SOBR exemption:** Jobs targeting a SOBR with `EnableCapacityTier=true` are exempt from this check. When a SOBR has a capacity tier, encryption is enforced at the capacity tier level instead (see [`sobr-cap-encryption`](#sobr-cap-encryption----capacity-tier-encryption)). The exemption is implemented by building a `Set<string>` of SOBR names where `EnableCapacityTier=true` and excluding jobs whose `RepoName` is in the set. When `data.sobr` is empty (backward compatible), no exemptions are applied.

**Conditions:**

| Condition                                                       | Status | Message                                                                                                                                                                                  |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any non-exempt job has `Encrypted` = false                      | `fail` | `Vault requires source-side encryption. You must enable encryption on these jobs or use an encrypted Backup Copy Job. Unencrypted data cannot use Move/Copy Backup to migrate to Vault.` |
| All non-exempt jobs have `Encrypted` = true (or all are exempt) | `pass` | `All jobs have encryption enabled.`                                                                                                                                                      |

**Affected items:** Job names (`SafeJob.JobName`) of non-exempt unencrypted jobs.

**Recommendations:** Enable encryption on each affected job, or create encrypted Backup Copy Jobs. Unencrypted data cannot use Move/Copy Backup to migrate to Vault. Jobs targeting SOBRs with a capacity tier are exempt because encryption is enforced at the capacity tier level.

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

### `sobr-cap-encryption` -- Capacity Tier Encryption

|                       |                                                    |
| --------------------- | -------------------------------------------------- |
| **Status on failure** | `warning`                                          |
| **Data source**       | `NormalizedDataset.capExtents` (`SafeCapExtent[]`) |

**Conditions:**

| Condition                                              | Status    | Message                                                                                                                                                            |
| ------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any cap extent has `EncryptionEnabled` = false         | `warning` | `Capacity tier extents without encryption detected. VDC Vault requires encryption on capacity tier data. Enable encryption on these extents to ensure compliance.` |
| No cap extents, or all have `EncryptionEnabled` = true | `pass`    | `All capacity tier extents have encryption enabled.`                                                                                                               |

**Affected items:** `"{Name} (SOBR: {SobrName})"` for each unencrypted cap extent.

**Recommendations:** Enable encryption on each affected capacity tier extent. VDC Vault requires all data on the capacity tier to be encrypted. This check complements the [`job-encryption`](#job-encryption----job-encryption-audit) rule -- jobs targeting SOBRs with capacity tiers are exempt from job-level encryption because encryption is enforced here instead.

---

### `sobr-immutability` -- Capacity Tier Immutability

|                       |                                                    |
| --------------------- | -------------------------------------------------- |
| **Status on failure** | `warning`                                          |
| **Data source**       | `NormalizedDataset.capExtents` (`SafeCapExtent[]`) |

**Conditions:**

| Condition                                             | Status    | Message                                                                                                                                                                                                                   |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any cap extent has `ImmutableEnabled` = false         | `warning` | `Capacity tier extents without immutability detected. VDC Vault enforces immutability, which increases effective retention by the immutability period plus block generation period (10 days for Azure, 30 days for AWS).` |
| No cap extents, or all have `ImmutableEnabled` = true | `pass`    | `All capacity tier extents have immutability enabled.`                                                                                                                                                                    |

**Affected items:** `"{Name} (SOBR: {SobrName})"` for each non-immutable cap extent.

**Recommendations:** Enable immutability on each affected capacity tier extent. VDC Vault enforces immutability which cannot be disabled. Be aware that immutability increases effective retention by the immutability period plus the block generation period (10 days for Azure, 30 days for AWS), which may increase storage costs.

---

### `archive-tier-edition` -- Archive Tier Edition Requirement

|                       |                                                      |
| --------------------- | ---------------------------------------------------- |
| **Status on failure** | `warning`                                            |
| **Data source**       | `NormalizedDataset.archExtents` (`SafeArchExtent[]`) |

**Conditions:**

| Condition                                          | Status    | Message                                                                                                                                                                  |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any arch extent has `ArchiveTierEnabled` = true    | `warning` | `Archive tier is configured. VDC Vault Foundation has a 20% fair usage limit on egress that archiving consumes. Consider VDC Vault Advanced for archive tier workloads.` |
| No arch extents, or none have `ArchiveTierEnabled` | `pass`    | `No active archive tier configurations detected.`                                                                                                                        |

**Affected items:** `"{Name} (SOBR: {SobrName})"` for each enabled archive extent.

**Recommendations:** Consider upgrading to VDC Vault Advanced if archive tier is in use. VDC Vault Foundation has a 20% fair usage limit on egress, and archiving consumes egress bandwidth. Advanced edition removes this limitation.

---

### `capacity-tier-residency` -- Capacity Tier Residency

|                       |                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status on failure** | `warning`                                                                                                                                                                                    |
| **Data source**       | `NormalizedDataset.sobr` (`SafeSobr[]`), `NormalizedDataset.capExtents` (`SafeCapExtent[]`), `NormalizedDataset.archExtents` (`SafeArchExtent[]`), `NormalizedDataset.jobInfo` (`SafeJob[]`) |
| **Constants**         | `MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS` = `30`                                                                                                                                                |

**Algorithm:** For each SOBR with `EnableCapacityTier=true`, cross-references cap extents, arch extents, and jobs using a unified formula: `residency = retentionDays - arrivalDay`.

1. **Determine arrivalDay** from cap extents:
   - If any cap extent has `CopyModeEnabled=true`: `arrivalDay = 0` (data arrives from day 1)
   - If move-only (`MoveModeEnabled=true`, no copy): `arrivalDay = min(MovePeriodDays)` across extents (`null` treated as `0`)
2. **Determine immutablePeriod**: `max(ImmutablePeriod)` across cap extents where `ImmutableEnabled=true` (else `0`)
3. **Normal retention** per job targeting the SOBR:
   - Skip if `RetainDays` is null or `RetainDays <= arrivalDay` (data never reaches capacity tier)
   - `retentionResidency = RetainDays - arrivalDay`
   - If `retentionResidency >= 30`: pass
   - If `retentionResidency < 30`: check `effectiveResidency = max(retentionResidency, immutablePeriod)` -- if immutability covers the gap, flag with storage cost note; otherwise flag as insufficient
4. **GFS retention** per job with `GfsEnabled=true` and `GfsDetails`:
   - Weekly: `days = weekly * 7`, Monthly: `days = monthly * 30`, Yearly: `days = yearly * 365`
   - Same residency check as normal retention using each GFS period
5. **Archive tier** if SOBR has `ArchiveTierEnabled=true`:
   - `effectiveArchiveTrigger = max(RetentionPeriod, immutablePeriod)` (archive can't move immutable data)
   - `archResidency = effectiveArchiveTrigger - arrivalDay`
   - If `archResidency < 30`: flag

**Conditions:**

| Condition                                            | Status    | Message                                                                                                    |
| ---------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| Any item has insufficient residency on capacity tier | `warning` | `Data must remain on capacity tier for at least 30 days. The following items have insufficient residency.` |
| No SOBRs with capacity tier, or all items sufficient | `pass`    | `All capacity tier data meets the 30-day minimum residency requirement.`                                   |

**Affected items:** Descriptive strings per sub-check:

- Normal retention too short: `"{JobName}: normal retention {N} days on capacity (needs 30+)"`
- Normal retention short but immutability covers gap: `"{JobName}: normal retention {N} days, but immutability extends to {M} days (extra storage cost)"`
- GFS retention too short: `"{JobName}: GFS {weekly|monthly|yearly} {N} days on capacity (needs 30+)"`
- GFS retention short but immutability covers gap: `"{JobName}: GFS {label} {N} days, but immutability extends to {M} days (extra storage cost)"`
- Archive pulls data too early: `"{SobrName}: archive moves data after {N} days on capacity (needs 30+)"`

**Recommendations:** Ensure data remains on the capacity tier for at least 30 days. Options include increasing retention periods, adjusting move policy timing, or enabling immutability (which extends effective residency but incurs additional storage cost). For archive tier, ensure the archive trigger period minus the arrival day is at least 30 days.

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
