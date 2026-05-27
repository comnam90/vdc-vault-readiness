import { describe, it, expect } from "vitest";
import { classifyAgentJobType } from "@/lib/agent-classifier";

describe("classifyAgentJobType", () => {
  describe("new-format matches (pattern)", () => {
    it("classifies 'Windows Agent Standalone' as standalone, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Standalone")).toEqual({
        category: "standalone",
        legacy: false,
      });
    });

    it("classifies 'Windows Agent Policy' as policy, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Policy")).toEqual({
        category: "policy",
        legacy: false,
      });
    });

    it("classifies 'Windows Agent Backup' as managed-backup, not legacy", () => {
      expect(classifyAgentJobType("Windows Agent Backup")).toEqual({
        category: "managed-backup",
        legacy: false,
      });
    });

    it("matches arbitrary platform prefixes (Linux, Mac)", () => {
      expect(classifyAgentJobType("Linux Agent Standalone")).toEqual({
        category: "standalone",
        legacy: false,
      });
      expect(classifyAgentJobType("Mac Agent Policy")).toEqual({
        category: "policy",
        legacy: false,
      });
    });
  });

  describe("legacy matches (exact strings)", () => {
    it("classifies 'EpAgentPolicy' as policy with legacy=true", () => {
      expect(classifyAgentJobType("EpAgentPolicy")).toEqual({
        category: "policy",
        legacy: true,
      });
    });

    it("classifies 'VmbapiPolicyTempJob' as policy with legacy=true", () => {
      expect(classifyAgentJobType("VmbapiPolicyTempJob")).toEqual({
        category: "policy",
        legacy: true,
      });
    });

    it("classifies 'EpAgentBackup' as managed-backup with legacy=true", () => {
      expect(classifyAgentJobType("EpAgentBackup")).toEqual({
        category: "managed-backup",
        legacy: true,
      });
    });

    it("classifies 'Unmanaged Agent' as standalone with legacy=true", () => {
      expect(classifyAgentJobType("Unmanaged Agent")).toEqual({
        category: "standalone",
        legacy: true,
      });
    });
  });

  describe("case and whitespace handling", () => {
    it("matches case-insensitively (legacy)", () => {
      expect(classifyAgentJobType("unmanaged agent")?.category).toBe(
        "standalone",
      );
      expect(classifyAgentJobType("EPAGENTPOLICY")?.category).toBe("policy");
    });

    it("matches case-insensitively (new format)", () => {
      expect(classifyAgentJobType("windows agent POLICY")?.category).toBe(
        "policy",
      );
    });

    it("trims surrounding whitespace", () => {
      expect(
        classifyAgentJobType("  Windows Agent Standalone  ")?.category,
      ).toBe("standalone");
      expect(classifyAgentJobType("  EpAgentPolicy  ")?.category).toBe(
        "policy",
      );
    });
  });

  describe("non-matches", () => {
    it.each([
      ["Backup"],
      ["Backup Copy"],
      ["VMware Backup"],
      ["File Backup"],
      ["Replica"],
      ["Endpoint Backup"],
      ["Agent"],
      ["Agent Standalone"], // no platform prefix
      ["Agent Policy"], // no platform prefix
      ["AgentPolicy"], // no whitespace separator
      ["WindowsAgentPolicy"], // no whitespace separator
    ])("returns null for non-agent JobType %j", (jobType) => {
      expect(classifyAgentJobType(jobType)).toBeNull();
    });

    it("returns null for null", () => {
      expect(classifyAgentJobType(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(classifyAgentJobType(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(classifyAgentJobType("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(classifyAgentJobType("   ")).toBeNull();
    });
  });
});
