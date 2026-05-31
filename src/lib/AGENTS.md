# src/lib — Data Pipeline

Synchronous pipeline: raw JSON → parse → normalize → validate → results. Calculator aggregates sizing data from job metadata. Enrichment joins jobs with session data. Shared formatters for display. SOBR analysis validates capacity tier encryption, immutability, archive tier edition, and residency.

## STRUCTURE

```
lib/
├── agent-classifier.ts    # classifyAgentJobType(): centralised JobType naming knowledge for agent rules (pattern + legacy allow-list)
├── pipeline.ts            # Orchestrator: analyzeHealthcheck() → {data, validations}. Zips sobr/capextents/archextents sections
├── parser.ts              # zipSection(): Headers/Rows → Record[] (decoupled JSON format)
├── normalizer.ts          # Raw records → typed SafeJob/SafeBackupServer/SafeSobr/SafeCapExtent/SafeArchExtent/SafeJobSummary/etc. with error accumulation (highest complexity)
├── validator.ts           # 13 validation rules against NormalizedDataset. 8 original + 4 SOBR + 1 active-full rules
├── calculator-aggregator.ts # Vault sizing: source TB, change rates, retention, GFS aggregation
├── enrich-jobs.ts         # enrichJobs(): joins SafeJob[] with SafeJobSession[] via Map lookup
├── format-utils.ts        # Shared formatters: formatSize, formatPercent, formatDuration, formatTB, formatRatio
├── validation-selectors.ts  # Filter helpers: getBlockerValidations(), getPassingValidations(), hasBlockers(), getBlockerCount()
├── version-compare.ts    # isVersionAtLeast() — semver-like "12.1.2.456" comparison (ignores 4th segment)
├── constants.ts           # MINIMUM_VBR_VERSION ("12.1.2"), MINIMUM_RETENTION_DAYS (30), MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS (30), PIPELINE_STEPS
├── delay.ts               # tick(ms, signal) — abortable timer for visual step progression
└── utils.ts               # cn() — clsx + tailwind-merge (shadcn standard)
```

## DATA FLOW

```
HealthcheckRoot (raw JSON)
  → zipSection() per section (backupServer, securitySummary, jobInfo, jobSummary, sobr, extents, capextents, archextents, repos)
  → zipSection(jobSessionSummaryByJob) for session data
  → Licenses passed through directly (already objects)
  → normalizeHealthcheck() → NormalizedDataset + DataError[]
  → validateHealthcheck() → ValidationResult[] (13 rules)
  → buildCalculatorSummary() → CalculatorSummary (sizing aggregation)
  → enrichJobs() → EnrichedJob[] (jobs joined with session data)
```

## VALIDATION RULES (13 total)

| Rule ID                       | Type    | Description                                                                       |
| ----------------------------- | ------- | --------------------------------------------------------------------------------- |
| vbr-version                   | blocker | VBR must be 12.1.2+                                                               |
| config-backup-encryption      | warning | Config backup must be encrypted to use Vault; skipped if summary missing          |
| job-encryption                | blocker | All jobs must have encryption enabled                                             |
| aws-workload                  | blocker | Cannot target Vault directly                                                      |
| agent-standalone-unsupported  | blocker | Standalone agents must use Backup Copy to reach Vault                             |
| agent-policy-gateway-required | warning | Managed agent policies require a Gateway Server                                   |
| license-edition               | info    | Community Edition is supported by Vault; lacks SOBR                               |
| retention-period              | warning | Jobs should have 30+ day retention                                                |
| sobr-cap-encryption           | warning | Capacity tier must be encrypted                                                   |
| sobr-immutability             | warning | Capacity tier immutability must be enabled                                        |
| archive-tier-edition          | warning | Archive tier consumes egress — consider Advanced edition                          |
| capacity-tier-residency       | warning | Capacity tier residency must be 30+ days                                          |
| active-full-enabled           | warning | Jobs with Active Full enabled use more storage than the sizing calculator assumes |

## WHERE TO LOOK

