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
