import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCompany, getTrends, getGrowth } from '../lib/api';
import { formatCurrency, formatPercent, formatPeriod } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { Loading } from '../components/Loading';

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id || '0');

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompany(companyId),
  });

  const { data: premiumTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_premium'],
    queryFn: () => getTrends(companyId, 'net_premium', 8),
    enabled: !!companyId,
  });

  const { data: claimsTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_payment'],
    queryFn: () => getTrends(companyId, 'net_payment', 8),
    enabled: !!companyId,
  });

  const { data: growth } = useQuery({
    queryKey: ['growth', companyId],
    queryFn: () => getGrowth(companyId, 'net_premium'),
    enabled: !!companyId,
  });

  if (companyLoading) return <Loading />;

  const trendData = premiumTrends?.map((item, index) => ({
    period: formatPeriod(item.period),
    net_premium: item.value,
    net_payment: Math.abs(claimsTrends?.[index]?.value || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/companies" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{company?.name}</h2>
          <p className="text-muted-foreground">Kod: {company?.code}</p>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Güncel Dönem Net Prim"
          value={formatCurrency(growth?.qoq.current || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Önceki Dönem Net Prim"
          value={formatCurrency(growth?.qoq.previous || 0)}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <MetricCard
          title="Çeyreksel Büyüme (QoQ)"
          value={formatPercent(growth?.qoq.growth || 0)}
          change={`${growth?.qoq.previousPeriod} → ${growth?.qoq.currentPeriod}`}
          changeType={
            (growth?.qoq.growth || 0) > 0
              ? 'positive'
              : (growth?.qoq.growth || 0) < 0
              ? 'negative'
              : 'neutral'
          }
          icon={
            (growth?.qoq.growth || 0) > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
        />
      </div>

      {/* Trend Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Finansal Performans Trendi</CardTitle>
          <CardDescription>Son 8 çeyrek</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="net_premium"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Net Prim"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="net_payment"
                stroke="#ef4444"
                strokeWidth={2}
                name="Net Hasar Ödemesi"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loss Ratio Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Hasar Prim Oranı</CardTitle>
          <CardDescription>Dönemsel loss ratio analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trendData?.map((item) => ({
                period: item.period,
                loss_ratio: (item.net_payment / item.net_premium) * 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip formatter={(value: any) => formatPercent(value)} />
              <Line
                type="monotone"
                dataKey="loss_ratio"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Loss Ratio (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
