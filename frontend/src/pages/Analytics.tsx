import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';
import { getRankings, getBranches, getPeriods, getDashboard } from '../lib/api';
import { formatCurrency, formatPercent, formatPeriod } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { MetricCard } from '../components/MetricCard';
import { useState } from 'react';

const METRICS = [
  { value: 'net_premium', label: 'Net Prim' },
  { value: 'net_payment', label: 'Net Ödeme' },
  { value: 'net_unreported', label: 'Muallak (Raporlanmayan)' },
  { value: 'net_earned_premium', label: 'Kazanılmış Prim' },
];

export function Analytics() {
  const [selectedMetric, setSelectedMetric] = useState('net_premium');
  const [selectedPeriod, setSelectedPeriod] = useState('20253');
  const [selectedBranch, setSelectedBranch] = useState('');

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: getPeriods,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', selectedPeriod, selectedBranch],
    queryFn: () => getDashboard(selectedPeriod, selectedBranch || undefined),
  });

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['rankings', selectedMetric, selectedPeriod, selectedBranch],
    queryFn: () =>
      getRankings(selectedMetric, selectedPeriod, selectedBranch || undefined, 20),
  });

  if (isLoading) return <Loading />;

  // Calculate market concentration (top 5 companies)
  const top5Premium = rankings?.slice(0, 5).reduce((sum, c) => sum + c.total, 0) || 0;
  const totalPremium = rankings?.reduce((sum, c) => sum + c.total, 0) || 1;
  const concentration = (top5Premium / totalPremium) * 100;

  // Branch performance data
  const branchData = dashboard?.branchDistribution.map((b) => ({
    code: b.code,
    premium: b.total_premium,
    claims: Math.abs(b.total_claims),
    loss_ratio: (Math.abs(b.total_claims) / b.total_premium) * 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Yönetim Raporları ve İstatistikler</h2>
        <p className="text-muted-foreground">Sektör performansı, pazar analizi ve risk göstergeleri</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metrik</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {METRICS.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="space-y-2">
              <label className="text-sm font-medium invisible">Action</label>
              <button
                onClick={() => {
                  setSelectedMetric('net_premium');
                  setSelectedPeriod('20253');
                  setSelectedBranch('');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Toplam Pazar Hacmi"
          value={formatCurrency(dashboard?.metrics.totalPremium || 0)}
          icon={<Award className="h-5 w-5" />}
        />
        <MetricCard
          title="Pazar Yoğunlaşması"
          value={`${concentration.toFixed(1)}%`}
          change="İlk 5 Şirket"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Sektör Loss Ratio"
          value={formatPercent(Math.abs(dashboard?.metrics.lossRatio || 0))}
          icon={<AlertCircle className="h-5 w-5" />}
          changeType={
            Math.abs(dashboard?.metrics.lossRatio || 0) > 80
              ? 'negative'
              : Math.abs(dashboard?.metrics.lossRatio || 0) < 60
              ? 'positive'
              : 'neutral'
          }
        />
        <MetricCard
          title="Aktif Şirket Sayısı"
          value={rankings?.length.toString() || '0'}
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      {/* Branch Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hazine Kodu Bazında Net Prim</CardTitle>
            <CardDescription>{formatPeriod(selectedPeriod)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
                <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                <Bar dataKey="premium" fill="#3b82f6" name="Net Prim" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hazine Kodu Bazında Loss Ratio</CardTitle>
            <CardDescription>Risk göstergeleri</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                <Tooltip formatter={(value: any) => formatPercent(value as number)} />
                <Bar dataKey="loss_ratio" fill="#f59e0b" name="Loss Ratio (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Market Concentration */}
      <Card>
        <CardHeader>
          <CardTitle>Pazar Yoğunlaşması Analizi</CardTitle>
          <CardDescription>İlk 10 şirketin toplam pazar içindeki payı</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={rankings?.slice(0, 10).map((company, index) => {
                const cumulativeShare = rankings
                  .slice(0, index + 1)
                  .reduce((sum, c) => sum + c.total, 0);
                return {
                  rank: index + 1,
                  name: company.name.substring(0, 15),
                  cumulative_share: (cumulativeShare / totalPremium) * 100,
                  individual_share: (company.total / totalPremium) * 100,
                };
              })}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rank" label={{ value: 'Sıralama', position: 'insideBottom', offset: -5 }} />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip formatter={(value: any) => `${(value as number).toFixed(2)}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulative_share"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Kümülatif Pazar Payı (%)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="individual_share"
                stroke="#10b981"
                strokeWidth={2}
                name="Bireysel Pazar Payı (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rankings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {METRICS.find((m) => m.value === selectedMetric)?.label} Sıralaması
          </CardTitle>
          <CardDescription>
            {formatPeriod(selectedPeriod)}
            {selectedBranch && ` - Hazine Kodu: ${selectedBranch}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={600}>
            <BarChart data={rankings || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(value) => `${(Math.abs(value) / 1_000_000_000).toFixed(1)}B`}
              />
              <YAxis dataKey="name" type="category" width={200} fontSize={11} />
              <Tooltip formatter={(value: any) => formatCurrency(Math.abs(value))} />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Sıralama ve Performans Tablosu</CardTitle>
          <CardDescription>Pazar payı ve performans analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Şirket</th>
                  <th className="text-left p-3">Kod</th>
                  <th className="text-right p-3">
                    {METRICS.find((m) => m.value === selectedMetric)?.label}
                  </th>
                  <th className="text-right p-3">Pazar Payı</th>
                  <th className="text-right p-3">Kümülatif Pay</th>
                </tr>
              </thead>
              <tbody>
                {rankings?.map((company, index) => {
                  const marketShare = (company.total / totalPremium) * 100;
                  const cumulativeShare =
                    (rankings.slice(0, index + 1).reduce((sum, c) => sum + c.total, 0) /
                      totalPremium) *
                    100;
                  return (
                    <tr key={company.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{index + 1}</span>
                          {index < 3 && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {index === 0 && <Award className="h-4 w-4 text-yellow-600" />}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{company.name}</td>
                      <td className="p-3 text-muted-foreground">{company.code}</td>
                      <td className="text-right p-3 font-mono">
                        {formatCurrency(Math.abs(company.total))}
                      </td>
                      <td className="text-right p-3 font-mono">
                        <span
                          className={`${
                            marketShare > 10
                              ? 'text-green-600 font-semibold'
                              : marketShare > 5
                              ? 'text-blue-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {marketShare.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right p-3 font-mono">{cumulativeShare.toFixed(2)}%</td>
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
