import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingDown, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { getDashboard, getPeriods, getRankings } from '../lib/api';
import { formatCurrency, formatNumber, formatPercent, formatPeriod } from '../lib/utils';
import { MetricCard } from '../components/MetricCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { useStore } from '../store/useStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function Dashboard() {
  const { selectedPeriod, setSelectedPeriod } = useStore();

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: getPeriods,
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', selectedPeriod],
    queryFn: () => getDashboard(selectedPeriod),
  });

  const { data: rankings } = useQuery({
    queryKey: ['rankings', selectedPeriod],
    queryFn: () => getRankings('net_premium', selectedPeriod, undefined, 10),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Türkiye Sigorta Birliği - Finansal Analiz Platformu</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Dönem:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {periods?.map((period) => (
              <option key={period.period} value={period.period}>
                {formatPeriod(period.period)}
              </option>
            ))}
          </select>
        </div>
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
          title="Aktif Şirket"
          value={formatNumber(dashboard?.metrics.activeCompanies || 0)}
          icon={<Users className="h-5 w-5" />}
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
        {/* Branch Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Branş Bazında Dağılım</CardTitle>
            <CardDescription>Net prim üretimi (TRY)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboard?.branchDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis
                  tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value as number)}
                  labelStyle={{ color: '#000' }}
                />
                <Bar dataKey="total_premium" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Market Share */}
        <Card>
          <CardHeader>
            <CardTitle>Pazar Payı</CardTitle>
            <CardDescription>Branşlara göre dağılım</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(dashboard?.branchDistribution || []) as any}
                  dataKey="total_premium"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => entry.name}
                  fontSize={12}
                >
                  {dashboard?.branchDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      <Card>
        <CardHeader>
          <CardTitle>En Yüksek Prim Üretimi</CardTitle>
          <CardDescription>İlk 10 şirket</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={rankings || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
              <YAxis dataKey="name" type="category" width={200} fontSize={12} />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Bar dataKey="total" fill="#10b981">
                {rankings?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
