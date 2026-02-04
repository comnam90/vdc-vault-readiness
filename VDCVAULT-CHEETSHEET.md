# Veeam Data Cloud Vault (Vault) Cheatsheet

**Target Audience:** Veeam Systems Engineers (SEs)  
**Goal:** A quick field guide for pre-sales design. Focus on the deal-breakers, unsupported setups, and the stuff that usually causes support tickets.

---

## Watch Out: The Red Flags

*   **No AWS Backup Support:** You can't use VDC Vault as a target for Veeam Backup for AWS. Period.
    *   [Source](https://helpcenter.veeam.com/docs/vdc/userguide/vault_integration.html)
*   **Agents Can't Go Direct:** Veeam Agents won't talk directly to Vault. You have to route them through a **Gateway Server (VBR)** or **Cloud Connect**.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)
*   **Veeam Backup for Azure (Restore Gaps):** If Vault is your target, you're losing several restore options:
    *   No Instant Recovery, Guest File Restore, or App Restore.
    *   No Disk Export or Cross-Platform Restores.
    *   *Need these?* Stick to a standard Azure Repository for now.
    *   [Source](https://helpcenter.veeam.com/docs/vbazure/guide/limitations.html)
    > [!NOTE]
    > **The Fix:** Most of this should be cleared up in **v13.1**. If you're stuck today, ask Support to "Enable Shared Key Access." This lets you add the Vault as an **Azure External Repository**, which unlocks the missing features.
*   **Seeding is Out:** Azure Data Box seeding to Vault isn't supported.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)
*   **"Move/Copy" is Blocked for Unencrypted Data:** You can't use the standard "Move Backup" or "Copy Backup" features to migrate unencrypted data to Vault. Vault requires encryption, and those tasks can't encrypt on the fly.
    *   **The Workaround:** Run a **Backup Copy Job** and enable encryption there, or create a **SOBR** and enable Capacity tier encryption there.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)

---

## Edition Differences

*   [Source: Veeam Data Cloud Vault Editions](https://helpcenter.veeam.com/docs/vdc/userguide/vault_vbr_integration.html)

| Feature | Azure Edition | AWS Edition |
| :--- | :--- | :--- |
| **VBR Connection** | Login via the "Veeam Data Cloud Vault" wizard. | Manual setup via the "Amazon S3" wizard. |
| **Vault Selection** | Dropdown menu selection. | **Manual** (Must type name to match "Vault ID"). |
| **Access Management** | Mostly via VDC UI. | Manual Key management (Access/Secret). |
| **Immutability** | Enabled automatically. | Manual toggle in VBR settings (still enforced). |
| **Block Generation**| +10 Days (Total = Policy + 10). | +30 Days (Total = Policy + 30). |
| **Encryption** | **Enforced** for Jobs and SOBR. | Manual toggle (Not enforced by VBR). |
| **Backend** | Azure Blob (Cool Tier). | AWS S3 (Infrequent Access). |
| **Min. Retention** | 30 Days. | 30 Days. |

> [!IMPORTANT]
> **AWS Billing Tip:** When adding the AWS edition to VBR, manually select the **Infrequent Access** storage class. If you miss this, the customer is going to get a surprise bill.

---

## Security Hard-Requirements

*   **Encryption is Non-Negotiable:** Everything targeting Vault must be encrypted.
    *   Enable it at the job level (VBR) or the Capacity Tier level.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)
*   **30-Day Immutability:** This is on by default and you can't turn it off. You can't delete data before it expires, though you can extend the lock if needed.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)

---

## Actual Retention: v12 vs. v13 Logic

v13 overhauled the immutability math to stop surprising customers with massive storage bills and "invisible" data.

*   **v12 Logic (The "Stacking" Problem):**
    *   **Formula:** `Job Retention + Repo Immutability + Block Gen`.
    *   **The Pain:** Immutability was added *on top* of job retention. A 30-day job with a 30-day lock meant 60+ days of storage bills.
    *   **Ghost Data:** Once job retention ended, restore points vanished from the UI but stayed locked and billable. You had to use PowerShell to see them.

