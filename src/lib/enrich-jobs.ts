import type { SafeJob, SafeJobSession } from "@/types/domain";
import type { EnrichedJob } from "@/types/enriched-job";

export function enrichJobs(
  jobs: SafeJob[],
  sessions: SafeJobSession[],
): EnrichedJob[] {
  const sessionMap = new Map<string, SafeJobSession>();

  // jobSessionSummaryByJob is expected to provide one row per JobName.
  // If duplicates appear, keep the last row seen for deterministic behavior.
  for (const session of sessions) {
    sessionMap.set(session.JobName, session);
  }

  return jobs.map((job) => ({
    ...job,
    sessionData: sessionMap.get(job.JobName) ?? null,
  }));
}
