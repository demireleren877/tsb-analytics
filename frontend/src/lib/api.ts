import axios from 'axios';
import type {
  Company,
  Branch,
  Period,
  DashboardData,
  CompanyRanking,
  TrendData,
  GrowthData,
  ComparisonData,
  YoYComparison,
} from '../types';

const API_BASE_URL = 'https://tsb-analytics-api.l5819033.workers.dev';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Companies
export const getCompanies = async (limit?: number, offset?: number): Promise<Company[]> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());

  const response = await api.get(`/api/companies?${params.toString()}`);
  return response.data.data;
};

export const getCompany = async (id: number): Promise<Company> => {
  const response = await api.get(`/api/companies/${id}`);
  return response.data.data;
};

// Branches
export const getBranches = async (): Promise<Branch[]> => {
  const response = await api.get('/api/data/branches');
  return response.data.data;
};

// Periods
export const getPeriods = async (): Promise<Period[]> => {
  const response = await api.get('/api/data/periods');
  return response.data.data;
};

// Analytics
export const getDashboard = async (period?: string, branch?: string, companyIds?: number[]): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (branch) params.append('branch', branch);
  if (companyIds && companyIds.length > 0) {
    companyIds.forEach(id => params.append('companies', id.toString()));
  }

  const queryString = params.toString();
  const response = await api.get(`/api/analytics/dashboard${queryString ? '?' + queryString : ''}`);
  return response.data.data;
};

export const getRankings = async (
  metric: string = 'net_premium',
  period?: string,
  branch?: string,
  limit: number = 10
): Promise<CompanyRanking[]> => {
  const params = new URLSearchParams();
  params.append('metric', metric);
  params.append('limit', limit.toString());
  if (period) params.append('period', period);
  if (branch) params.append('branch', branch);

  const response = await api.get(`/api/analytics/rankings?${params.toString()}`);
  return response.data.data;
};

export const getLossRatioRankings = async (
  period?: string,
  branch?: string,
  limit: number = 20
): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (period) params.append('period', period);
  if (branch) params.append('branch', branch);

  const response = await api.get(`/api/analytics/loss-ratio-rankings?${params.toString()}`);
  return response.data.data;
};

export const getTrends = async (
  company: number,
  metric: string = 'net_premium',
  periods: number = 8,
  branch?: string
): Promise<TrendData[]> => {
  const params = new URLSearchParams();
  params.append('company', company.toString());
  params.append('metric', metric);
  params.append('periods', periods.toString());
  if (branch) params.append('branch', branch);

  const response = await api.get(`/api/analytics/trends?${params.toString()}`);
  return response.data.data;
};

export const getGrowth = async (
  company: number,
  metric: string = 'net_premium',
  branch?: string
): Promise<GrowthData> => {
  const params = new URLSearchParams();
  params.append('company', company.toString());
  params.append('metric', metric);
  if (branch) params.append('branch', branch);

  const response = await api.get(`/api/analytics/growth?${params.toString()}`);
  return response.data.data;
};

// Comparisons
export const compareCompanies = async (
  companyIds: number[],
  period?: string,
  branch?: string
): Promise<ComparisonData[]> => {
  const response = await api.post('/api/comparisons/companies', {
    companyIds,
    period,
    branch,
  });
  return response.data.data;
};

export const getYoY = async (
  company: number,
  currentPeriod?: string
): Promise<YoYComparison> => {
  const params = new URLSearchParams();
  params.append('company', company.toString());
  if (currentPeriod) params.append('currentPeriod', currentPeriod);

  const response = await api.get(`/api/comparisons/yoy?${params.toString()}`);
  return response.data.data;
};
