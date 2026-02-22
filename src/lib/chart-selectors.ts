import type { SafeJob, SafeJobSession } from "@/types/domain";

export interface JobTypeChartDatum {
  jobType: string;
  totalTB: number;
}

export interface ChangeRateBucket {
  bucket: string;
  count: number;
  color: string;
}

export interface RepoChartDatum {
  repoName: string;
  totalTB: number;
}

const CHANGE_RATE_BUCKETS: { label: string; max: number; color: string }[] = [
  { label: "0–5%", max: 5, color: "var(--color-primary)" },
  { label: "5–10%", max: 10, color: "var(--color-primary)" },
  { label: "10–25%", max: 25, color: "oklch(0.85 0.15 85)" },
  { label: "25–50%", max: 50, color: "oklch(0.75 0.18 40)" },
  { label: ">50%", max: Infinity, color: "var(--color-destructive)" },
];

export function groupByJobType(jobs: SafeJob[]): JobTypeChartDatum[] {
  const map = new Map<string, number>();
  for (const job of jobs) {
    const prev = map.get(job.JobType) ?? 0;
    map.set(job.JobType, prev + (job.SourceSizeGB ?? 0));
  }
  return Array.from(map.entries())
    .map(([jobType, sumGB]) => ({ jobType, totalTB: sumGB / 1024 }))
    .sort((a, b) => b.totalTB - a.totalTB);
}

export function bucketChangeRates(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): ChangeRateBucket[] {
  const rateByJob = new Map<string, number>();
  for (const s of sessions) {
    if (s.AvgChangeRate != null) rateByJob.set(s.JobName, s.AvgChangeRate);
  }

  const counts = CHANGE_RATE_BUCKETS.map(() => 0);
  for (const job of jobs) {
    const rate = rateByJob.get(job.JobName);
    if (rate == null) continue;
    for (let i = 0; i < CHANGE_RATE_BUCKETS.length; i++) {
      if (rate <= CHANGE_RATE_BUCKETS[i].max) {
        counts[i]++;
        break;
      }
    }
  }

  return CHANGE_RATE_BUCKETS.map((b, i) => ({
    bucket: b.label,
    count: counts[i],
    color: b.color,
  }));
}

export function groupByRepo(jobs: SafeJob[]): RepoChartDatum[] {
  const map = new Map<string, number>();
  for (const job of jobs) {
    const prev = map.get(job.RepoName) ?? 0;
    map.set(job.RepoName, prev + (job.SourceSizeGB ?? 0));
  }
  return Array.from(map.entries())
    .map(([repoName, sumGB]) => ({ repoName, totalTB: sumGB / 1024 }))
    .sort((a, b) => b.totalTB - a.totalTB);
}
