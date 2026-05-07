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

  it("clamps to a maximum of 10 years", () => {
    expect(
      getProjectionYears({
        ...makeSettings(),
        limitCalculationYears: 99,
      } as GlobalSettings),
    ).toBe(10);
  });

  it("clamps to a minimum of 1 year", () => {
    expect(
      getProjectionYears({
        ...makeSettings(),
        limitCalculationYears: 0,
      } as GlobalSettings),
    ).toBe(1);
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

  it("preserves limitCalculationYears across iterations when greenfieldSimulation is false", async () => {
    callVmAgentApi.mockImplementation(async () =>
      fakeResponse({ totalStorageTB: 10, daily: 1 }),
    );

    const settings = makeSettings({
      limitCalculationYears: 4,
      greenfieldSimulation: false,
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
      growthPercent: 10,
    });
    const result = await generateGrowthSeries(baseArgs(settings));

    for (let i = 1; i < result.length; i++) {
      expect(result[i].total).toBeGreaterThan(result[i - 1].total);
    }
  });

  it("fires all per-year API calls concurrently (Promise.all fan-out)", async () => {
    const resolvers: Array<(v: VmAgentResponse) => void> = [];
    callVmAgentApi.mockImplementation(
      () =>
        new Promise<VmAgentResponse>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const settings = makeSettings({ limitCalculationYears: 5 });
    const promise = generateGrowthSeries(baseArgs(settings));

    // Yield to the microtask queue so map() can dispatch every call
    // before we measure how many are in flight.
    await Promise.resolve();
    await Promise.resolve();

    expect(callVmAgentApi).toHaveBeenCalledTimes(5);
    expect(resolvers).toHaveLength(5);

    resolvers.forEach((resolve) =>
      resolve(fakeResponse({ totalStorageTB: 1 })),
    );
    const result = await promise;
    expect(result).toHaveLength(5);
  });
});
