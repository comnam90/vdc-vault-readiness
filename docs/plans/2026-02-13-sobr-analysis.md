# SOBR Analysis Feature Plan

**Date:** 2026-02-13
**Branch:** feature/job-details-smart-columns-sheet
**Commit:** 988b163
**Status:** Implemented

## Context

The tool currently validates jobs in isolation — checking if each job has encryption, correct retention, etc. But when a SOBR has a **capacity tier**, the encryption concern shifts from the job level to the capacity tier level. Additionally, SOBRs with capacity tiers have implications for data residency (how long data stays on the capacity tier before expiring or being archived), immutability enforcement, and Vault edition requirements. This feature adds SOBR/extent parsing and 4 new validation rules + modifies 1 existing rule.

## Requirements Summary

1. **Encryption exemption**: Jobs targeting SOBRs with a capacity tier are exempt from job-level encryption checks
2. **Cap tier encryption warning**: Warn if an exempted SOBR's capacity tier extent lacks encryption
3. **Immutability warning**: Warn if capacity tier lacks immutability (Vault enforces it, increasing effective retention by immutability period + block gen period of 10d Azure / 30d AWS)
4. **Archive tier edition**: Warn that VDC Vault Advanced is needed when archive tier is configured (Foundation has 20% fair usage on egress that archiving consumes)
5. **Capacity tier residency**: Check that data stays on capacity tier >= 30 days. Use a unified formula: `residency = retentionDays - arrivalDay` where arrivalDay = 0 (copy mode) or MovePeriodDays (move-only):
   - **Copy mode**: arrivalDay=0, so residency = retentionDays. Still needs check (job retention could be < 30)
   - **Move-only, normal retention**: residency = `RetainDays - MovePeriodDays`. If RetainDays <= MovePeriodDays, normal backups never reach capacity
   - **GFS retention**: residency = `gfsPeriodDays - arrivalDay` per GFS type (weekly*7, monthly*30, yearly\*365)
   - **Archive tier**: archive "older than N days" pulls data off capacity early — check `archRetentionPeriod - arrivalDay >= 30`
   - **Immutability factor**: if cap tier has immutability, data can't be removed until immutability expires, extending effective residency to `max(retention_residency, immutablePeriod)`. Flag retention_residency < 30 even when immutability covers it, noting the storage cost impact

## Files Modified

