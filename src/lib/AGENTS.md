# src/lib — Logic Layer

Core is a synchronous pipeline: raw JSON → parse → normalize → validate → results. Around it sit several support modules that are **not** pure/synchronous by design: a network client for the Veeam sizing API, an IndexedDB persistence layer for recent scans, and file IO. Calculator/sizing modules aggregate and derive Vault sizing. SOBR analysis validates capacity tier encryption, immutability, archive tier edition, and residency.

## STRUCTURE

```
lib/
# Core pipeline (pure, synchronous)
├── pipeline.ts            # Orchestrator: analyzeHealthcheck() → {data, validations}. Zips sobr/capextents/archextents sections
├── parser.ts              # zipSection(): Headers/Rows → Record[] (decoupled JSON format)
├── normalizer.ts          # Raw records → typed SafeJob/SafeBackupServer/SafeSobr/SafeCapExtent/SafeArchExtent/SafeJobSummary/etc. with error accumulation (highest complexity)
├── validator.ts           # 13 validation rules against NormalizedDataset. 8 core + 4 SOBR + 1 active-full
├── agent-classifier.ts    # classifyAgentJobType(): centralized JobType naming knowledge for agent rules (pattern + legacy allow-list)
├── version-compare.ts     # isVersionAtLeast() — semver-like "12.1.2.456" comparison (ignores 4th segment)
├── constants.ts           # MINIMUM_VBR_VERSION ("12.1.2"), MINIMUM_RETENTION_DAYS (30), MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS (30), PIPELINE_STEPS
├── validation-selectors.ts # Filter helpers: getBlockerValidations(), getPassingValidations(), getNoteValidations(), hasBlockers(), getBlockerCount()
├── enrich-jobs.ts         # enrichJobs(): joins SafeJob[] with SafeJobSession[] via Map lookup
├── format-utils.ts        # Shared formatters: formatSize, formatPercent, formatDuration, formatTB, formatRatio, formatGFS
├── relative-time.ts       # formatRelativeTime(iso): "2 hours ago" / calendar-day-aware relative strings
├── delay.ts               # tick(ms, signal) — abortable timer for visual step progression
└── utils.ts               # cn() — clsx + tailwind-merge (shadcn standard)
# Sizing / calculator
├── calculator-aggregator.ts # Vault sizing inputs: source TB, change rates, retention, GFS aggregation; cap helpers (capGfs, globalCapDays)
├── sizing-derivation.ts   # deriveSizing(VmAgentResponseData) → DerivedSizing (GFS buckets, immutability overhead, composition)
├── sizing-buffer.ts       # Applies headroom buffer (bufferFactor) to DerivedSizing and growth series
├── growth-projector.ts    # generateGrowthSeries() — async: multi-year projection (calls Veeam API per year)
├── chart-selectors.ts     # groupByJobType, bucketChangeRates, repoImmutabilityCounts, groupByRepo — chart data shapes
├── repo-aggregator.ts     # aggregateRepoStatsMap(): per-repo source/on-disk TB rollups
# Network client (async, side-effectful)
├── veeam-api.ts           # buildVmAgentRequest() + callVmAgentApi() — async fetch to /api/veeam-proxy
# Persistence / recent scans
├── indexed-db.ts          # async IndexedDB CRUD for recent scans (saveScan/getRecentScans/loadScanPayload/deleteScan); FIFO-capped at MAX_SCANS (5)
├── recent-scans-fifo.ts   # selectIdsToEvict() — pure FIFO eviction policy used by indexed-db
└── file-reader.ts         # readFileAsText(File) — async FileReader wrapper (Promise)
```

## DATA FLOW

