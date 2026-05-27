export type AgentCategory = "standalone" | "policy" | "managed-backup";

export interface AgentClassification {
  category: AgentCategory;
  legacy: boolean;
}

// "Agent Backup" is intentionally absent — it's an old-format jobSummary
// aggregate label (not a per-job JobType); per-job rows use EpAgentBackup.
const LEGACY_EXACT: ReadonlyMap<string, AgentCategory> = new Map([
  ["unmanaged agent", "standalone"],
  ["epagentpolicy", "policy"],
  ["vmbapipolicytempjob", "policy"],
  ["epagentbackup", "managed-backup"],
]);

const PATTERNS: ReadonlyArray<{ regex: RegExp; category: AgentCategory }> = [
  { regex: /^.+\s+agent\s+standalone$/, category: "standalone" },
  { regex: /^.+\s+agent\s+policy$/, category: "policy" },
  { regex: /^.+\s+agent\s+backup$/, category: "managed-backup" },
];

export function classifyAgentJobType(
  jobType: string | null | undefined,
): AgentClassification | null {
  if (jobType === null || jobType === undefined) return null;

  const normalized = jobType.trim().toLowerCase();
  if (normalized.length === 0) return null;

  const legacyCategory = LEGACY_EXACT.get(normalized);
  if (legacyCategory !== undefined) {
    return { category: legacyCategory, legacy: true };
  }

  for (const { regex, category } of PATTERNS) {
    if (regex.test(normalized)) {
      return { category, legacy: false };
    }
  }

  return null;
}