*   **v13 "Smart" Logic (Concurrent Locking):**
    1.  **Match Job Duration:** Lock = `max(Job Retention, Repo Min) + Block Gen`. The lock and retention run in parallel.
    2.  **Repo Minimum Only:** Lock = `Repo Setting + Block Gen`. Job retention is ignored for the lock calculation.
    *   **The Win:** Both options prevent the accidental "doubling" of storage costs seen in v12.

*   **The SOBR Trap:** Scale-Out Repositories miss out on the new math. Capacity Tier still uses the old v12 "stacking" logic (`Job Retention + Repo Lock + Block Gen`).
    *   **The Cost:** Data stays locked (and billable) until *all* timers run out. You're still paying for that "stacked" extra time.
*   **The GFS Trap:** If the repo is set to "Minimum Immutability," **the lock ignores GFS flags**. That 7-year archive will only be immutable for the `Repo Minimum + Block Gen`. To keep it locked for the full duration, you have to use "Match Job"—otherwise, the lock doesn't care about your long-term retention.
*   **Legacy Warning:** This is a write-time change. Old v12 backups keep using the old "stacking" math forever.

---

## Design Specs

*   **Version:** You need at least VBR **12.1.2**.
*   **Console & UI Prerequisites:**
    *   **WebView2 Runtime:** This is a hard requirement on the backup server and needs **Windows Server 2016+**. Without it, the authentication window won't load, which completely blocks the registration process.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)
*   **Ports:** 443 (HTTPS) for data/mgmt and 80 (HTTP) for cert checks.
*   **Cloud Connect:** No "Direct Connection" allowed. You have to use a **Gateway Server** on the SP side.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/data_cloud_limitations.html)
*   **Regions:** China and Gov regions are currently unsupported.
*   **Capacity Limits:**
    *   **Azure-backed Vaults:** 5 PiB (Matches the underlying Azure storage account ceiling).
    *   **AWS S3-backed Vaults:** No maximum capacity.

---

## Gateways & Mount Servers: Don't ignore these

*   **Gateway Servers (The Data Bridge):**
    *   **Automatic Selection:** Generally safe for standard internet setups. VBR will load balance the traffic across available proxies.
    *   **When to Manual Override:**
        *   **Private Links:** If you have **ExpressRoute** or **DirectConnect**, you must manually select the gateway to force traffic over that private pipe.
        *   **Branch Offices:** Prevent branch traffic from hairpinning through the HQ internet connection.
        *   **Cross-Cloud/Region:** Ensure an Azure proxy doesn't accidentally process AWS data (and trigger egress fees).
    *   **Private Access:** For true private networking, you'll need VBR **v12.3**. Deploy a VM (Azure VM/EC2) in the Vault's region, add it as a Proxy, and set it as the Gateway.
    *   [Source (KB4745)](https://www.veeam.com/kb4745)
*   **Mount Servers (Restores):**
    *   **IVMR & Item Restores:** These rely on the Mount Server to present data.
    *   **The Latency & Cost Trap:** If your VBR is in the Cloud and acts as the Mount Server for an on-prem restore, your on-prem hypervisor mounts the backup **over the WAN**.
        *   **Performance:** The latency will likely make Instant Recovery unusable.
        *   **Cost:** You are streaming data out of the cloud, triggering **Public Cloud Egress fees**.
    *   **Best Practice:** Keep the Mount Server **close to the restore target**. If you're doing an on-prem restore, use an on-prem Mount Server to ensure the NFS mount is local and fast.

---

## Migrating to Vault without the Egress Pain

Use these patterns to move data from Azure Blob or AWS S3 into Vault without getting killed on transfer fees.

*   **The SOBR "Evacuate" Method:**
    1.  Add Vault as a new Capacity Extent.
    2.  Seal the old extent and put it in Maintenance Mode.
    3.  Select **Evacuate Backups**.
    *   **Warning: The Maintenance Mode "Offload Pause":** Putting an extent in Maintenance Mode stops **ALL** offload jobs for that SOBR. New backups won't move to the capacity tier until the migration finishes, which can break your 3-2-1 compliance. Use a fast gateway to keep this "unprotected" window as short as possible.
    *   **Warning:** This uses the *source* repository's gateway. If that gateway is on-prem, you'll pull all that cloud data on-prem and push it back up. **Zero-Egress Fix:** Deploy a small VM in the source cloud region and set it as the Gateway for both the old repo and the Vault.
*   **Backup Copy Jobs:**
    *   **Encryption:** You must enable encryption in the job settings to satisfy Vault.
    *   **Gateway Placement:** Explicitly select a **Gateway Server in the source region**.
        *   **Why:** Data flows Source -> Gateway -> Vault. If you use an on-prem gateway, you pay egress to pull it down. Keep the gateway in the source cloud to keep fees low.
    *   **Historical Data:** Standard "Immediate" jobs only copy the latest chain. To move the whole history, use the `BackupCopyMirrorAll` registry key (Windows) or config value (Linux) *before* you start the job.
    *   **🚨 Note on Retention:** The "MirrorAll" key won't preserve GFS flags (Weekly/Monthly/Yearly). Everything lands as a standard restore point, and the Backup Copy Job's standard retention takes over.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/backup_copy_name.html)

