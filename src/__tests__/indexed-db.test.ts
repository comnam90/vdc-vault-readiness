import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  DB_NAME,
  STORE_NAME,
  MAX_SCANS,
  type StoredScan,
  __resetForTests,
  deleteScan,
  getRecentScans,
  initDB,
  loadScanPayload,
  saveScan,
} from "@/lib/indexed-db";

function makeScan(
  overrides: Partial<Omit<StoredScan, "id">> = {},
): Omit<StoredScan, "id"> {
  return {
    filename: "healthcheck.json",
    uploadedAt: new Date().toISOString(),
    jobCount: 30,
    sourceTb: 12.5,
    vbrVersion: "13.0.1.1071",
    rawJson: '{"Sections":{}}',
    ...overrides,
  };
}

beforeEach(() => {
  // fresh in-memory DB per test
  globalThis.indexedDB = new IDBFactory();
  __resetForTests();
});

afterEach(() => {
  __resetForTests();
});

describe("indexed-db wrapper", () => {
  it("initDB creates the database and the healthchecks object store", async () => {
    const db = await initDB();
    expect(db.name).toBe(DB_NAME);
    expect(Array.from(db.objectStoreNames)).toContain(STORE_NAME);
  });

  it("saveScan persists a record and assigns a numeric id", async () => {
    const id = await saveScan(makeScan({ filename: "first.json" }));
    expect(typeof id).toBe("number");
    const summaries = await getRecentScans();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.filename).toBe("first.json");
  });

  it("getRecentScans excludes the rawJson field", async () => {
    await saveScan(makeScan({ rawJson: "HEAVY".repeat(1000) }));
    const summaries = await getRecentScans();
    expect(summaries).toHaveLength(1);
    const summary = summaries[0]!;
    expect(summary).not.toHaveProperty("rawJson");
    expect(summary.filename).toBe("healthcheck.json");
  });

  it("loadScanPayload returns the full record including rawJson", async () => {
    const id = await saveScan(makeScan({ rawJson: "PAYLOAD" }));
    const loaded = await loadScanPayload(id);
    expect(loaded).not.toBeNull();
    expect(loaded?.rawJson).toBe("PAYLOAD");
    expect(loaded?.id).toBe(id);
  });

  it("loadScanPayload returns null for an unknown id", async () => {
    const result = await loadScanPayload(999_999_999);
    expect(result).toBeNull();
  });

  it("deleteScan removes the record", async () => {
    const id = await saveScan(makeScan());
    await deleteScan(id);
    const result = await loadScanPayload(id);
    expect(result).toBeNull();
    expect(await getRecentScans()).toEqual([]);
  });

  it("evicts the oldest record when over MAX_SCANS (FIFO)", async () => {
    const filenames: string[] = [];
    for (let i = 0; i < MAX_SCANS + 1; i++) {
      const name = `scan-${i}.json`;
      filenames.push(name);
      await saveScan(makeScan({ filename: name }));
    }
    const summaries = await getRecentScans();
    expect(summaries).toHaveLength(MAX_SCANS);
    const remaining = summaries.map((s) => s.filename).sort();
    // oldest (scan-0.json) should be gone; scan-1..MAX_SCANS should remain
    expect(remaining).toEqual(filenames.slice(1).sort());
  });

  it("evicts multiple oldest records when many over MAX_SCANS", async () => {
    for (let i = 0; i < MAX_SCANS + 3; i++) {
      await saveScan(makeScan({ filename: `scan-${i}.json` }));
    }
    const summaries = await getRecentScans();
    expect(summaries).toHaveLength(MAX_SCANS);
  });

  it("returns recent scans newest-first", async () => {
    for (let i = 0; i < 3; i++) {
      await saveScan(makeScan({ filename: `scan-${i}.json` }));
    }
    const summaries = await getRecentScans();
    expect(summaries.map((s) => s.filename)).toEqual([
      "scan-2.json",
      "scan-1.json",
      "scan-0.json",
    ]);
  });

  it("avoids id collisions when two saves land in the same millisecond", async () => {
    // Force Date.now() to return a fixed timestamp for two consecutive calls.
    const fixed = 1_700_000_000_000;
    const originalNow = Date.now;
    let calls = 0;
    Date.now = () => {
      calls += 1;
      // first two calls return same timestamp; subsequent calls advance normally
      return calls <= 2 ? fixed : originalNow();
    };
    try {
      const id1 = await saveScan(makeScan({ filename: "a.json" }));
      const id2 = await saveScan(makeScan({ filename: "b.json" }));
      expect(id1).not.toBe(id2);
      const summaries = await getRecentScans();
      expect(summaries.map((s) => s.filename).sort()).toEqual([
        "a.json",
        "b.json",
      ]);
    } finally {
      Date.now = originalNow;
    }
  });
});
