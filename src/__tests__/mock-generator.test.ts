import { describe, expect, it } from "vitest";
import { analyzeHealthcheck } from "@/lib/pipeline";
import { MOCK_SCENARIOS } from "@/lib/mocks/generator";
import type { HealthcheckRoot } from "@/types/healthcheck";
import type { ValidationStatus } from "@/types/validation";

type Expected = Record<string, ValidationStatus>;

function nonPassingRules(raw: HealthcheckRoot): Expected {
  const { validations } = analyzeHealthcheck(raw);
  return Object.fromEntries(
    validations
      .filter((v) => v.status !== "pass")
      .map((v) => [v.ruleId, v.status]),
  );
}

// Each scenario must trigger exactly these non-passing rules (and statuses).
// Pinning the full set catches scenarios that silently drift as validation
// rules evolve.
const SCENARIO_EXPECTATIONS: Readonly<Record<string, Expected>> = {
  "perfect-v12": {},
  "legacy-v11": {
    "vbr-version": "fail",
    "config-backup-encryption": "warning",
    "job-encryption": "fail",
    "retention-period": "warning",
  },
  "blocker-aws": { "aws-workload": "fail" },
  "blocker-unencrypted": { "job-encryption": "fail" },
  "community-edition": { "license-edition": "info" },
  "low-retention": { "retention-period": "warning" },
  "advanced-cloud": { "archive-tier-edition": "warning" },
  "blocker-standalone-agent": { "agent-standalone-unsupported": "fail" },
  "warning-agent-policy": { "agent-policy-gateway-required": "warning" },
  "warning-cap-tier-unencrypted": { "sobr-cap-encryption": "warning" },
  "warning-cap-tier-mutable": { "sobr-immutability": "warning" },
  "warning-active-full": { "active-full-enabled": "warning" },
  "warning-cap-tier-residency": { "capacity-tier-residency": "warning" },
};

describe("MOCK_SCENARIOS", () => {
  it.each(Object.entries(SCENARIO_EXPECTATIONS))(
    "%s produces exactly its intended validation outcome",
    (name, expected) => {
      expect(MOCK_SCENARIOS).toHaveProperty([name]);
      expect(nonPassingRules(MOCK_SCENARIOS[name]())).toEqual(expected);
    },
  );

  it("has an expectation for every registered scenario", () => {
    expect(Object.keys(MOCK_SCENARIOS).sort()).toEqual(
      Object.keys(SCENARIO_EXPECTATIONS).sort(),
    );
  });

  it("triggers every validation rule in at least one scenario", () => {
    const allRuleIds = analyzeHealthcheck(
      MOCK_SCENARIOS["perfect-v12"](),
    ).validations.map((v) => v.ruleId);
    const triggered = new Set(
      Object.values(MOCK_SCENARIOS).flatMap((create) =>
        Object.keys(nonPassingRules(create())),
      ),
    );

    const untriggered = allRuleIds.filter((id) => !triggered.has(id));
    expect(untriggered).toEqual([]);
  });
});
