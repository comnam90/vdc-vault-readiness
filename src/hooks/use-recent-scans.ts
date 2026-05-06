import { useCallback, useEffect, useState } from "react";
import {
  deleteScan,
  getRecentScans,
  type StoredScanSummary,
} from "@/lib/indexed-db";

export function useRecentScans() {
  const [recentScans, setRecentScans] = useState<StoredScanSummary[]>([]);

  const refreshScans = useCallback(async () => {
    try {
      const scans = await getRecentScans();
      setRecentScans(scans);
    } catch (err) {
      console.warn("Failed to load recent scans:", err);
      setRecentScans([]);
    }
  }, []);

  const removeScan = useCallback(
    async (id: number) => {
      try {
        await deleteScan(id);
      } catch (err) {
        console.warn("Failed to delete scan:", err);
      }
      await refreshScans();
    },
    [refreshScans],
  );

  useEffect(() => {
    let cancelled = false;
    getRecentScans()
      .then((scans) => {
        if (!cancelled) setRecentScans(scans);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load recent scans:", err);
        setRecentScans([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { recentScans, removeScan, refreshScans };
}
