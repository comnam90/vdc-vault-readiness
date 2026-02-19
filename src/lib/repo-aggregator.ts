import type { SafeJob } from "@/types/domain";

export interface StandardRepo {
  repoName: string;
  jobCount: number;
  totalSourceTB: number | null;
  allEncrypted: boolean;
}

export function deriveStandardRepos(jobs: SafeJob[]): StandardRepo[] {
  const map = new Map<
    string,
    { sumGB: number | null; count: number; allEncrypted: boolean }
  >();

  for (const job of jobs) {
    const existing = map.get(job.RepoName);
    if (!existing) {
      map.set(job.RepoName, {
        sumGB: job.SourceSizeGB,
        count: 1,
        allEncrypted: job.Encrypted,
      });
    } else {
      const newSum =
        existing.sumGB === null && job.SourceSizeGB === null
          ? null
          : (existing.sumGB ?? 0) + (job.SourceSizeGB ?? 0);
      map.set(job.RepoName, {
        sumGB: newSum,
        count: existing.count + 1,
        allEncrypted: existing.allEncrypted && job.Encrypted,
      });
    }
  }

  const repos: StandardRepo[] = Array.from(map.entries()).map(
    ([repoName, { sumGB, count, allEncrypted }]) => ({
      repoName,
      jobCount: count,
      totalSourceTB: sumGB !== null ? sumGB / 1024 : null,
      allEncrypted,
    }),
  );

  return repos.sort((a, b) => {
    if (a.totalSourceTB === null && b.totalSourceTB === null) return 0;
    if (a.totalSourceTB === null) return 1;
    if (b.totalSourceTB === null) return -1;
    return b.totalSourceTB - a.totalSourceTB;
  });
}
