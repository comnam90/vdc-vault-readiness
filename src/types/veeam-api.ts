export interface VmAgentRequest {
  sourceTB: number;
  ChangeRate: number;
  Reduction: number;
  backupWindowHours: number;
  GrowthRatePercent: number;
  GrowthRateScopeYears: number;
  days: number;
  Weeklies: number;
  Monthlies: number;
  Yearlies: number;
  Blockcloning: boolean;
  ObjectStorage: boolean;
  moveCapacityTierEnabled: boolean;
  immutablePerf: boolean;
  immutablePerfDays: number;
  isCapTierVDCV: boolean;
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
