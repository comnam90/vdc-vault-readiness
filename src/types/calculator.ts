export interface CalculatorSummary {
  totalSourceDataTB: number | null;
  weightedAvgChangeRate: number | null;
  immutabilityDays: number;
  maxRetentionDays: number | null;
  originalMaxRetentionDays: number | null;
  gfsWeekly: number | null;
  gfsMonthly: number | null;
  gfsYearly: number | null;
}
