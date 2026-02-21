import type { SafeJob } from "@/types/domain";

export interface RepoStats {
  sourceTB: number;
  onDiskTB: number;
}

export function aggregateRepoStatsMap(
  jobs: SafeJob[],
  filter?: Set<string>,
): Map<string, RepoStats> {
  const map = new Map<string, RepoStats>();
  for (const job of jobs) {
    if (filter && !filter.has(job.RepoName)) continue;
    const cur = map.get(job.RepoName) ?? { sourceTB: 0, onDiskTB: 0 };
    map.set(job.RepoName, {
      sourceTB:
        cur.sourceTB +
        (job.SourceSizeGB !== null ? job.SourceSizeGB / 1024 : 0),
      onDiskTB:
        cur.onDiskTB + (job.OnDiskGB !== null ? job.OnDiskGB / 1024 : 0),
    });
  }
  return map;
}
