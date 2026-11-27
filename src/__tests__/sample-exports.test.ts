import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { analyzeHealthcheck } from "@/lib/pipeline";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { enrichJobs } from "@/lib/enrich-jobs";
import type { HealthcheckRoot } from "@/types/healthcheck";
import replicasPluginsSample from "../../veeam-healthcheck.v13.1-replicas-plugins.example.json";
import windowsAgentsSample from "../../veeam-healthcheck.v13.1-windows-agents.example.json";
import cloudPluginSample from "../../veeam-healthcheck.v13.1-cloud-plugin-policies.example.json";

/**
 * End-to-end checks against sanitised real exports from the current
 * veeam-healthcheck tool (VhcVersion 3.1.1.301, friendly JobType labels).
 * Expected values were verified against the unsanitised originals.
 */

type Analysis = ReturnType<typeof analyzeHealthcheck>;

function statusOf(result: Analysis, ruleId: string) {
  const rule = result.validations.find((v) => v.ruleId === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found in results`);
  return { status: rule.status, affected: rule.affectedItems.length };
}

describe("current-format sample: VBR 13.1.2 with replicas and plug-ins", () => {
  const root = replicasPluginsSample as HealthcheckRoot;
  let result: Analysis;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    result = analyzeHealthcheck(root);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("fixture guard: is a current veeam-healthcheck export", () => {
    expect(root.VhcVersion?.startsWith("3.")).toBe(true);
    expect(result.data.backupServer[0].Version).toBe("13.1.2.57");
  });

  it("does not emit the legacy agent JobType deprecation warning", () => {
    // jobSummary carries the raw VmbApiPolicyTempJob plug-in type, which is
    // not an agent type (#99).
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("drops VMware, Hyper-V and Proxmox replication jobs", () => {
    const types = result.data.jobInfo.map((j) => j.JobType);
    expect(types).not.toContain("VMware Replication");
    expect(types).not.toContain("Hyper-V Replication");
    expect(types).not.toContain("Proxmox");
    expect(types).toContain("Proxmox Backup");
  });

  it("keeps the remaining jobs; one File Backup has no repository", () => {
    // 23 rows: 3 replicas excluded, 1 dropped for a missing RepoName
    expect(root.Sections.jobInfo?.Rows).toHaveLength(23);
    expect(result.data.jobInfo).toHaveLength(19);
    expect(result.data.dataErrors).toEqual([
      expect.objectContaining({ section: "jobInfo", field: "RepoName" }),
    ]);
  });

  it("joins sessions to jobs and skips the Total summary row", () => {
    // 21 session rows minus the Total row. Replica sessions stay in the
    // summary but no longer join to a job.
    expect(result.data.jobSessionSummary).toHaveLength(20);
    expect(
      result.data.jobSessionSummary.map((s) => s.JobName.toLowerCase()),
    ).not.toContain("total");
    const enriched = enrichJobs(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    // 3 of the 19 kept jobs have no sessions in the export window
    expect(enriched.filter((j) => j.sessionData)).toHaveLength(16);
  });

  it("produces the expected rule outcomes", () => {
    expect(statusOf(result, "job-encryption")).toEqual({
      status: "fail",
      affected: 17,
    });
    expect(statusOf(result, "retention-period")).toEqual({
      status: "warning",
      affected: 17,
    });
    // "Unix Agent Policy" is a managed agent policy
    expect(statusOf(result, "agent-policy-gateway-required")).toEqual({
      status: "warning",
      affected: 1,
    });
    expect(statusOf(result, "agent-standalone-unsupported").status).toBe(
      "pass",
    );
    expect(statusOf(result, "vbr-version").status).toBe("pass");
  });

  it("sizes without the VMware/Hyper-V replicas or their zero change rates", () => {
    const summary = buildCalculatorSummary(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    // Including the 450 GB + 32.38 GB replicas gave 3.407 TB and a 3.50%
    // weighted change rate (their sessions report 0%). The Proxmox replica
    // is 0 GB, so it doesn't move these totals (covered by the type test).
    expect(summary.totalSourceDataTB).toBeCloseTo(2.936, 3);
    expect(summary.weightedAvgChangeRate).toBeCloseTo(4.147, 3);
    expect(summary.maxRetentionDays).toBe(180);
  });
});

describe("current-format sample: VBR 13.1.0 with Windows agents", () => {
  const root = windowsAgentsSample as HealthcheckRoot;
  let result: Analysis;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    result = analyzeHealthcheck(root);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("fixture guard: is a current veeam-healthcheck export", () => {
    expect(root.VhcVersion?.startsWith("3.")).toBe(true);
    expect(result.data.backupServer[0].Version).toBe("13.1.0.411");
  });

  it("keeps all four jobs with friendly agent labels and no data errors", () => {
    expect(result.data.jobInfo.map((j) => j.JobType).sort()).toEqual([
      "Backup Copy",
      "Windows Agent Backup",
      "Windows Agent Policy",
      "Windows Agent Standalone",
    ]);
    expect(result.data.dataErrors).toHaveLength(0);
  });

  it("classifies the standalone and policy agent jobs", () => {
    expect(statusOf(result, "agent-standalone-unsupported")).toEqual({
      status: "fail",
      affected: 1,
    });
    expect(statusOf(result, "agent-policy-gateway-required")).toEqual({
      status: "warning",
      affected: 1,
    });
  });

  it("does not emit the legacy agent JobType deprecation warning", () => {
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("produces the expected remaining rule outcomes", () => {
    expect(statusOf(result, "job-encryption").status).toBe("pass");
    expect(statusOf(result, "retention-period")).toEqual({
      status: "warning",
      affected: 4,
    });
    expect(statusOf(result, "capacity-tier-residency")).toEqual({
      status: "warning",
      affected: 2,
    });
  });

  it("joins every job to its session data", () => {
    const enriched = enrichJobs(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    expect(enriched.every((j) => j.sessionData)).toBe(true);
  });

  it("sizes from the four jobs' source data and session change rates", () => {
    const summary = buildCalculatorSummary(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    expect(summary.totalSourceDataTB).toBeCloseTo(0.188, 3);
    expect(summary.weightedAvgChangeRate).toBeCloseTo(29.692, 3);
  });
});

describe("current-format sample: VBR 13.1.1 with cloud plug-in policies", () => {
  const root = cloudPluginSample as HealthcheckRoot;
  let result: Analysis;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    result = analyzeHealthcheck(root);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("fixture guard: is a current veeam-healthcheck export", () => {
    expect(root.VhcVersion?.startsWith("3.")).toBe(true);
    expect(result.data.backupServer[0].Version).toBe("13.1.1.18");
  });

  it("keeps all 22 jobs, including the 17 plug-in policies with no repository", () => {
    expect(root.Sections.jobInfo?.Rows).toHaveLength(22);
    expect(result.data.jobInfo).toHaveLength(22);
    expect(
      result.data.dataErrors.filter((e) => e.field === "RepoName"),
    ).toEqual([]);

    const noRepo = result.data.jobInfo.filter((j) => j.RepoName === null);
    expect(noRepo).toHaveLength(17);
    expect([...new Set(noRepo.map((j) => j.JobType))].sort()).toEqual([
      "AWS EC2 Backup",
      "Azure IaaS Backup",
      "GCE Backup",
    ]);
  });

  it("does not emit the legacy agent JobType deprecation warning", () => {
    // jobSummary carries the raw VmbApiPolicyTempJob type (#99).
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("includes the plug-in policies' source size in total source TB", () => {
    const summary = buildCalculatorSummary(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    // 691.01 GB from ordinary jobs + 448 GB from plug-in policies
    // (AWS 30 + 33, Azure 129 + 129 + 127) = 1139.01 GB.
    expect(summary.totalSourceDataTB).toBeCloseTo(1139.01 / 1024, 3);
  });
});

describe("current-format sample: VBR 13.1.1 cloud plug-in job-encryption (#101)", () => {
  const CLOUD_NATIVE_JOBS = [
    "Job-01",
    "Job-02",
    "Job-04",
    "Job-05",
    "Job-06",
    "Job-07",
    "Job-08",
    "Job-09",
    "Job-11",
    "Job-12",
    "Job-13",
    "Job-15",
    "Job-16",
    "Job-18",
    "Job-19",
    "Job-20",
    "Job-21",
  ];

  it("fails on the 4 unencrypted ordinary jobs and counts the 17 cloud-native jobs", () => {
    const rule = analyzeHealthcheck(
      cloudPluginSample as HealthcheckRoot,
    ).validations.find((v) => v.ruleId === "job-encryption");

    // The sample's SOBR has no capacity tier, so nothing is SOBR-exempt:
    // two VMware/object-storage jobs and two backup copy jobs are unencrypted.
    expect(rule?.status).toBe("fail");
    expect(rule?.affectedItems).toEqual([
      "Job-03",
      "Job-14",
      "Job-17",
      "Job-22",
    ]);
    // The message names the first 5 cloud-native jobs and counts the rest.
    expect(rule?.message).toContain(
      `17 cloud-native jobs couldn't be verified: ${CLOUD_NATIVE_JOBS.slice(0, 5).join(", ")} and 12 more.`,
    );
    for (const job of CLOUD_NATIVE_JOBS.slice(5)) {
      expect(rule?.message).not.toContain(job);
    }
  });
});
