# ADR 0003: Cloud plug-in policies and cloud-native jobs

- **Status:** Accepted
- **Date:** 2026-11-27
- **Branch:** fix/100-cloud-plugin-policies
- **Spec:** #96 (evidence in #94)

## Context

A VBR server that runs the Veeam Backup for AWS, Azure or Google Cloud plug-ins exports those policies in `jobInfo` with an empty `RepoName`. They write to storage managed by the cloud appliance, not to a VBR repository. The normalizer treated `RepoName` as required, so it dropped every one of them as a data error. On a VBR 13.1.1 export, 17 of 22 jobs disappeared from the Jobs tab, sizing and every rule, and nothing on screen said so.

Older exports carry the same policies under the raw JobType `VmbApiPolicyTempJob`. Upstream defines that as the parent type for every VM Backup API plug-in: AWS, Azure and GCE, but also Proxmox VE, Nutanix AHV and HPE Morpheus, whose jobs do write to VBR repositories.

`Platform` is empty on every `jobInfo` row in current exports, so it can't identify these jobs.

## Decision

### Two definitions

- A **cloud plug-in job type** is a friendly `AWS … Backup`, `Azure … Backup`, `GCE Backup` or `Google … Backup` label (matched case-insensitively), or the legacy raw `VmbApiPolicyTempJob`. Proxmox, AHV and Morpheus friendly labels are not included. It answers yes or no and doesn't say which cloud. Code: `isCloudPluginJobType()` in `src/lib/job-type-filter.ts`.
- A **cloud-native job** has a cloud plug-in job type **and** no repository. Code: `isCloudNativeJob()` in the same module.

Rules and sizing use the job-level definition, never the type predicate on its own. The legacy raw type is ambiguous, so a `VmbApiPolicyTempJob` row that has a repository stays an ordinary job: it may be a Proxmox, AHV or Morpheus job, and its encryption and change-rate data are real.

Both live next to `isExcludedJobType()`, so every rule about what a JobType string means sits in one module.

### `null` means "no VBR repository"

`SafeJob.RepoName` is `string | null` (#98). The normalizer accepts a missing `RepoName`, as `null`, for cloud plug-in job types only. Every other type still records `Missing required RepoName` and drops the row, so genuinely broken rows are still caught.

We rejected a sentinel string such as `"(cloud-native)"`: it could collide with a real repository name, and the compiler wouldn't flag consumers that treat it as a repository. With `null`, the type change makes every consumer handle the case.

Consequences:

- The Jobs tab shows the repository as "Cloud-native" (`formatRepoName()`), and the repository filter can select it.
- Per-repository aggregations (size-by-repository chart, Repositories tab) leave these jobs out, so those views only describe VBR repositories.
- Sizing's total source TB includes cloud-native jobs' `SourceSizeGB`.

### The exported fields aren't reliable for these jobs

The upstream veeam-healthcheck collector reads every `jobInfo` row through VBR's generic job object, which doesn't know about the cloud appliance:

- **Retention, GFS and `Encrypted`** come from VBR's generic job storage options, not from the appliance's policy. The real encryption is set in the appliance (when sending directly to Vault) or on a backup copy job.
- **The repository** comes from a lookup by `TargetRepositoryId`, which never matches appliance-managed storage. Hence the empty `RepoName`.
- **`0`** is the collector's fallback for "not collected" in change rate, data size and source size. Every plug-in session in the 13.1.1 export reports `AvgChangeRate` 0.

For now, retention and GFS are kept as exported (#104 will check them against a lab). How the encryption rule and the sizing change rate treat cloud-native jobs is decided in #101 and #102.

## Considered options

- **Keep dropping them, but show `dataErrors`.** Rejected: these workloads are in scope for Vault (directly, or through a backup copy job) and must count towards sizing. They aren't a data-quality problem. Showing `dataErrors` is tracked separately (#103).
- **Treat every `VmbApiPolicyTempJob` row as cloud-native.** Rejected: legacy rows with a repository may be Proxmox, AHV or Morpheus jobs.
