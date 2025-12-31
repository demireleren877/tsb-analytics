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

// Calculate Net Ultimate
// Formula: Net Ödeme + Net Tahakkuk + Net Raporlanmayan - PYE_Net Tahakkuk - PYE_Net Raporlanmayan
export interface UltimateData {
  net_payment: number;
  net_incurred: number;
  net_unreported: number;
  pye_net_incurred: number;
  pye_net_unreported: number;
}

export function calculateNetUltimate(data: UltimateData): number {
  return Math.abs(data.net_payment)
       + Math.abs(data.net_incurred)
       + Math.abs(data.net_unreported)
       - Math.abs(data.pye_net_incurred)
       - Math.abs(data.pye_net_unreported);
}

export function calculateLossRatio(netUltimate: number, netEP: number): number {
  if (netEP === 0) return 0;
  return (netUltimate / netEP) * 100;
}
