# Product Requirements Document (PRD) v1

**Project Name:** VDC Vault Readiness Analyzer (MVP)
**Target Audience:** Veeam SEs, Partners, Customers
**Hosting:** Cloudflare Pages (Free Tier)
**Architecture:** Client-Side Single Page Application (SPA)

## 1. Executive Summary

A static, client-side web application that parses a Veeam Healthcheck JSON file to validate if a Veeam Backup & Replication (VBR) environment is ready to integrate with Veeam Data Cloud (VDC) Vault. It parses the JSON locally and runs specific "Pre-Flight" checks based on VDC Vault limitations (encryption, workload support, versions).

## 2. Technical Stack (Strict Version Locking)

The project **MUST** use the following specific versions.

- **Build Tool:** Vite `v7.3.1` (React + TypeScript)
- **Language:** TypeScript `v5.9.3`
- **Styling:** Tailwind CSS `v4.1.18`
- **UI Components:** shadcn/ui `v3.8.3`
- **Icons:** lucide-react `v0.563.0`
- **Data Grid:** @tanstack/react-table `v8.21.3`
- **Visualization:** recharts `v3.7.0`

## 3. Data Parsing & Transformation

The Healthcheck JSON uses a decoupled format (`Headers` array + `Rows` arrays). The app must normalize this.

- **Requirement:** Create a utility function `zipSection(section)` that maps headers to rows.
- _Input:_ `Headers: ["Name", "Encrypted"]`, `Rows: [["Job A", "False"]]`
- _Output:_ `[{ "Name": "Job A", "Encrypted": "False" }]`

## 4. The Logic Engine (Detailed Rules)

The application must loop through the parsed data and apply the following rules.

### Rule 1: VBR Version Compatibility

- **Source:** `Sections.backupServer` -> `Version`
- **Logic:** Parse version string (e.g., "12.1.0.123").
- **Constraint:** Must be **12.1.2** or higher (Major 12, Minor 1, Build >= 2).
- **Failure Output:** 🔴 "VBR Version [X] is too old. Upgrade to 12.1.2+ to use Vault."

### Rule 2: Global Encryption Check

- **Source:** `Sections.securitySummary`
- **Logic:** Check `BackupFileEncryptionEnabled` AND `ConfigBackupEncryptionEnabled`.
- **Constraint:** Both must be "True".
- **Warning Output:** 🟡 "Global encryption is disabled. VDC Vault requires all data to be encrypted. Best practice is to enable this globally."

### Rule 3: Job Encryption Audit (Critical)

- **Source:** `Sections.jobInfo`
- **Logic:** Iterate through all objects. Check column `Encrypted`.
- **Constraint:** `Encrypted` must be "True".
- **Failure Output:** 🔴 "[Job Name] is unencrypted. Vault requires source-side encryption. You must enable encryption on this job or use an encrypted Backup Copy Job."
- **Note:** This is the most common blocker.

### Rule 4: Unsupported Workloads (AWS)

- **Source:** `Sections.jobInfo` -> `JobType`
- **Logic:** Check if `JobType` == "Veeam.Vault.AWS" (or similar AWS plug-in types).
- **Constraint:** VDC Vault cannot be a target for Veeam Backup for AWS.
- **Failure Output:** 🔴 "Job [Name] (AWS) cannot target Vault directly."

### Rule 5: Agent Gateway Requirement

- **Source:** `Sections.jobInfo` -> `JobType`
- **Logic:** Check if `JobType` contains "Agent" (e.g., `EpAgentBackup`, `Agent Backup`).
- **Constraint:** Agents cannot write directly to object storage without a Gateway Server.
- **Warning Output:** 🟡 "Job [Name] is an Agent backup. Ensure you configure a Gateway Server or use Cloud Connect, as Agents cannot write directly to Vault."

### Rule 6: License/Edition Check

- **Source:** `Licenses`
- **Logic:** Check `Edition`.
- **Constraint:** If Edition is "Community" or "Free".
- **Informational Output:** ℹ️ "Community Edition detected. Ensure you are aware of SOBR limitations when designing your Vault strategy."

### Rule 7: Retention Period Check

- **Source:** `Sections.jobInfo` → `RetainDays`
- **Logic:** Check if any job has `RetainDays` below 30.
- **Constraint:** VDC Vault enforces a 30-day minimum retention period. Jobs with lower retention will be subject to the 30-day minimum lock.
- **Warning Output:** 🟡 "VDC Vault enforces a 30-day minimum retention period. The following jobs have retention set below this minimum and will be subject to the 30-day minimum lock."

### SOBR Rules

The following rules apply when Scale-Out Backup Repository (SOBR) configurations are present in the healthcheck data.

### Rule 8: Capacity Tier Encryption

