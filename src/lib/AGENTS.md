# src/lib — Data Pipeline

Synchronous pipeline: raw JSON → parse → normalize → validate → results. Calculator aggregates sizing data from job metadata. Enrichment joins jobs with session data. Shared formatters for display.

## STRUCTURE

```
lib/
├── pipeline.ts            # Orchestrator: analyzeHealthcheck() → {data, validations}
├── parser.ts              # zipSection(): Headers/Rows → Record[] (decoupled JSON format)
├── normalizer.ts          # Raw records → typed SafeJob/SafeBackupServer/etc. with error accumulation (375 lines, highest complexity)
├── validator.ts           # 7 validation rules against NormalizedDataset
├── calculator-aggregator.ts # Vault sizing: source TB, change rates, retention, GFS aggregation
├── enrich-jobs.ts         # enrichJobs(): joins SafeJob[] with SafeJobSession[] via Map lookup (19 lines)
├── format-utils.ts        # Shared formatters: formatSize, formatPercent, formatDuration, formatTB, formatCompressionRatio (54 lines)
├── validation-selectors.ts  # Filter helpers: getBlockerValidations(), getPassingValidations(), hasBlockers(), getBlockerCount()
├── version-compare.ts    # isVersionAtLeast() — semver-like "12.1.2.456" comparison (ignores 4th segment)
├── constants.ts           # MINIMUM_VBR_VERSION ("12.1.2"), MINIMUM_RETENTION_DAYS (30), PIPELINE_STEPS (presentation-only)
├── delay.ts               # tick(ms, signal) — abortable timer for visual step progression
└── utils.ts               # cn() — clsx + tailwind-merge (shadcn standard)
```

## DATA FLOW

```
HealthcheckRoot (raw JSON)
  → zipSection() per section (backupServer, securitySummary, jobInfo)
  → Licenses passed through directly (already objects)
  → normalizeHealthcheck() → NormalizedDataset + DataError[]
  → validateHealthcheck() → ValidationResult[]
  → buildCalculatorSummary() → CalculatorSummary (sizing aggregation)
  → enrichJobs() → EnrichedJob[] (jobs joined with session data)
```

## WHERE TO LOOK

| Need                     | File                     | Notes                                                                                                      |
| ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Add validation rule      | validator.ts             | Add function, append to return array in validateHealthcheck()                                              |
| Change version minimum   | constants.ts             | MINIMUM_VBR_VERSION — tests reference this constant                                                        |
| Change retention minimum | constants.ts             | MINIMUM_RETENTION_DAYS — used by validator + calculator                                                    |
| Parse new section        | parser.ts                | zipSection() handles any Headers/Rows section                                                              |
| Add normalized field     | normalizer.ts            | Add extraction + error accumulation using flatMap/buildError                                               |
| UI step labels           | constants.ts             | PIPELINE_STEPS — NOT 1:1 with validator ruleIds                                                            |
| Filter validations       | validation-selectors.ts  | Blocker/passing splits consumed by dashboard components                                                    |
| Vault sizing inputs      | calculator-aggregator.ts | buildCalculatorSummary() is main entry; 6 exported functions                                               |
| Join jobs + sessions     | enrich-jobs.ts           | enrichJobs() → EnrichedJob[] via Map<JobName, SafeJobSession>                                              |
| Display formatting       | format-utils.ts          | formatSize (GB→TB/GB), formatPercent, formatDuration (DD.HH:MM:SS→human), formatTB, formatCompressionRatio |

## CONVENTIONS

- **Error accumulation**: Normalizer collects DataError[] instead of throwing. Invalid rows skipped via flatMap returning `[]`
- **No side effects**: All functions pure. Pipeline runs synchronously
- **Version format**: "major.minor.patch.build" — only first 3 segments compared
- **tick()**: Used by useAnalysis hook for visual delays; accepts AbortSignal for cleanup on unmount/re-upload
- **PIPELINE_STEPS vs ruleIds**: Steps are presentation-layer groupings (e.g., "encryption" covers both "global-encryption" and "job-encryption" rules)
- **Calculator**: Aggregates from SafeJob[] and SafeJobSession[]; uses MINIMUM_RETENTION_DAYS from constants
- **Enrichment**: `enrichJobs()` builds Map<JobName, SafeJobSession> for O(1) lookup, returns EnrichedJob[] with null session for unmatched jobs
- **Formatters**: Pure functions. `formatSize()` returns `{ value, unit }` object for split display. `formatDuration()` parses `DD.HH:MM:SS` duration strings. `formatCompressionRatio()` handles divide-by-zero gracefully

## ANTI-PATTERNS

| Pattern                          | Reason                                        |
| -------------------------------- | --------------------------------------------- |
| Throwing from normalizer         | Use DataError accumulation instead            |
| Async in pipeline.ts             | Pipeline is synchronous; async is in the hook |
| Hardcoded version strings        | Use MINIMUM_VBR_VERSION constant              |
| Hardcoded retention thresholds   | Use MINIMUM_RETENTION_DAYS constant           |
| Adding PIPELINE_STEPS as ruleIds | Steps ≠ rules; they serve different purposes  |
