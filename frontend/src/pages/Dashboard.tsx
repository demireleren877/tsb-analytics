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
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle, X } from 'lucide-react';
import { getDashboard, getPeriods, getBranches, getCompanies } from '../lib/api';
import { formatCurrency, formatPercent, formatPeriod } from '../lib/utils';
import { MetricCard } from '../components/MetricCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('20253');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);

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

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', selectedPeriod],
    queryFn: () => getDashboard(selectedPeriod),
  });

  const toggleCompany = (companyId: number) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const removeCompany = (companyId: number) => {
    setSelectedCompanies((prev) => prev.filter((id) => id !== companyId));
  };

  if (isLoading) return <Loading />;

  // Filter data based on selections
  const filteredBranchData = selectedBranch
    ? dashboard?.branchDistribution.filter((b) => b.code === selectedBranch)
    : dashboard?.branchDistribution || [];

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
              <div className="space-y-2">
                <label className="text-sm font-medium">Dönem</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {periods?.map((period) => (
                    <option key={period.period} value={period.period}>
                      {formatPeriod(period.period)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hazine Kodu</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Tüm Branşlar</option>
                  {branches?.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {branch.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Şirketler (Çoklu Seçim)</label>
                <button
                  onClick={() => setShowCompanySelector(!showCompanySelector)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent"
                >
                  {selectedCompanies.length > 0
                    ? `${selectedCompanies.length} şirket seçili`
                    : 'Şirket seçin...'}
                </button>
              </div>
            </div>

            {/* Selected Companies */}
            {selectedCompanies.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedCompanies.map((companyId) => {
                    const company = companies?.find((c) => c.id === companyId);
                    return (
                      <div
                        key={companyId}
                        className="inline-flex items-center space-x-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm"
                      >
                        <span>{company?.name}</span>
                        <button
                          onClick={() => removeCompany(companyId)}
                          className="text-primary hover:text-primary/70"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Company Selector */}
            {showCompanySelector && (
              <div className="mt-4 max-h-64 overflow-y-auto border rounded-md p-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {companies?.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleCompany(company.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{company.name}</span>
                  </label>
                ))}
              </div>
            )}
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
                  formatter={(value: any) => formatCurrency(value as number)}
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
                <Tooltip formatter={(value: any) => `${(value as number).toFixed(2)}%`} />
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
          <CardDescription>{formatPeriod(selectedPeriod)}</CardDescription>
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
