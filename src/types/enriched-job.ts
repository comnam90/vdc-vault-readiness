import type { SafeJob, SafeJobSession } from "@/types/domain";

export interface EnrichedJob extends SafeJob {
  sessionData: SafeJobSession | null;
}
