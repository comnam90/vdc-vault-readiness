import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { analyzeHealthcheck } from "@/lib/pipeline";
import { buildCalculatorSummary } from "@/lib/calculator-aggregator";
import { enrichJobs } from "@/lib/enrich-jobs";
import type { HealthcheckRoot } from "@/types/healthcheck";
import replicasPluginsSample from "../../veeam-healthcheck.v13.1-replicas-plugins.example.json";
import windowsAgentsSample from "../../veeam-healthcheck.v13.1-windows-agents.example.json";

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
    // jobSummary still carries the raw VmbApiPolicyTempJob type (#94).
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    result = analyzeHealthcheck(root);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("is a current veeam-healthcheck export", () => {
    expect(root.VhcVersion?.startsWith("3.")).toBe(true);
    expect(result.data.backupServer[0].Version).toBe("13.1.2.57");
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
    expect(result.data.jobSessionSummary).toHaveLength(20);
    expect(
      result.data.jobSessionSummary.map((s) => s.JobName.toLowerCase()),
    ).not.toContain("total");
    const enriched = enrichJobs(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
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

  it("sizes without replica data or their zero change rates", () => {
    const summary = buildCalculatorSummary(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
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

  it("is a current veeam-healthcheck export", () => {
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

  it("joins every job to its session data for sizing", () => {
    const enriched = enrichJobs(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    expect(enriched.every((j) => j.sessionData)).toBe(true);
    const summary = buildCalculatorSummary(
      result.data.jobInfo,
      result.data.jobSessionSummary,
    );
    expect(summary.totalSourceDataTB).toBeCloseTo(0.188, 3);
    expect(summary.weightedAvgChangeRate).toBeCloseTo(29.692, 3);
  });
});