| File                                    | Change                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/types/domain.ts`                   | Add SafeSobr, SafeCapExtent, SafeArchExtent; extend DataError.section; extend NormalizedDataset |
| `src/types/healthcheck.ts`              | Extend NormalizerInput with sobr?, capextents?, archextents?                                    |
| `src/lib/normalizer.ts`                 | Add normalizeSobr, normalizeCapExtents, normalizeArchExtents                                    |
| `src/lib/pipeline.ts`                   | Add zipSection calls for sobr, capextents, archextents                                          |
| `src/lib/validator.ts`                  | Modify validateJobEncryption; add 4 new rules (total: 11)                                       |
| `src/lib/constants.ts`                  | Add MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS; add sobr-analysis pipeline step                       |
| `src/__tests__/fixtures.ts`             | Add sobr/capExtents/archExtents empty arrays to MOCK_DATA                                       |
| `src/__tests__/normalizer.test.ts`      | Add empty arrays to toEqual assertions                                                          |
| `src/__tests__/validator.test.ts`       | Add empty arrays to all inline NormalizedDataset objects, update rule count                     |
| `src/__tests__/pipeline.test.ts`        | Update toHaveLength(7) -> toHaveLength(11)                                                      |
| `src/__tests__/app.test.tsx`            | Add empty arrays to inline NormalizedDataset                                                    |
| `src/__tests__/dashboard-view.test.tsx` | Add empty arrays to inline NormalizedDataset objects                                            |
| `src/__tests__/domain-types.test.ts`    | Add empty arrays to inline NormalizedDataset objects                                            |
| `src/__tests__/use-analysis.test.ts`    | Add empty arrays to inline NormalizedDataset                                                    |
| `src/__tests__/normalizer-sobr.test.ts` | **New** — 26 tests for 3 normalizer functions                                                   |
| `src/__tests__/validator-sobr.test.ts`  | **New** — 29 tests for modified + 4 new validation rules                                        |

## Reusable Existing Code

- `parseGfsDetails()` from `src/lib/calculator-aggregator.ts` — parses "Weekly:4,Monthly:2" into `{ weekly, monthly, yearly }` (already exported)
- `zipSection()` from `src/lib/parser.ts` — generic Headers/Rows parser (works for any section)
- `parseBoolean()`, `parseNumeric()`, `normalizeString()`, `asArray()`, `isRecord()`, `buildError()` — all existing in `src/lib/normalizer.ts`
- `HealthcheckSections` index signature `[key: string]` — already supports accessing arbitrary sections

## Implementation Steps

### Step 1: Types (`src/types/domain.ts`)

**SafeSobr** — required: Name (string), EnableCapacityTier (boolean), CapacityTierCopy (boolean), CapacityTierMove (boolean), ArchiveTierEnabled (boolean), ImmutableEnabled (boolean). Optional: ExtentCount, JobCount, PolicyType, UsePerVMFiles, CapTierType, ImmutablePeriod, SizeLimitEnabled, SizeLimit.

**SafeCapExtent** — required: Name (string), SobrName (string), EncryptionEnabled (boolean), ImmutableEnabled (boolean). Optional: Type, Status, CopyModeEnabled, MoveModeEnabled, MovePeriodDays, ImmutablePeriod, SizeLimitEnabled, SizeLimit.

**SafeArchExtent** — required: SobrName (string), Name (string), ArchiveTierEnabled (boolean), EncryptionEnabled (boolean), ImmutableEnabled (boolean). Optional: RetentionPeriod, CostOptimizedEnabled, FullBackupModeEnabled, ImmutablePeriod.

Extend `DataError.section` union with `"sobr" | "capextents" | "archextents"`.

Extend `NormalizedDataset` with `sobr: SafeSobr[]`, `capExtents: SafeCapExtent[]`, `archExtents: SafeArchExtent[]`.

### Step 2: Healthcheck types (`src/types/healthcheck.ts`)

Add `sobr?`, `capextents?`, `archextents?` to `NormalizerInput`.

### Step 3: Update test fixtures for compilation

Add `sobr: [], capExtents: [], archExtents: []` to:

- `src/__tests__/fixtures.ts` MOCK_DATA
- All inline NormalizedDataset objects in `normalizer.test.ts`, `validator.test.ts`, `pipeline.test.ts`
- Plus `app.test.tsx`, `dashboard-view.test.tsx`, `domain-types.test.ts`, `use-analysis.test.ts` (discovered during build)
- Verify all existing tests still pass

### Step 4: Normalizer — TDD

**Red**: Write `src/__tests__/normalizer-sobr.test.ts`:

- `normalizeSobr`: valid row, missing Name, invalid EnableCapacityTier/ImmutableEnabled/ArchiveTierEnabled/CapacityTierCopy/CapacityTierMove, optional field defaults
- `normalizeCapExtents`: valid row, missing Name/SobrName, invalid EncryptionEnabled/ImmutableEnabled, numeric parsing
- `normalizeArchExtents`: valid row, missing SobrName/Name, invalid booleans, RetentionPeriod parsing

**Green**: Add three normalizer functions to `src/lib/normalizer.ts` using existing flatMap + error accumulation pattern. Wire into `normalizeHealthcheck()` return via `asArray(raw.sobr)` etc.

### Step 5: Pipeline wiring (`src/lib/pipeline.ts`)

Add to `analyzeHealthcheck()`:

```
sobr: zipSection(sections.sobr),
capextents: zipSection(sections.capextents),
archextents: zipSection(sections.archextents),
```

### Step 6: Constants (`src/lib/constants.ts`)

- `export const MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS = 30`
- Add `{ id: "sobr-analysis", label: "Analyze SOBR configuration" }` to PIPELINE_STEPS

### Step 7: Validators — TDD

**Red**: Write `src/__tests__/validator-sobr.test.ts` then **Green**: implement in `src/lib/validator.ts`.

#### 7a. Modified: `validateJobEncryption` (encryption exemption)

Build `Set<string>` of SOBR names where `EnableCapacityTier=true`. Filter unencrypted jobs to exclude those whose `RepoName` is in the set.

Tests:

- Unencrypted job on SOBR with cap tier -> pass (exempted)
- Unencrypted job on SOBR WITHOUT cap tier -> still fail
- Unencrypted job on non-SOBR repo -> still fail
- Mixed: some exempt, some not -> fail with only non-exempt jobs
- Empty sobr array -> no exemptions (backward compatible)

#### 7b. New: `validateCapTierEncryption` (ruleId: `sobr-cap-encryption`)

Check `data.capExtents` for any with `EncryptionEnabled=false`.

- Passes when no cap extents or all have EncryptionEnabled=true
- Warns when any lack encryption
- AffectedItems: `"extentName (SOBR: sobrName)"`

#### 7c. New: `validateSobrImmutability` (ruleId: `sobr-immutability`)

Check `data.capExtents` for any with `ImmutableEnabled=false`.

- Passes when no cap extents or all immutable
- Warns when any lack immutability
- Message: mentions effective retention = job retention + immutability period + block gen period (10d Azure / 30d AWS)
- AffectedItems: `"extentName (SOBR: sobrName)"`

#### 7d. New: `validateArchiveTierEdition` (ruleId: `archive-tier-edition`)

Check `data.archExtents` for any with `ArchiveTierEnabled=true`.

- Passes when no active archive extents
- Warns when any active — recommends VDC Vault Advanced over Foundation
- AffectedItems: `"archExtentName (SOBR: sobrName)"`

#### 7e. New: `validateCapacityTierResidency` (ruleId: `capacity-tier-residency`)

Cross-references SOBRs, cap extents, arch extents, and jobs. Uses `parseGfsDetails()` from `src/lib/calculator-aggregator.ts`.

**Unified formula**: `residency = retentionDays - arrivalDay` where `arrivalDay` = 0 (copy mode) or `MovePeriodDays` (move-only). Immutability extends effective residency but flags cost impact.

**Algorithm per SOBR with `EnableCapacityTier=true`:**

1. Get cap extent(s) via `SobrName` lookup
2. Determine `arrivalDay`:
   - If any cap extent has `CopyModeEnabled=true`: `arrivalDay = 0` (data from day 1)
   - If move-only (`MoveModeEnabled=true`, `CopyModeEnabled` is false/null): `arrivalDay = MovePeriodDays ?? 0`
3. Determine `immutablePeriod = capExtent.ImmutablePeriod` (if `ImmutableEnabled=true`, else 0)
4. **Normal retention**: for each job where `job.RepoName === sobr.Name`:
   - If `RetainDays != null` and `RetainDays > arrivalDay`:
     - `retentionResidency = RetainDays - arrivalDay`
     - `effectiveResidency = max(retentionResidency, immutablePeriod)`
     - If `retentionResidency < 30`: flag with note about whether immutability covers the gap
   - If `RetainDays != null` and `RetainDays <= arrivalDay` (move-only): normal backups never reach capacity (skip for normal)
5. **GFS retention**: for each job with `GfsEnabled=true` and `GfsDetails`:
   - Parse with `parseGfsDetails(job.GfsDetails)`
   - Weekly: if `weekly != null` and `weekly * 7 > arrivalDay`:
     - `retentionResidency = weekly * 7 - arrivalDay`
     - `effectiveResidency = max(retentionResidency, immutablePeriod)`
     - If `retentionResidency < 30`: flag `"JobName: GFS weekly N days on capacity (needs 30+)"`
   - Monthly: same with `monthly * 30`
   - Yearly: same with `yearly * 365`
6. **Archive tier**: if SOBR has `ArchiveTierEnabled=true`:
   - For each arch extent with `RetentionPeriod != null`:
     - Archive can't move immutable data, so effective archive trigger = `max(RetentionPeriod, immutablePeriod)`
     - `archResidency = max(RetentionPeriod, immutablePeriod) - arrivalDay`
     - If `archResidency < 30`: flag `"sobrName: archive moves data after N days on capacity (needs 30+)"`

**affectedItems format**: descriptive strings like:

- `"JobName: normal retention 16 days on capacity (needs 30+)"` — retention too short
- `"JobName: normal retention 16 days, but immutability extends to 30 days (extra storage cost)"` — immutability covers gap
- `"JobName: GFS weekly 14 days on capacity (needs 30+)"`
- `"sobrName: archive moves data after 13 days on capacity (needs 30+)"`

Tests (15 total):

- No SOBRs -> pass
- Copy mode, sufficient retention -> pass
- Copy mode, insufficient retention -> warn (arrivalDay=0, residency=RetainDays < 30)
- Move-only, normal retention sufficient -> pass
- Move-only, normal retention insufficient -> warn
- Move-only, normal retention < movePeriod (never reaches capacity) -> skip normal check
- Move-only, GFS weekly insufficient -> warn
- Move-only, GFS monthly insufficient -> warn
- Move-only, archive pulls data too early -> warn
- Archive delayed by immutability (archRetentionPeriod < immutablePeriod) -> uses immutability as floor
- Immutability covers retention gap -> warn with cost note
- Immutability insufficient to cover gap -> warn without immutability note
- Null MovePeriodDays -> treated as 0
- Null RetentionPeriod -> skip archive check
- Mixed: some jobs flagged, some not

### Step 8: Update pipeline + constants tests

- `pipeline.test.ts`: change `toHaveLength(7)` to `toHaveLength(11)`
- `constants.test.ts`: update PIPELINE_STEPS count if asserted

## Backward Compatibility

- `NormalizedDataset` gains 3 arrays defaulting to `[]` — no existing consumer breaks
- `validateJobEncryption` unchanged when `data.sobr=[]` (Set is empty, `has()` always false)
- All 4 new rules pass when their input arrays are empty
- Only test updates: adding empty array defaults + length assertion changes

## Verification

1. `npm run test:run` — all 532 tests pass (477 existing + 55 new)
2. `npm run build` — TypeScript compiles clean
3. `npm run lint` — 0 errors

## Deviations from Original Plan

1. **Archive immutability informational note removed**: The original plan included an affectedItem format `"sobrName: archive delayed by immutability to 30 days, N days on capacity"` for when immutability delays the archive trigger enough to meet the 30-day minimum. During implementation, this was removed because when `archResidency >= 30` (the check passes), adding an informational item to `affectedItems` was semantically incorrect — the array should only contain items that need attention. The archive check now passes silently when immutability covers the gap.

2. **Additional test fixture files**: The plan only listed `normalizer.test.ts`, `validator.test.ts`, `pipeline.test.ts` for fixture updates, but the build revealed 4 additional files (`app.test.tsx`, `dashboard-view.test.tsx`, `domain-types.test.ts`, `use-analysis.test.ts`) also had inline `NormalizedDataset` objects needing the 3 new empty arrays.
