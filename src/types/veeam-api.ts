export interface GfsPolicy {
  isDefined: boolean;
  weeks: number;
  months: number;
  years: number;
}

export interface RetentionPolicy {
  days: number;
  gfs: GfsPolicy;
  isGfsDefined: boolean;
}

export interface VmAgentRequest {
  sourceTB: number;
  ChangeRate: number;
  Reduction: number;
  backupWindowHours: number;
  GrowthRatePercent: number;
  GrowthRateScopeYears: number;
  blockGenerationDays: number;
  retention: RetentionPolicy;
  days: number;
  Weeklies: number;
  Monthlies: number;
  Yearlies: number;
  Blockcloning: boolean;
  ObjectStorage: boolean;
  moveCapacityTierEnabled: boolean;
  capacityTierDays: number;
  copyCapacityTierEnabled: boolean;
  immutablePerf: boolean;
  immutablePerfDays: number;
  immutableCap: boolean;
  immutableCapDays: number;
  archiveTierEnabled: boolean;
  archiveTierStandalone: boolean;
  archiveTierDays: number;
  isCapTierVDCV: boolean;
  isManaged: boolean;
  machineType: number;
  hyperVisor: number;
  calculatorMode: number;
  productVersion: number;
  instanceCount: number;
}

export interface ComputeVolume {
  diskGB: number;
  diskPurpose: number; // 3=perf, 13=capacity/cache, 4=logs
}

export interface ComputeSpec {
  cores: number;
  ram: number;
  volumes: ComputeVolume[];
}

export interface ComputeNode {
  compute: ComputeSpec;
}

export interface MonthlyTransactions {
  firstMonthTransactions: number;
  secondMonthTransactions: number;
  finalMonthTransactions: number;
}

export interface TransactionCosts {
  performanceTierTransactions?: MonthlyTransactions;
  capacityTierTransactions?: MonthlyTransactions;
  archiveTierTransactions?: MonthlyTransactions;
}

export interface VmAgentResponseData {
  totalStorageTB: number;
  proxyCompute: ComputeNode;
  repoCompute: ComputeNode;
  transactions: TransactionCosts;
  performanceTierImmutabilityTaxGB: number;
  capacityTierImmutabilityTaxGB: number;
}

export interface VmAgentResponse {
  success: boolean;
  data: VmAgentResponseData;
}
