# Product Requirements Document (PRD) v1

**Project Name:** VDC Vault Readiness Analyzer (MVP)
**Target Audience:** Veeam SEs, Partners, Customers
**Hosting:** Cloudflare Pages (Free Tier)
**Architecture:** Client-Side Single Page Application (SPA)

## 1. Executive Summary

A static, client-side web application that parses a Veeam Healthcheck JSON file to validate if a Veeam Backup & Replication (VBR) environment is ready to integrate with Veeam Data Cloud (VDC) Vault. It parses the JSON locally and runs specific "Pre-Flight" checks based on VDC Vault limitations (encryption, workload support, versions).

## 2. Technical Stack (Strict Version Locking)

The project **MUST** use the following specific versions.

* **Build Tool:** Vite `v7.3.1` (React + TypeScript)
* **Language:** TypeScript `v5.9.3`
* **Styling:** Tailwind CSS `v4.1.18`
* **UI Components:** shadcn/ui `v3.8.3`
* **Icons:** lucide-react `v0.563.1`
* **Data Grid:** @tanstack/react-table `v8.21.3`
* **Visualization:** recharts `v3.7.0`

## 3. Data Parsing & Transformation

The Healthcheck JSON uses a decoupled format (`Headers` array + `Rows` arrays). The app must normalize this.

* **Requirement:** Create a utility function `zipSection(section)` that maps headers to rows.
* *Input:* `Headers: ["Name", "Encrypted"]`, `Rows: [["Job A", "False"]]`
* *Output:* `[{ "Name": "Job A", "Encrypted": "False" }]`



## 4. The Logic Engine (Detailed Rules)

The application must loop through the parsed data and apply the following rules.

### Rule 1: VBR Version Compatibility

* **Source:** `Sections.backupServer` -> `Version`
* **Logic:** Parse version string (e.g., "12.1.0.123").
* **Constraint:** Must be **12.1.2** or higher (Major 12, Minor 1, Build >= 2).
* **Failure Output:** 🔴 "VBR Version [X] is too old. Upgrade to 12.1.2+ to use Vault."

### Rule 2: Global Encryption Check

* **Source:** `Sections.securitySummary`
* **Logic:** Check `BackupFileEncryptionEnabled` AND `ConfigBackupEncryptionEnabled`.
* **Constraint:** Both must be "True".
* **Warning Output:** 🟡 "Global encryption is disabled. VDC Vault requires all data to be encrypted. Best practice is to enable this globally."

### Rule 3: Job Encryption Audit (Critical)

* **Source:** `Sections.jobInfo`
* **Logic:** Iterate through all objects. Check column `Encrypted`.
* **Constraint:** `Encrypted` must be "True".
* **Failure Output:** 🔴 "[Job Name] is unencrypted. Vault requires source-side encryption. You must enable encryption on this job or use an encrypted Backup Copy Job."
* **Note:** This is the most common blocker.

### Rule 4: Unsupported Workloads (AWS)

* **Source:** `Sections.jobInfo` -> `JobType`
* **Logic:** Check if `JobType` == "Veeam.Vault.AWS" (or similar AWS plug-in types).
* **Constraint:** VDC Vault cannot be a target for Veeam Backup for AWS.
* **Failure Output:** 🔴 "Job [Name] (AWS) cannot target Vault directly."

### Rule 5: Agent Gateway Requirement

* **Source:** `Sections.jobInfo` -> `JobType`
* **Logic:** Check if `JobType` contains "Agent" (e.g., `EpAgentBackup`, `Agent Backup`).
* **Constraint:** Agents cannot write directly to object storage without a Gateway Server.
* **Warning Output:** 🟡 "Job [Name] is an Agent backup. Ensure you configure a Gateway Server or use Cloud Connect, as Agents cannot write directly to Vault."

### Rule 6: License/Edition Check

* **Source:** `Licenses`
* **Logic:** Check `Edition`.
* **Constraint:** If Edition is "Community" or "Free".
* **Informational Output:** ℹ️ "Community Edition detected. Ensure you are aware of SOBR limitations when designing your Vault strategy."

## 5. UI Specifications

### 5.1. Dashboard Layout

* **Summary Card:**
* **Readiness Score:** (Pass/Fail/Warn)
* **Key Metrics:** Total Jobs, Blockers Found, VBR Version.


* **Blockers Section (The "Action List"):**
* A high-visibility list of Red/Yellow alerts derived from the rules above.
* Sorted by Severity (Red first).



### 5.2. Job Explorer Table

A detailed TanStack table for deep-diving.

* **Columns:**
* **Job Name** (Sortable)
* **Type** (Workload type)
* **Encryption** (Icon: Lock=Green, Open=Red)
* **Status** (Derived from logic: "Ready", "Needs Encryption", "Unsupported")


* **Feature:** Search bar to filter by Job Name.

