import { EXCLUDED_JOB_TYPES } from "@/lib/constants";

// VBR's TypeToString for a Proxmox replication job is "Proxmox " (platform
// name, blank type word), unlike "Proxmox Backup". A VBR 13.1.2 export
// confirms it: the raw-type jobSummary counts that job as "Replica".
const BARE_REPLICA_LABELS = ["Proxmox"];

const EXCLUDED_EXACT = new Set(
  [...EXCLUDED_JOB_TYPES, ...BARE_REPLICA_LABELS].map((type) =>
    type.toLowerCase(),
  ),
);

// Current veeam-healthcheck exports use friendly labels from VBR's
// TypeToString (e.g. "VMware Replication", "Hyper-V Replication");
// older exports use the raw "Replica". Replicas aren't backups, so they
// are excluded from sizing and validation either way.
const REPLICATION_LABEL = /(^|\s)replication$/;

export function isExcludedJobType(jobType: string): boolean {
  const normalized = jobType.trim().toLowerCase();
  return EXCLUDED_EXACT.has(normalized) || REPLICATION_LABEL.test(normalized);
}

// Cloud plug-in policies (Veeam Backup for AWS / Azure / Google Cloud) carry
// friendly labels such as "AWS EC2 Backup", "Azure IaaS Backup" or
// "GCE Backup". Proxmox, AHV and Morpheus plug-in labels are deliberately
// not matched: their jobs write to VBR repositories. See ADR 0003.
const CLOUD_PLUGIN_LABEL = /^(aws|azure|gce|google)(\s.*)?\sbackup$/;

// Older exports carry the raw parent type for every VM Backup API plug-in.
// It is ambiguous: it also covers Proxmox, AHV and Morpheus jobs.
const LEGACY_PLUGIN_TYPE = "vmbapipolicytempjob";

/**
 * True for a cloud plug-in job type: a friendly AWS / Azure / GCE / Google
 * backup label, or the legacy raw `VmbApiPolicyTempJob`. Doesn't say which
 * cloud. See ADR 0003.
 */
export function isCloudPluginJobType(jobType: string): boolean {
  const normalized = jobType.trim().toLowerCase();
  return (
    normalized === LEGACY_PLUGIN_TYPE || CLOUD_PLUGIN_LABEL.test(normalized)
  );
}