| Need                     | File                     | Notes                                                                                                                        |
| ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Agent JobType classifier | agent-classifier.ts      | Pure pattern match for Windows/Linux/Mac Agent {Standalone,Policy,Backup} + legacy exact strings. Used by validator.ts only. |
| Add validation rule      | validator.ts             | Add function, append to return array in validateHealthcheck()                                                                |
| Change version minimum   | constants.ts             | MINIMUM_VBR_VERSION — tests reference this constant                                                                          |
| Change retention minimum | constants.ts             | MINIMUM_RETENTION_DAYS — used by validator + calculator                                                                      |
| Change residency minimum | constants.ts             | MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS — used by SOBR validator                                                                |
| Parse new section        | parser.ts                | zipSection() handles any Headers/Rows section                                                                                |
| Add normalized field     | normalizer.ts            | Add extraction + error accumulation using flatMap/buildError                                                                 |
| Add SOBR normalization   | normalizer.ts            | normalizeSobr(), normalizeCapExtent(), normalizeArchExtent() at bottom of file                                               |
| UI step labels           | constants.ts             | PIPELINE_STEPS — NOT 1:1 with validator ruleIds. Includes "sobr-analysis" step                                               |
| Filter validations       | validation-selectors.ts  | Blocker/passing splits consumed by dashboard components                                                                      |
| Vault sizing inputs      | calculator-aggregator.ts | buildCalculatorSummary() is main entry; 6 exported functions                                                                 |
| Join jobs + sessions     | enrich-jobs.ts           | enrichJobs() → EnrichedJob[] via Map<JobName, SafeJobSession>                                                                |
| Display formatting       | format-utils.ts          | formatSize (GB→TB/GB), formatPercent, formatDuration (DD.HH:MM:SS→human), formatTB, formatRatio                              |

## CONVENTIONS

- **Error accumulation**: Normalizer collects DataError[] instead of throwing. Invalid rows skipped via flatMap returning `[]`
- **No side effects** (with one documented exception): All functions pure. Pipeline runs synchronously. The exception is `validateHealthcheck()` emitting a single `console.warn` per call when a legacy agent JobType string is detected (deprecation signal for users on older veeam-healthcheck tool versions) — see the side-scan block in `validator.ts`
- **Version format**: "major.minor.patch.build" — only first 3 segments compared
- **tick()**: Used by useAnalysis hook for visual delays; accepts AbortSignal for cleanup on unmount/re-upload
- **PIPELINE_STEPS vs ruleIds**: Steps are presentation-layer groupings (e.g., "encryption" covers both "config-backup-encryption" and "job-encryption" rules; "sobr-analysis" covers 4 SOBR rules)
- **Calculator**: Aggregates from SafeJob[] and SafeJobSession[]; uses MINIMUM_RETENTION_DAYS from constants
- **Enrichment**: `enrichJobs()` builds Map<JobName, SafeJobSession> for O(1) lookup, returns EnrichedJob[] with null session for unmatched jobs
- **Formatters**: Pure functions. `formatSize()` returns `{ value, unit }` object for split display. `formatDuration()` parses `DD.HH:MM:SS` duration strings. `formatRatio()` renders numeric ratios as `"3.03x"` and returns an em-dash for `null`
- **SOBR normalization**: `normalizeSobr()`, `normalizeCapExtent()`, `normalizeArchExtent()` follow same flatMap + error accumulation pattern as job normalization

## ANTI-PATTERNS

| Pattern                          | Reason                                        |
| -------------------------------- | --------------------------------------------- |
| Throwing from normalizer         | Use DataError accumulation instead            |
| Async in pipeline.ts             | Pipeline is synchronous; async is in the hook |
| Hardcoded version strings        | Use MINIMUM_VBR_VERSION constant              |
| Hardcoded retention thresholds   | Use MINIMUM_RETENTION_DAYS constant           |
| Hardcoded residency thresholds   | Use MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS      |
| Adding PIPELINE_STEPS as ruleIds | Steps ≠ rules; they serve different purposes  |