```
HealthcheckRoot (raw JSON)                       [pipeline.ts, synchronous]
  → zipSection() per section (backupServer, securitySummary, jobInfo, jobSummary, sobr, extents, capextents, archextents, repos)
  → zipSection(jobSessionSummaryByJob) for session data
  → Licenses passed through directly (already objects)
  → normalizeHealthcheck() → NormalizedDataset + DataError[]
  → validateHealthcheck() → ValidationResult[] (13 rules)
  → buildCalculatorSummary() → CalculatorSummary (sizing aggregation)
  → enrichJobs() → EnrichedJob[] (jobs joined with session data)

Sizing tab (opt-in, async, consent-gated):
  buildVmAgentRequest(summary, settings) → callVmAgentApi() → /api/veeam-proxy
  → deriveSizing() → applyBufferToSizing() → SizingResults UI
  → generateGrowthSeries() for multi-year projection

Recent scans (async, browser-only):
  readFileAsText(file) → analyzeHealthcheck() → saveScan() (IndexedDB, FIFO-capped)
  getRecentScans()/loadScanPayload() on the upload screen
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
| Validation rules         | validator.ts             | Add function, append to return array in validateHealthcheck()                                                                |
| Version minimum          | constants.ts             | MINIMUM_VBR_VERSION — tests reference this constant                                                                          |
| Retention minimum        | constants.ts             | MINIMUM_RETENTION_DAYS — used by validator + calculator                                                                      |
| Residency minimum        | constants.ts             | MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS — used by SOBR validator                                                                |
| New section parsing      | parser.ts                | zipSection() handles any Headers/Rows section                                                                                |
| Normalized fields        | normalizer.ts            | Add extraction + error accumulation using flatMap/buildError                                                                 |
| SOBR normalization       | normalizer.ts            | normalizeSobr(), normalizeCapExtent(), normalizeArchExtent() at bottom of file                                               |
| UI step labels           | constants.ts             | PIPELINE_STEPS — NOT 1:1 with validator ruleIds. Includes "sobr-analysis" step                                               |
| Validation filters       | validation-selectors.ts  | Blocker/passing splits consumed by dashboard components                                                                      |
| Vault sizing inputs      | calculator-aggregator.ts | buildCalculatorSummary() is main entry; plus capGfs / globalCapDays cap helpers                                              |
| Sizing derivation        | sizing-derivation.ts     | deriveSizing() turns VmAgentResponseData into GFS/immutability/buffer composition                                            |
| Headroom buffer          | sizing-buffer.ts         | bufferFactor(pct); applyBufferToSizing / applyBufferToSeries                                                                 |
| Multi-year projection    | growth-projector.ts      | generateGrowthSeries() — async, calls veeam-api per projected year                                                           |
| Veeam sizing API         | veeam-api.ts             | buildVmAgentRequest() + callVmAgentApi() → /api/veeam-proxy (consent-gated)                                                  |
| Chart data shapes        | chart-selectors.ts       | groupByJobType, bucketChangeRates, repoImmutabilityCounts, groupByRepo                                                       |
| Per-repo rollups         | repo-aggregator.ts       | aggregateRepoStatsMap(jobs, filter?) → Map<repo, {sourceTB,onDiskTB}>                                                        |
| Scan persistence         | indexed-db.ts            | saveScan/getRecentScans/loadScanPayload/deleteScan; StoredScan shape; MAX_SCANS=5                                            |
| Scan eviction policy     | recent-scans-fifo.ts     | selectIdsToEvict(existingIds, maxKeep) — pure, unit-tested separately from IndexedDB                                         |
| File reading             | file-reader.ts           | readFileAsText(File): Promise<string>                                                                                        |
| Job + session join       | enrich-jobs.ts           | enrichJobs() → EnrichedJob[] via Map<JobName, SafeJobSession>                                                                |
| Display formatting       | format-utils.ts          | formatSize, formatPercent, formatDuration, formatTB, formatRatio, formatGFS                                                  |
| Relative timestamps      | relative-time.ts         | formatRelativeTime(iso) for recent-scans list                                                                                |

## CONVENTIONS

- **Two zones, different rules**: The **core pipeline** (parser, normalizer, validator, pipeline, version-compare, agent-classifier, selectors, formatters, constants) is pure and synchronous. The **support modules** (`veeam-api`, `indexed-db`, `file-reader`, and the async `growth-projector`) are intentionally side-effectful/async — network, browser storage, and file IO. Keep the network/IO contained to those modules; don't push it into the pipeline.
- **Error accumulation**: Normalizer collects DataError[] instead of throwing. Invalid rows skipped via flatMap returning `[]`
- **Pipeline side effect (documented)**: `validateHealthcheck()` emits a single `console.warn` per call when a legacy agent JobType string is detected (deprecation signal for older veeam-healthcheck tool versions) — see the side-scan block in `validator.ts`. This is the only side effect in the otherwise-pure pipeline.
- **Version format**: "major.minor.patch.build" — only first 3 segments compared
- **tick()**: Used by useAnalysis hook for visual delays; accepts AbortSignal for cleanup on unmount/re-upload
- **PIPELINE_STEPS vs ruleIds**: Steps are presentation-layer groupings (e.g., "encryption" covers both "config-backup-encryption" and "job-encryption" rules; "sobr-analysis" covers 4 SOBR rules)
- **Calculator/sizing**: `calculator-aggregator` builds API inputs from SafeJob[]/SafeJobSession[]; `sizing-derivation` interprets the API response; `sizing-buffer` applies headroom; `growth-projector` projects across years. Caps come from constants and user settings.
- **Outbound calls**: Only `veeam-api.ts` calls `fetch`, only to `/api/veeam-proxy`, only after consent. No other module performs network IO.
- **Persistence**: IndexedDB access is confined to `indexed-db.ts`; the FIFO eviction rule is split into pure `recent-scans-fifo.ts` so it can be unit-tested without a DB.
- **Enrichment**: `enrichJobs()` builds Map<JobName, SafeJobSession> for O(1) lookup, returns EnrichedJob[] with null session for unmatched jobs
- **Formatters**: Pure functions. `formatSize()` returns `{ value, unit }`. `formatDuration()` parses `DD.HH:MM:SS`. `formatRatio()` renders `"3.03x"` and an em-dash for `null`
- **SOBR normalization**: `normalizeSobr()`, `normalizeCapExtent()`, `normalizeArchExtent()` follow the same flatMap + error accumulation pattern as job normalization

## ANTI-PATTERNS

| Pattern                                | Reason                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Throwing from normalizer               | Use DataError accumulation instead                                            |
| Async or fetch in pipeline.ts          | Pipeline is synchronous; network/IO lives in veeam-api/indexed-db/file-reader |
| `fetch` outside veeam-api.ts           | All outbound calls go through veeam-api → /api/veeam-proxy, consent-gated     |
| IndexedDB access outside indexed-db.ts | Keep persistence contained; keep eviction logic pure in recent-scans-fifo     |
| Hardcoded version strings              | Use MINIMUM_VBR_VERSION constant                                              |
| Hardcoded retention thresholds         | Use MINIMUM_RETENTION_DAYS constant                                           |
| Hardcoded residency thresholds         | Use MINIMUM_CAPACITY_TIER_RESIDENCY_DAYS                                      |
| Adding PIPELINE_STEPS as ruleIds       | Steps ≠ rules; they serve different purposes                                  |
