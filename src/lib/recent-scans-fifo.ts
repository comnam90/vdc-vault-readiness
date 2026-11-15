export function selectIdsToEvict(
  existingIds: number[],
  maxKeep: number,
): number[] {
  if (existingIds.length <= maxKeep) {
    return [];
  }
  const sorted = [...existingIds].sort((a, b) => a - b);
  return sorted.slice(0, sorted.length - maxKeep);
}
