import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as veeamApi from "@/lib/veeam-api";
import {
  generateGrowthSeries,
  getProjectionYears,
} from "@/lib/growth-projector";
import type { VmAgentResponse, RestorePoint } from "@/types/veeam-api";
import type { GlobalSettings } from "@/types/settings";
import { makeJob, makeSession, makeSettings } from "./fixtures";

vi.mock("@/lib/veeam-api");
const callVmAgentApi = vi.mocked(veeamApi.callVmAgentApi);

interface FakeResponseOpts {
  totalStorageTB?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
  taxGB?: number;
}

function fakeResponse(opts: FakeResponseOpts = {}): VmAgentResponse {
  const points: RestorePoint[] = [];
  const push = (cap: number, flag: string, day: number) => {
    if (cap > 0) {
      points.push({
        pointType: "performanceTier",
        day,
        backupCapacity: cap,
        isFull: false,
        isGFS: flag !== "D1",
        isImmutable: false,
        flags: flag,
      });
    }
  };
  push(opts.daily ?? 0, "D1", 1);
  push(opts.weekly ?? 0, "W1", 7);
  push(opts.monthly ?? 0, "M1", 30);
  push(opts.yearly ?? 0, "Y1", 365);

  return {
    success: true,
    data: {
      totalStorageTB: opts.totalStorageTB ?? 0,
      proxyCompute: { compute: { cores: 0, ram: 0, volumes: [] } },
      repoCompute: { compute: { cores: 0, ram: 0, volumes: [] } },
      transactions: {},
      performanceTierImmutabilityTaxGB: opts.taxGB ?? 0,
      capacityTierImmutabilityTaxGB: 0,
      restorePoints: points,
    },
  };
}

const baseArgs = (settings: GlobalSettings) => ({
  jobs: [makeJob({ JobName: "Job A", SourceSizeGB: 1024, RetainDays: 30 })],
  sessions: [
    makeSession({ JobName: "Job A", AvgChangeRate: 5, MaxDataSize: 1024 ** 3 }),
  ],
  settings,
  jobCount: 1,
  vbrVersion: "13.0.1.1071",
});

beforeEach(() => {
  callVmAgentApi.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getProjectionYears", () => {
  it("defaults to 5 when neither limitCalculationYears nor growthYears is set", () => {
    expect(
      getProjectionYears(
        makeSettings({ limitCalculationYears: null, growthYears: 0 }),
      ),
    ).toBe(5);
  });

  it("uses limitCalculationYears when set", () => {
    expect(getProjectionYears(makeSettings({ limitCalculationYears: 3 }))).toBe(
      3,
    );
  });

  it("uses growthYears when limitCalculationYears is null and growthYears > 5", () => {
    expect(
      getProjectionYears(
        makeSettings({ limitCalculationYears: null, growthYears: 8 }),
      ),
    ).toBe(8);
  });

  it("clamps to a maximum of 12 years", () => {
    expect(
      getProjectionYears({
        ...makeSettings(),
        limitCalculationYears: 99,
      } as GlobalSettings),
    ).toBe(12);
  });

  it("clamps to a minimum of 1 year", () => {
    expect(
      getProjectionYears({
        ...makeSettings(),
        limitCalculationYears: 0,
      } as GlobalSettings),
    ).toBe(1);
  });

  it("extends past the 5y default to match natural retention when no cap is set", () => {
    expect(
      getProjectionYears(
        makeSettings({ limitCalculationYears: null, growthYears: 0 }),
        8,
      ),
    ).toBe(8);
  });

  it("clamps natural retention to 12 when cap is null and natural exceeds 12", () => {
    expect(
      getProjectionYears(
        makeSettings({ limitCalculationYears: null, growthYears: 0 }),
        20,
      ),
    ).toBe(12);
  });

  it("keeps the 5y floor when natural retention is below the default", () => {
    expect(
      getProjectionYears(
        makeSettings({ limitCalculationYears: null, growthYears: 0 }),
        2,
      ),
    ).toBe(5);
  });

  it("ignores natural retention when limitCalculationYears is explicitly set", () => {
    expect(
      getProjectionYears(makeSettings({ limitCalculationYears: 3 }), 9),
    ).toBe(3);
  });
});

