import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '₺0';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatPeriod(period: string): string {
  const year = period.substring(0, 4);
  const quarter = period.substring(4);
  return `${year} Q${quarter}`;
}

// Calculate Net Ultimate (Net Ödeme + Delta Net Muallak + Delta Net Raporlanmayan)
// This requires historical data, so we'll compute it when we have trend data
export interface UltimateData {
  net_payment: number;
  net_unreported: number;
  net_unreported_prev?: number;
  net_reported?: number;
  net_reported_prev?: number;
}

export function calculateNetUltimate(data: UltimateData): number {
  const deltaUnreported = data.net_unreported - (data.net_unreported_prev || 0);
  const deltaReported = (data.net_reported || 0) - (data.net_reported_prev || 0);
  return Math.abs(data.net_payment) + Math.abs(deltaUnreported) + Math.abs(deltaReported);
}

export function calculateLossRatio(netUltimate: number, netEP: number): number {
  if (netEP === 0) return 0;
  return (netUltimate / netEP) * 100;
}