---

## v13 Workload Compatibility

Use this matrix to validate your design. It covers direct targeting, copy jobs, and whether VeeaMover ("Move Backup") is supported.

| Workload | Direct to Vault | Backup Copy | Capacity Tier | VeeaMover | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VMware vSphere** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | |
| **Hyper-V** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | |
| **VMware Cloud Director**| ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Partial| Job/vApp move only. |
| **Nutanix AHV** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | |
| **Proxmox VE** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | |
| **OLVM / RHV** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | |
| **Agents (Managed)** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Partial | **Jobs:** Yes (via Gateway).<br>**Policies:** No (Object Storage limit). |
| **Agents (Standalone)**| ❌ No | ✅ Yes | ✅ Yes | ❌ No | Cannot target Vault directly. |
| **Enterprise Plugins** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Requires v13.0.1+. |
| **VB for Azure** | ✅ Yes | ✅ Yes | N/A | ❌ No | |
| **VB for AWS** | ❌ No | ✅ Yes | N/A | ❌ No | Copy jobs only. |
| **VB for Google** | ❌ No | ✅ Yes | N/A | ❌ No | Copy jobs only. |
| **Veeam Kasten** | ✅ Yes | - | - | ❌ No | Azure Edition only. |

---

## Virtualization Plugin Specifics (Proxmox, AHV, OLVM)

Since v13, these plugins can target Vault directly. However, they behave differently than vSphere/Hyper-V.

*   **Instant VM Recovery (IVMR):**
    *   **Nutanix AHV:** ✅ Fully supports Instant Recovery from Vault directly to the AHV cluster.
    *   **Proxmox VE / OLVM / RHV:** ❌ **Cannot** Instant Recover to themselves. You can only do a "Full VM Restore" (which hydrates the data back to production storage).
        *   *Note:* You *can* Instant Recover these backups to vSphere or Hyper-V if needed for emergency access.

---

## Enterprise Plugins (v13+)

*   **Direct-to-Vault:** You can now point Enterprise Plugins (RMAN, SAP, SQL, DB2) directly at the Vault.
*   **How it works:** The plugin routes traffic through a **Mount Server** (acting as a gateway). This protects your database server from the high CPU load of object encryption/transfer.
    *   [Source](https://helpcenter.veeam.com/docs/vbr/userguide/plugins_mssql_object_storage.html)
