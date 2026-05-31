import type {
  DerivedSizing,
  CompositionBuckets,
} from "@/lib/sizing-derivation";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

/**
 * Returns the gross-up factor for a given headroom percentage.
 * `bufferFactor(10)` = 1/0.9 ≈ 1.1111…
 */
export function bufferFactor(pct: number): number {
  return 1 / (1 - pct / 100);
}

/**
 * Applies a headroom buffer to a `DerivedSizing` result.
 *
 * When `!enabled` or `pct <= 0` the original reference is returned unchanged.
 * Otherwise a new `DerivedSizing` is returned with:
 * - `totalStorageTB` scaled by `f`
 * - `compositionTotalTB` scaled by `f`
 * - `compositionBuckets.buffer` set to the headroom segment in TB
 * - `compositionProportions` recomputed over the new total (buffer share = pct/100)
 * - All other fields passed through unchanged.
 *
 * The input is never mutated.
 */
export function applyBufferToSizing(
  sizing: DerivedSizing,
  enabled: boolean,
  pct: number,
): DerivedSizing {
  if (!enabled || pct <= 0) return sizing;

  const f = bufferFactor(pct);
  const bufferTB = sizing.compositionTotalTB * (f - 1);
  const newCompositionTotalTB = sizing.compositionTotalTB * f;

  const newCompositionBuckets: CompositionBuckets = {
    ...sizing.compositionBuckets,
    buffer: bufferTB,
  };

  const newCompositionProportions: CompositionBuckets =
    newCompositionTotalTB > 0
      ? {
          daily: sizing.compositionBuckets.daily / newCompositionTotalTB,
          weekly: sizing.compositionBuckets.weekly / newCompositionTotalTB,
          monthly: sizing.compositionBuckets.monthly / newCompositionTotalTB,
          yearly: sizing.compositionBuckets.yearly / newCompositionTotalTB,
          immutability:
            sizing.compositionBuckets.immutability / newCompositionTotalTB,
          buffer: bufferTB / newCompositionTotalTB,
        }
      : {
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
          immutability: 0,
          buffer: 0,
        };

  return {
    ...sizing,
    totalStorageTB: sizing.totalStorageTB * f,
    compositionBuckets: newCompositionBuckets,
    compositionTotalTB: newCompositionTotalTB,
    compositionProportions: newCompositionProportions,
  };
}

/**
 * Applies a headroom buffer to each point in a growth series.
 *
 * When `!enabled` or `pct <= 0` the original array reference is returned unchanged.
 * Otherwise each point is mapped to a new object with:
 * - `buffer` set to `point.total * (f - 1)`
 * - `total` scaled by `f`
 * - All other fields (daily, weekly, monthly, yearly, immutability, name) unchanged.
 *
 * Neither the array nor its points are mutated.
 */
export function applyBufferToSeries(
  series: GrowthSeriesPoint[],
  enabled: boolean,
  pct: number,
): GrowthSeriesPoint[] {
  if (!enabled || pct <= 0) return series;

  const f = bufferFactor(pct);
  return series.map((point) => ({
    ...point,
    buffer: point.total * (f - 1),
    total: point.total * f,
  }));
}