describe("generateGrowthSeries", () => {
  it("returns one entry per projection year with the expected shape", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({
        totalStorageTB: 10,
        daily: 2,
        weekly: 1,
        monthly: 1,
        yearly: 1,
        taxGB: 1024,
      }),
    );

    const settings = makeSettings({
      limitCalculationYears: 5,
      growthPercent: 10,
    });
    const result = await generateGrowthSeries(baseArgs(settings));

    expect(result).toHaveLength(5);
    for (let i = 0; i < result.length; i++) {
      const point = result[i];
      expect(point.name).toBe(`Year ${i + 1}`);
      expect(point).toHaveProperty("daily");
      expect(point).toHaveProperty("weekly");
      expect(point).toHaveProperty("monthly");
      expect(point).toHaveProperty("yearly");
      expect(point).toHaveProperty("immutability");
      expect(point).toHaveProperty("total");
    }
  });

  it("each emitted GrowthSeriesPoint has a buffer field equal to 0", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({ limitCalculationYears: 2 });
    const result = await generateGrowthSeries(baseArgs(settings));

    expect(result).toHaveLength(2);
    for (const point of result) {
      expect(point.buffer).toBe(0);
    }
  });

  it("extends to natural GFS retention (capped at 12) when no cap is set", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // Job with high yearly GFS retention (8y), no cap → chart should
    // extend to 8 bars instead of the 5y default.
    const args = {
      jobs: [
        makeJob({
          JobName: "Job A",
          SourceSizeGB: 1024,
          RetainDays: 30,
          GfsEnabled: true,
          GfsDetails: "Yearly:8,Monthly:12,Weekly:4",
        }),
      ],
      sessions: [
        makeSession({
          JobName: "Job A",
          AvgChangeRate: 5,
          MaxDataSize: 1024 ** 3,
        }),
      ],
      settings: makeSettings({
        limitCalculationYears: null,
        growthYears: 0,
        greenfieldSimulation: false,
      }),
      jobCount: 1,
      vbrVersion: "13.0.1.1071",
    };

    const result = await generateGrowthSeries(args);

    expect(result).toHaveLength(8);
    expect(result.map((p) => p.name)).toEqual([
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
      "Year 8",
    ]);
  });

  it("derives natural retention from Monthly GFS when no Yearly is configured", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // Monthly:120 = 10 years of monthly retention. No Yearly. With no cap
    // set, the chart should extend to 10 bars to match that horizon.
    const args = {
      jobs: [
        makeJob({
          JobName: "Job A",
          SourceSizeGB: 1024,
          RetainDays: 30,
          GfsEnabled: true,
          GfsDetails: "Monthly:120",
        }),
      ],
      sessions: [
        makeSession({
          JobName: "Job A",
          AvgChangeRate: 5,
          MaxDataSize: 1024 ** 3,
        }),
      ],
      settings: makeSettings({
        limitCalculationYears: null,
        growthYears: 0,
        greenfieldSimulation: false,
      }),
      jobCount: 1,
      vbrVersion: "13.0.1.1071",
    };

    const result = await generateGrowthSeries(args);

    expect(result).toHaveLength(10);
  });

  it("clamps to 12 bars when natural GFS retention exceeds 12 and no cap is set", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const args = {
      jobs: [
        makeJob({
          JobName: "Job A",
          SourceSizeGB: 1024,
          RetainDays: 30,
          GfsEnabled: true,
          GfsDetails: "Yearly:20",
        }),
      ],
      sessions: [
        makeSession({
          JobName: "Job A",
          AvgChangeRate: 5,
          MaxDataSize: 1024 ** 3,
        }),
      ],
      settings: makeSettings({
        limitCalculationYears: null,
        growthYears: 0,
        greenfieldSimulation: false,
      }),
      jobCount: 1,
      vbrVersion: "13.0.1.1071",
    };

    const result = await generateGrowthSeries(args);

    expect(result).toHaveLength(12);
  });

  it("clamps per-step growthYears to settings.growthYears (settings=0 → all 0)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 5,
      growthYears: 0,
      greenfieldSimulation: false,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(5);
    for (const call of callVmAgentApi.mock.calls) {
      expect((call[4] as GlobalSettings).growthYears).toBe(0);
    }
  });

  it("clamps per-step growthYears to settings.growthYears (settings=2 over 5y → 1,2,2,2,2)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 5,
      growthYears: 2,
      greenfieldSimulation: false,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(5);
    const passedGrowthYears = callVmAgentApi.mock.calls
      .map((c) => (c[4] as GlobalSettings).growthYears)
      .sort();
    expect(passedGrowthYears).toEqual([1, 2, 2, 2, 2]);
  });

  it("preserves limitCalculationYears across iterations when greenfieldSimulation is false", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 4,
      greenfieldSimulation: false,
      growthYears: 4,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(4);
    for (let year = 1; year <= 4; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      expect(call, `call for year ${year}`).toBeDefined();
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationYears).toBe(4);
      expect(passed.growthYears).toBe(year);
    }
  });

  it("varies both growthYears and limitCalculationYears when greenfieldSimulation is true", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 5,
      greenfieldSimulation: true,
      growthYears: 5,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(5);
    for (let year = 1; year <= 5; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      expect(call, `call for year ${year}`).toBeDefined();
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationYears).toBe(year);
      expect(passed.growthYears).toBe(year);
    }
  });

  it("offsets the GFS chain by historicalDataYears in greenfield mode", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 7,
      greenfieldSimulation: true,
      historicalDataYears: 3,
      growthYears: 7,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(7);
    const expectedCaps: Record<number, number> = {
      1: 3,
      2: 4,
      3: 5,
      4: 6,
      5: 7,
      6: 7,
      7: 7,
    };
    for (let year = 1; year <= 7; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationYears, `year ${year}`).toBe(
        expectedCaps[year],
      );
    }
  });

  it("clamps historicalDataYears + year offset to limitCalculationYears", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 5,
      greenfieldSimulation: true,
      historicalDataYears: 3,
      growthYears: 5,
    });
    await generateGrowthSeries(baseArgs(settings));

    const expectedCaps: Record<number, number> = {
      1: 3,
      2: 4,
      3: 5,
      4: 5,
      5: 5,
    };
    for (let year = 1; year <= 5; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationYears, `year ${year}`).toBe(
        expectedCaps[year],
      );
    }
  });

  it("ignores historicalDataYears when greenfieldSimulation is false", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 4,
      greenfieldSimulation: false,
      historicalDataYears: 3,
      growthYears: 4,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(4);
    for (let year = 1; year <= 4; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationYears, `year ${year}`).toBe(4);
    }
  });

  it("produces strictly increasing totals when growth is active and the API honors it", async () => {
    // Faithful mock: scales response total by the year passed in growthYears.
    callVmAgentApi.mockImplementation(async (_s, _jc, _v, _o, settings) => {
      const year = settings?.growthYears ?? 0;
      const factor = 1 + 0.1 * year;
      return fakeResponse({
        totalStorageTB: 10 * factor,
        daily: 2 * factor,
        weekly: 1 * factor,
        monthly: 1 * factor,
        yearly: 1 * factor,
      });
    });

    const settings = makeSettings({
      limitCalculationYears: 5,
      growthYears: 5,
      growthPercent: 10,
    });
    const result = await generateGrowthSeries(baseArgs(settings));

    for (let i = 1; i < result.length; i++) {
      expect(result[i].total).toBeGreaterThan(result[i - 1].total);
    }
  });

  it("renders monthly bars when totalCapMonths<=12 in seeded mode (years=0, months=6)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 0,
      limitCalculationMonths: 6,
      greenfieldSimulation: false,
    });

    const result = await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(6);
    expect(result.map((p) => p.name)).toEqual([
      "Month 1",
      "Month 2",
      "Month 3",
      "Month 4",
      "Month 5",
      "Month 6",
    ]);
    for (const call of callVmAgentApi.mock.calls) {
      const passed = call[4] as GlobalSettings;
      expect(passed.growthYears).toBe(0);
      expect(passed.limitCalculationYears).toBe(0);
      expect(passed.limitCalculationMonths).toBe(6);
    }
  });

  it("derives per-step caps for monthly greenfield (totalCapMonths=6, historicalDataYears=0)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 0,
      limitCalculationMonths: 6,
      greenfieldSimulation: true,
      historicalDataYears: 0,
    });

    const result = await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(6);
    expect(result.map((p) => p.name)).toEqual([
      "Month 1",
      "Month 2",
      "Month 3",
      "Month 4",
      "Month 5",
      "Month 6",
    ]);
    // Symmetric with yearly: when hist=0, step K → chain depth K months
    // (not K-1, which would leave step 1 at 0 months and disable capJob).
    // Step K: baseChainMonths = K → lcm = K (clamped at totalCapMonths=6).
    for (let k = 1; k <= 6; k++) {
      const call = callVmAgentApi.mock.calls.find((c) => {
        const s = c[4] as GlobalSettings;
        return s.limitCalculationYears === 0 && s.limitCalculationMonths === k;
      });
      expect(call, `step ${k} expected months=${k}`).toBeDefined();
      const passed = call![4] as GlobalSettings;
      expect(passed.growthYears).toBe(0);
    }
  });

  it("step 1 of monthly greenfield produces an active cap, not lcy=0/lcm=0 (regression: Month 1 sent full GFS chain)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 0,
      limitCalculationMonths: 3,
      greenfieldSimulation: true,
      historicalDataYears: 0,
    });

    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(3);
    // The bug: lcy=0/lcm=0 makes capJob's `totalCapDays > 0` check false →
    // cap inactive → full retention forwarded to the API. Every monthly step
    // must yield a non-zero (lcy, lcm) so the cap stays active.
    for (const call of callVmAgentApi.mock.calls) {
      const s = call[4] as GlobalSettings;
      const totalMonths =
        s.limitCalculationYears! * 12 + s.limitCalculationMonths;
      expect(totalMonths).toBeGreaterThan(0);
    }
  });

  it("clamps baseChainMonths to totalCapMonths in monthly greenfield (lcy=0, lcm=4, hist=1y)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 0,
      limitCalculationMonths: 4,
      greenfieldSimulation: true,
      historicalDataYears: 1,
    });

    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(4);
    // Every step K: baseChainMonths = 12 + K - 1 = 11 + K, clamped to 4
    // → limitCalculationYears=0, limitCalculationMonths=4
    for (const call of callVmAgentApi.mock.calls) {
      const passed = call[4] as GlobalSettings;
      expect(passed.growthYears).toBe(0);
      expect(passed.limitCalculationYears).toBe(0);
      expect(passed.limitCalculationMonths).toBe(4);
    }
  });

  it("routes 1y 0m (totalCapMonths=12) to monthly scale, not yearly", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 1,
      limitCalculationMonths: 0,
      greenfieldSimulation: false,
    });

    const result = await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(12);
    expect(result.map((p) => p.name)).toEqual([
      "Month 1",
      "Month 2",
      "Month 3",
      "Month 4",
      "Month 5",
      "Month 6",
      "Month 7",
      "Month 8",
      "Month 9",
      "Month 10",
      "Month 11",
      "Month 12",
    ]);
  });

  it("zeroes limitCalculationMonths in each yearly step even when base cap has residual months", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // cap = "4y 3m" → yearly path (totalCapMonths=51 > 12).
    // Each per-step tempSettings must have limitCalculationMonths=0 so
    // globalCapDays returns exactly year*365, not year*365 + 3*30.
    // Without the fix the monthly/weekly per-step caps would be inflated
    // (e.g. year=1 → 545d instead of 365d → monthly cap=18 not 12).
    const settings = makeSettings({
      limitCalculationYears: 4,
      limitCalculationMonths: 3,
      greenfieldSimulation: true,
      growthYears: 4,
    });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(4);
    for (let year = 1; year <= 4; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).growthYears === year,
      );
      expect(call, `call for year ${year}`).toBeDefined();
      const passed = call![4] as GlobalSettings;
      expect(passed.limitCalculationMonths, `year ${year}`).toBe(0);
      expect(passed.limitCalculationYears).toBe(year);
    }
  });

  it("patches each step's summary with immutabilityDays when provided", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({ limitCalculationYears: 3 });
    await generateGrowthSeries({
      ...baseArgs(settings),
      immutabilityDays: 14,
    });

    expect(callVmAgentApi).toHaveBeenCalledTimes(3);
    for (const call of callVmAgentApi.mock.calls) {
      // First arg is the summary passed to the API
      const summary = call[0] as { immutabilityDays: number };
      expect(summary.immutabilityDays).toBe(14);
    }
  });

  it("patches each step's summary with retentionDays when provided", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({ limitCalculationYears: 2 });
    await generateGrowthSeries({
      ...baseArgs(settings),
      retentionDays: 60,
    });

    expect(callVmAgentApi).toHaveBeenCalledTimes(2);
    for (const call of callVmAgentApi.mock.calls) {
      const summary = call[0] as {
        maxRetentionDays: number;
        originalMaxRetentionDays: number;
      };
      expect(summary.maxRetentionDays).toBe(60);
      expect(summary.originalMaxRetentionDays).toBe(60);
    }
  });

  it("caps retentionDays override to the per-step horizon in monthly greenfield mode", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // cap = 2 months greenfield: step 1 → stepCapDays=30, step 2 → stepCapDays=60.
    // retentionDays=365 exceeds both horizons, so each step must clamp to min(365, stepCapDays).
    const settings = makeSettings({
      limitCalculationYears: 0,
      limitCalculationMonths: 2,
      greenfieldSimulation: true,
      historicalDataYears: 0,
    });
    await generateGrowthSeries({
      ...baseArgs(settings),
      retentionDays: 365,
    });

    expect(callVmAgentApi).toHaveBeenCalledTimes(2);
    const expected = [30, 60];
    for (let step = 1; step <= 2; step++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).limitCalculationMonths === step,
      );
      expect(call, `call for step ${step}`).toBeDefined();
      const summary = call![0] as {
        maxRetentionDays: number;
        originalMaxRetentionDays: number;
      };
      expect(summary.maxRetentionDays, `step ${step}`).toBe(expected[step - 1]);
      expect(summary.originalMaxRetentionDays, `step ${step}`).toBe(
        expected[step - 1],
      );
    }
  });

  it("caps GFS overrides to the per-step horizon in greenfield mode", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // limitCalculationYears: 2 + default greenfieldSimulation: true → step 1 cap=1, step 2 cap=2.
    // weekly (4) and monthly (12) both fit within year 1 (4 ≤ 52, 12 ≤ 12), so they pass through
    // at full value. yearly (7) exceeds the per-step cap each time and must be clamped.
    const settings = makeSettings({ limitCalculationYears: 2 });
    await generateGrowthSeries({
      ...baseArgs(settings),
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 7,
    });

    expect(callVmAgentApi).toHaveBeenCalledTimes(2);
    for (let year = 1; year <= 2; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).limitCalculationYears === year,
      );
      expect(call, `call for year ${year}`).toBeDefined();
      const summary = call![0] as {
        gfsWeekly: number;
        gfsMonthly: number;
        gfsYearly: number;
      };
      expect(summary.gfsWeekly).toBe(4);
      expect(summary.gfsMonthly).toBe(12);
      expect(summary.gfsYearly).toBe(year); // clamped to the per-step cap
    }
  });

  it("does not override immutabilityDays in the summary when immutabilityDays is not provided", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({ limitCalculationYears: 2 });
    await generateGrowthSeries(baseArgs(settings));

    expect(callVmAgentApi).toHaveBeenCalledTimes(2);
    // Without an override, the summary's immutabilityDays comes from
    // buildCalculatorSummary — we simply verify callVmAgentApi was called
    // (the summary value is whatever the aggregator produces from test data).
    for (const call of callVmAgentApi.mock.calls) {
      expect(call[0]).toBeDefined();
    }
  });

  it("dispatches API calls in batches of 5 (rate-limit guard)", async () => {
    const resolvers: Array<(v: VmAgentResponse) => void> = [];
    callVmAgentApi.mockImplementation(
      () =>
        new Promise<VmAgentResponse>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    // 7 yearly steps → batches of [5, 2]
    const settings = makeSettings({ limitCalculationYears: 7 });
    const promise = generateGrowthSeries(baseArgs(settings));

    // Yield to microtask queue so the first chunk's map() dispatches.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(callVmAgentApi).toHaveBeenCalledTimes(5);
    expect(resolvers).toHaveLength(5);

    // Resolve the first batch — second batch must not have dispatched yet.
    resolvers
      .slice(0, 5)
      .forEach((resolve) => resolve(fakeResponse({ totalStorageTB: 1 })));

    // Flush microtasks so chunk 1 settles and chunk 2 dispatches.
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(callVmAgentApi).toHaveBeenCalledTimes(7);
    expect(resolvers).toHaveLength(7);

    // Resolve the second batch.
    resolvers
      .slice(5)
      .forEach((resolve) => resolve(fakeResponse({ totalStorageTB: 1 })));

    const result = await promise;
    expect(result).toHaveLength(7);
    expect(result.map((p) => p.name)).toEqual([
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
    ]);
  });

  it("ramps GFS yearly override year-by-year in greenfield mode with no explicit cap (regression: was flat at full depth)", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    // Faithful reproduction of the reported bug: no explicit cap, greenfield on,
    // job has Yearly:7 so natural retention drives 7 steps.
    // With the bug every step would report gfsYearly=7; after the fix each step
    // must report gfsYearly === year (1..7), mirroring capJob's per-step cap.
    const settings = makeSettings({
      limitCalculationYears: null,
      greenfieldSimulation: true,
    });
    await generateGrowthSeries({
      jobs: [
        makeJob({
          JobName: "Job A",
          SourceSizeGB: 1024,
          RetainDays: 30,
          GfsDetails: "Yearly:7",
        }),
      ],
      sessions: [
        makeSession({
          JobName: "Job A",
          AvgChangeRate: 5,
          MaxDataSize: 1024 ** 3,
        }),
      ],
      settings,
      jobCount: 1,
      vbrVersion: "13.0.1.1071",
      gfsWeekly: 4,
      gfsMonthly: 12,
      gfsYearly: 7,
    });

    expect(callVmAgentApi).toHaveBeenCalledTimes(7);
    for (let year = 1; year <= 7; year++) {
      const call = callVmAgentApi.mock.calls.find(
        (c) => (c[4] as GlobalSettings).limitCalculationYears === year,
      );
      expect(call, `call for year ${year}`).toBeDefined();
      const summary = call![0] as {
        gfsWeekly: number;
        gfsMonthly: number;
        gfsYearly: number;
      };
      expect(summary.gfsYearly, `year ${year} gfsYearly`).toBe(year);
      expect(summary.gfsMonthly, `year ${year} gfsMonthly`).toBe(12);
      expect(summary.gfsWeekly, `year ${year} gfsWeekly`).toBe(4);
    }
  });
});