- **Source:** `Sections.capextents` → `EncryptionEnabled`, cross-referenced with `Sections.sobr`
- **Logic:** Check that all capacity tier extents have encryption enabled. If capacity tier is configured on a SOBR but extent data is missing, warn that verification is not possible.
- **Constraint:** VDC Vault requires encryption on capacity tier data.
- **Warning Output:** 🟡 "Capacity tier extents without encryption detected. VDC Vault requires encryption on capacity tier data."

### Rule 9: Capacity Tier Immutability

- **Source:** `Sections.capextents` → `ImmutableEnabled`, cross-referenced with `Sections.sobr`
- **Logic:** Check that all capacity tier extents have immutability enabled. If extent data is missing, warn. Immutability increases effective retention by the immutability period plus block generation period (10 days for Azure, 30 days for AWS).
- **Constraint:** VDC Vault enforces immutability on capacity tier data.
- **Warning Output:** 🟡 "Capacity tier extents without immutability detected. VDC Vault enforces immutability, which increases effective retention."

### Rule 10: Archive Tier Edition Requirement

- **Source:** `Sections.archextents` → `ArchiveTierEnabled`, cross-referenced with `Sections.sobr`
- **Logic:** Detect active archive tier configurations. VDC Vault Foundation has a 20% fair usage limit on egress that archiving consumes. If extent data is missing but SOBR has archive enabled, warn.
- **Constraint:** Archive tier workloads should use VDC Vault Advanced.
- **Warning Output:** 🟡 "Archive tier is configured. VDC Vault Foundation has a 20% fair usage limit on egress that archiving consumes. Consider VDC Vault Advanced."

### Rule 11: Capacity Tier Residency

- **Source:** `Sections.sobr`, `Sections.capextents`, `Sections.archextents`, `Sections.jobInfo`
- **Logic:** For each SOBR with capacity tier enabled, resolve arrival day and immutability period from capacity extent data. Then verify that all jobs targeting that SOBR have sufficient normal retention and GFS retention to meet the minimum residency period, accounting for archive threshold if archive tier is enabled.
- **Constraint:** Data must remain on capacity tier for at least 30 days.
- **Warning Output:** 🟡 "Data must remain on capacity tier for at least 30 days. The following items have insufficient residency."

## 5. UI Specifications

### 5.1. Application Shell

- **Experimental Banner:** A top-level `Alert` banner indicating the tool is experimental/in development.
- **State Machine:** The app transitions through `idle` → `processing` → `success`/`error` states, with distinct UI for each.
- **Motion System:** All animations use the `motion-safe:` prefix to respect `prefers-reduced-motion`. Custom keyframes for attention pulse, success ring, drag pulse, and error shake.

### 5.2. File Upload (Idle State)

- **Drop Zone:** Drag-and-drop, click, or keyboard-accessible file input.
- **Error Display:** Shake animation on invalid file with error message.

### 5.3. Processing State

- **Checklist Loader:** Animated step checklist with progress bar showing pipeline stages (parse, version, encryption, AWS, agents, license, SOBR analysis).

### 5.4. Dashboard Layout (Success State)

- **Three Tabs:** Overview, Job Explorer, Vault Sizing.
- **Summary Cards:** VBR Version (with compatibility badge), Total Jobs, Readiness Score (Pass/Fail/Warn). Stagger entrance animation.
- **Reset Button:** Returns to idle state for re-upload.

### 5.5. Overview Tab

- **Blockers Section (The "Action List"):**
  - A high-visibility list of Red/Yellow alerts derived from the validation rules.
  - Sorted by Severity (🔴 fail first, then 🟡 warning).
  - Affected items listed per blocker, truncated at 5 with "+ N more" overflow.
- **Success Celebration:** When no blockers exist, displays a ring animation with stagger fade-in and a "View Job Details" call-to-action.
- **Passing Checks List:** Displays all passed validations with check icons and stagger animation.

### 5.6. Job Explorer Tab

A detailed TanStack table for deep-diving.

- **Columns:**
  - **Status** (Icon: pass/fail/warn indicator)
  - **Job Name** (Sortable)
  - **Type** (Workload type)
  - **Repository** (Target repository name)
  - **Source Size** (Formatted GB/TB)
  - **Change Rate** (Color-coded: red >50%, amber 10-50%, default <10%)
  - **GFS** (Weekly/Monthly/Yearly retention points)
  - **Encrypted** (Icon: Lock=Green, Open=Red)

- **Features:**
  - Search bar to filter by Job Name.
  - Column sorting.
  - Pagination.
  - Row click opens Job Detail Sheet.

### 5.7. Job Detail Sheet

A right-side slide-out `Sheet` panel showing full job details.

- **Sections:**
  - **Storage:** Source size, change rate, compression ratio.
  - **Protection:** Retention days, GFS points, encryption status.
  - **Configuration:** Job type, repository, algorithm, schedule.
  - **Session:** Latest session duration, status, success rate.

### 5.8. Vault Sizing Tab

- **Calculator Inputs:** Displays aggregated sizing data from job metadata.
  - Total source TB across all jobs.
  - Average daily change rate.
  - Retention period summary.
  - GFS retention point aggregation.
