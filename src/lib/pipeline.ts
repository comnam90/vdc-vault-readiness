import type { HealthcheckRoot } from "@/types/healthcheck";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { zipSection } from "./parser";
import { normalizeHealthcheck } from "./normalizer";
import { validateHealthcheck } from "./validator";

export interface AnalysisResult {
  data: NormalizedDataset;
  validations: ValidationResult[];
}

/**
 * Full analysis pipeline: raw JSON → zip sections → normalize → validate.
 *
 * Licenses are passed through directly (they're already objects at the top level).
 * Sections (backupServer, securitySummary, jobInfo, jobSessionSummaryByJob) use Headers/Rows and need zipping.
 */
export function analyzeHealthcheck(raw: HealthcheckRoot): AnalysisResult {
  const sections = raw.Sections ?? {};

  const parsed = {
    backupServer: zipSection(sections.backupServer),
    securitySummary: zipSection(sections.securitySummary),
    jobInfo: zipSection(sections.jobInfo),
    Licenses: Array.isArray(raw.Licenses) ? raw.Licenses : [],
    sobr: zipSection(sections.sobr),
    capextents: zipSection(sections.capextents),
    archextents: zipSection(sections.archextents),
  };

  const sessionData = zipSection(sections.jobSessionSummaryByJob);
  const data = normalizeHealthcheck(parsed, sessionData);
  const validations = validateHealthcheck(data);

  return { data, validations };
}
