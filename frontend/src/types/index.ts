export interface Company {
  id: number;
  code: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  code: string;
  name: string;
  description: string;
}

export interface Period {
  period: string;
  year: number;
  quarter: number;
}

export interface FinancialData {
  id: number;
  company_id: number;
  branch_code: string;
  period: string;
  gross_written_premium: number;
  net_premium: number;
  net_payment: number;
  net_earned_premium: number;
  net_incurred: number;
  net_unreported: number;
}

export interface DashboardMetrics {
  totalPremium: number;
  totalClaims: number;
  activeCompanies: number;
  lossRatio: number;
}

export interface BranchDistribution {
  code: string;
  name: string;
  total_premium: number;
  total_claims: number;
  company_count: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  branchDistribution: BranchDistribution[];
}

export interface CompanyRanking {
  id: number;
  name: string;
  code: string;
  total: number;
}

export interface TrendData {
  period: string;
  value: number;
}

export interface GrowthData {
  qoq: {
    current: number;
    previous: number;
    growth: number;
    currentPeriod: string;
    previousPeriod: string;
  };
}

export interface ComparisonData {
  id: number;
  name: string;
  code: string;
  branches: {
    code: string;
    name: string;
    gross_premium: number;
    net_premium: number;
    net_payment: number;
    net_earned_premium: number;
    net_incurred: number;
    net_unreported: number;
    pye_net_incurred: number;
    pye_net_unreported: number;
    discount_provision: number;
    gross_incurred: number;
    gross_unreported: number;
    discount_rate: number;
  }[];
  totals: {
    gross_premium: number;
    net_premium: number;
    net_payment: number;
    net_earned_premium: number;
    net_incurred: number;
    net_unreported: number;
    pye_net_incurred: number;
    pye_net_unreported: number;
    discount_provision: number;
    gross_incurred: number;
    gross_unreported: number;
    discount_rate: number;
  };
}

export interface YoYComparison {
  current: {
    period: string;
    net_premium: number;
    net_payment: number;
    net_earned_premium: number;
  };
  previous: {
    period: string;
    net_premium: number;
    net_payment: number;
    net_earned_premium: number;
  };
  growth: {
    net_premium: number;
    net_payment: number;
    net_earned_premium: number;
  };
}

export interface CompanyPerformanceData {
  period: string;
  net_premium: number;
  net_payment: number;
  net_incurred: number;
  net_unreported: number;
  net_earned_premium: number;
  pye_net_incurred: number;
  pye_net_unreported: number;
}
