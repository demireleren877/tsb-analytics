import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { getDashboard, getPeriods, getBranches, getCompanies } from '../lib/api';
import { formatCurrency, formatPercent, formatPeriod } from '../lib/utils';
import { MetricCard } from '../components/MetricCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { MultiSelect } from '../components/MultiSelect';

export function Dashboard() {
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(['20253']);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: getPeriods,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
  });

  // Use first selected period for API call (API currently supports single period)
  const effectivePeriod = selectedPeriods[0] || '20253';
  // Use all selected branches (or undefined for all)
  const effectiveBranches = selectedBranches.length > 0 ? selectedBranches : undefined;
  // Convert string IDs to numbers
  const effectiveCompanyIds = selectedCompanyIds.map((id) => parseInt(id));

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', effectivePeriod, effectiveBranches, effectiveCompanyIds],
    queryFn: () => getDashboard(effectivePeriod, effectiveBranches, effectiveCompanyIds.length > 0 ? effectiveCompanyIds : undefined),
  });

  if (isLoading) return <Loading />;

  // Filter data based on selections
  const filteredBranchData = selectedBranches.length > 0
    ? dashboard?.branchDistribution.filter((b) => selectedBranches.includes(b.code))
    : dashboard?.branchDistribution || [];

  // Prepare options for MultiSelect
  const periodOptions = periods?.map((p) => ({
    value: p.period,
    label: formatPeriod(p.period),
  })) || [];

  const branchOptions = branches?.map((b) => ({
    value: b.code,
    label: `${b.code} - ${b.name}`,
  })) || [];

  const companyOptions = companies?.map((c) => ({
    value: c.id.toString(),
    label: c.name,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Yönetim Dashboard</h2>
        <p className="text-muted-foreground mb-6">Türkiye Sigorta Birliği - Finansal Analiz Platformu</p>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Period Filter */}
              <MultiSelect
                label="Dönem"
                options={periodOptions}
                selected={selectedPeriods}
                onChange={setSelectedPeriods}
                placeholder="Dönem seçin..."
                allLabel="Tüm Dönemler"
                showAllOption={false}
              />

              {/* Branch Filter */}
              <MultiSelect
                label="Hazine Kodu"
                options={branchOptions}
                selected={selectedBranches}
                onChange={setSelectedBranches}
                placeholder="Tüm Branşlar"
                allLabel="Tüm Branşlar"
              />

              {/* Company Filter */}
              <MultiSelect
                label="Şirketler"
                options={companyOptions}
                selected={selectedCompanyIds}
                onChange={setSelectedCompanyIds}
                placeholder="Tüm Şirketler"
                allLabel="Tüm Şirketler"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Toplam Net Prim"
          value={formatCurrency(dashboard?.metrics.totalPremium || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Toplam Hasar Ödemesi"
          value={formatCurrency(Math.abs(dashboard?.metrics.totalClaims || 0))}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <MetricCard
          title="Kazanılmış Prim"
          value={formatCurrency(dashboard?.metrics.totalPremium || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Loss Ratio"
          value={formatPercent(Math.abs(dashboard?.metrics.lossRatio || 0))}
          icon={<AlertTriangle className="h-5 w-5" />}
          changeType={
            Math.abs(dashboard?.metrics.lossRatio || 0) > 80
              ? 'negative'
              : Math.abs(dashboard?.metrics.lossRatio || 0) < 60
              ? 'positive'
              : 'neutral'
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Hazine Kodu Bazında Performans</CardTitle>
            <CardDescription>Net prim üretimi (₺)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredBranchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" fontSize={12} />
                <YAxis
                  tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  labelFormatter={(label) => `Hazine Kodu: ${label}`}
                />
                <Bar dataKey="total_premium" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loss Ratio by Branch */}
        <Card>
          <CardHeader>
            <CardTitle>Branş Bazlı Hasar Oranı</CardTitle>
            <CardDescription>Loss ratio (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={(filteredBranchData || []).map((b) => ({
                  code: b.code,
                  loss_ratio: (Math.abs(b.total_claims) / b.total_premium) * 100,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" fontSize={12} />
                <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} fontSize={12} />
                <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                <Bar dataKey="loss_ratio" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Branch Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Branş Analizi</CardTitle>
          <CardDescription>{formatPeriod(effectivePeriod)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Hazine Kodu</th>
                  <th className="text-right p-3">Net Prim</th>
                  <th className="text-right p-3">Hasar Ödemesi</th>
                  <th className="text-right p-3">Kazanılmış Prim</th>
                  <th className="text-right p-3">Loss Ratio</th>
                  <th className="text-right p-3">Şirket Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {(filteredBranchData || []).map((branch) => {
                  const lossRatio = (Math.abs(branch.total_claims) / branch.total_premium) * 100;
                  return (
                    <tr key={branch.code} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-semibold">{branch.code}</td>
                      <td className="text-right p-3 font-mono">
                        {formatCurrency(branch.total_premium)}
                      </td>
                      <td className="text-right p-3 font-mono">
                        {formatCurrency(Math.abs(branch.total_claims))}
                      </td>
                      <td className="text-right p-3 font-mono">
                        {formatCurrency(branch.total_premium)}
                      </td>
                      <td className="text-right p-3">
                        <span
                          className={`font-semibold ${
                            lossRatio > 80
                              ? 'text-red-600'
                              : lossRatio < 60
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {lossRatio.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right p-3">{branch.company_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
