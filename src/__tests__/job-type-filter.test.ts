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
  ])("keeps the non-replica job type '%s'", (jobType) => {
    expect(isExcludedJobType(jobType)).toBe(false);
  });
});
