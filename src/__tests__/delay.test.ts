import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tick } from "@/lib/delay";

describe("tick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified delay", async () => {
    const controller = new AbortController();
    let resolved = false;

    const promise = tick(100, controller.signal).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.advanceTimersByTime(99);
    await Promise.resolve();
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });

  it("resolves immediately when ms is 0", async () => {
    const controller = new AbortController();
    let resolved = false;

    const promise = tick(0, controller.signal).then(() => {
      resolved = true;
    });

    await promise;
    expect(resolved).toBe(true);
  });

  it("resolves immediately when ms is negative", async () => {
    const controller = new AbortController();

    await tick(-10, controller.signal);
    // If we reach here, it resolved
    expect(true).toBe(true);
  });

  it("resolves immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await tick(5000, controller.signal);
    expect(true).toBe(true);
  });

  it("resolves early when signal is aborted before timeout", async () => {
    const controller = new AbortController();
    let resolved = false;

    const promise = tick(1000, controller.signal).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.advanceTimersByTime(200);
    await Promise.resolve();
    expect(resolved).toBe(false);

    controller.abort();
    await promise;
    expect(resolved).toBe(true);
  });

  it("clears timeout when aborted", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const controller = new AbortController();

    const promise = tick(1000, controller.signal);
    controller.abort();
    await promise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
