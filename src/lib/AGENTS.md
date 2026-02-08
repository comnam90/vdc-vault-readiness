# src/lib — Data Pipeline

Synchronous pipeline: raw JSON → parse → normalize → validate → results.

## STRUCTURE

```
lib/
├── pipeline.ts       # Orchestrator: analyzeHealthcheck() → {data, validations}
├── parser.ts         # zipSection(): Headers/Rows → Record[] (decoupled JSON format)
├── normalizer.ts     # Raw records → typed SafeJob/SafeBackupServer/etc. with error accumulation
├── validator.ts      # 6 validation rules against NormalizedDataset
├── version-compare.ts # isVersionAtLeast() — semver-like "12.1.2.456" comparison (ignores 4th segment)
├── constants.ts      # MINIMUM_VBR_VERSION ("12.1.2"), PIPELINE_STEPS (presentation-only)
├── delay.ts          # tick(ms, signal) — abortable timer for visual step progression
└── utils.ts          # cn() — clsx + tailwind-merge (shadcn standard)
```

## DATA FLOW

```
HealthcheckRoot (raw JSON)
  → zipSection() per section (backupServer, securitySummary, jobInfo)
  → Licenses passed through directly (already objects)
  → normalizeHealthcheck() → NormalizedDataset + DataError[]
  → validateHealthcheck() → ValidationResult[]
```

## WHERE TO LOOK

| Need                   | File          | Notes                                                         |
| ---------------------- | ------------- | ------------------------------------------------------------- |
| Add validation rule    | validator.ts  | Add function, append to return array in validateHealthcheck() |
| Change version minimum | constants.ts  | MINIMUM_VBR_VERSION — tests reference this constant           |
| Parse new section      | parser.ts     | zipSection() handles any Headers/Rows section                 |
| Add normalized field   | normalizer.ts | Add extraction + error accumulation using flatMap/buildError  |
| UI step labels         | constants.ts  | PIPELINE_STEPS — NOT 1:1 with validator ruleIds               |

## CONVENTIONS

- **Error accumulation**: Normalizer collects DataError[] instead of throwing. Invalid rows skipped via flatMap returning `[]`
- **No side effects**: All functions pure. Pipeline runs synchronously
- **Version format**: "major.minor.patch.build" — only first 3 segments compared
- **tick()**: Used by useAnalysis hook for visual delays; accepts AbortSignal for cleanup on unmount/re-upload
- **PIPELINE_STEPS vs ruleIds**: Steps are presentation-layer groupings (e.g., "encryption" covers both "global-encryption" and "job-encryption" rules)

## ANTI-PATTERNS

| Pattern                          | Reason                                        |
| -------------------------------- | --------------------------------------------- |
| Throwing from normalizer         | Use DataError accumulation instead            |
| Async in pipeline.ts             | Pipeline is synchronous; async is in the hook |
| Hardcoded version strings        | Use MINIMUM_VBR_VERSION constant              |
| Adding PIPELINE_STEPS as ruleIds | Steps ≠ rules; they serve different purposes  |
