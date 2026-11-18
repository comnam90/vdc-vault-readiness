import { describe, it, expect } from "vitest";
import { isExcludedJobType } from "@/lib/job-type-filter";

describe("isExcludedJobType", () => {
  it("excludes the legacy 'Replica' job type", () => {
    expect(isExcludedJobType("Replica")).toBe(true);
  });

  it.each([
    "VMware Replication",
    "Hyper-V Replication",
    "VMware CDP Replication",
  ])("excludes the friendly replication label '%s'", (jobType) => {
    expect(isExcludedJobType(jobType)).toBe(true);
  });

  it("excludes a bare 'Replication' label", () => {
    expect(isExcludedJobType("Replication")).toBe(true);
  });

  it("excludes the bare 'Proxmox ' label VBR emits for Proxmox replication jobs", () => {
    // VBR's TypeToString for a Proxmox replica is "Proxmox " (blank type word,
    // trailing space). Verified against a VBR 13.1.2 export, where the raw-type
    // jobSummary counted it as "Replica".
    expect(isExcludedJobType("Proxmox ")).toBe(true);
    expect(isExcludedJobType("proxmox")).toBe(true);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(isExcludedJobType("replica")).toBe(true);
    expect(isExcludedJobType("  vmware REPLICATION  ")).toBe(true);
  });

  it.each([
    "Backup",
    "VMware Backup",
    "Hyper-V Backup",
    "Backup Copy",
    "File Backup",
    "Windows Agent Standalone",
    "ReplicaSetBackup",
    "Replication Backup",
    "Proxmox Backup",
  ])("keeps the non-replica job type '%s'", (jobType) => {
    expect(isExcludedJobType(jobType)).toBe(false);
  });
});
