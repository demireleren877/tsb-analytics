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
  BarChart,
  Bar,
  ComposedChart,
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

  // Get trends for different metrics
  const { data: premiumTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_premium'],
    queryFn: () => getTrends(companyId, 'net_premium', 8),
    enabled: !!companyId,
  });

  const { data: paymentTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_payment'],
    queryFn: () => getTrends(companyId, 'net_payment', 8),
    enabled: !!companyId,
  });

  const { data: unreportedTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_unreported'],
    queryFn: () => getTrends(companyId, 'net_unreported', 8),
    enabled: !!companyId,
  });

  const { data: earnedTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_earned_premium'],
    queryFn: () => getTrends(companyId, 'net_earned_premium', 8),
    enabled: !!companyId,
  });

  const { data: incurredTrends } = useQuery({
    queryKey: ['trends', companyId, 'net_incurred'],
    queryFn: () => getTrends(companyId, 'net_incurred', 8),
    enabled: !!companyId,
  });

  const { data: growth } = useQuery({
    queryKey: ['growth', companyId],
    queryFn: () => getGrowth(companyId, 'net_premium'),
    enabled: !!companyId,
  });

  if (companyLoading) return <Loading />;

  // Combine all metrics by period
  const quarterlyData = premiumTrends?.map((item, index) => {
    // Calculate Net Ultimate for this period
    // Note: We don't have PYE data in trends, so this is a simplified calculation
    const netPayment = Math.abs(paymentTrends?.[index]?.value || 0);
    const netIncurred = Math.abs(incurredTrends?.[index]?.value || 0);
    const netUnreported = Math.abs(unreportedTrends?.[index]?.value || 0);
    const netEP = earnedTrends?.[index]?.value || 0;

    // Simplified Net Ultimate (without PYE delta since we don't have historical data in trends)
    const netUltimate = netPayment + netIncurred + netUnreported;
    const lossRatio = netEP > 0 ? (netUltimate / netEP) * 100 : 0;

    return {
      period: formatPeriod(item.period),
      net_payment: netPayment,
      net_incurred: netIncurred,
      net_unreported: netUnreported,
      net_earned_premium: netEP,
      net_ultimate: netUltimate,
      loss_ratio: lossRatio,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Quarterly Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Çeyreklik Metrikler</CardTitle>
          <CardDescription>Net Ödeme, Tahakkuk, Raporlanmayan, Kazanılmış Prim - Son 8 Çeyrek</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="net_payment"
                stroke="#ef4444"
                strokeWidth={2}
                name="Net Ödeme"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="net_incurred"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Net Tahakkuk"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="net_unreported"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Net Raporlanmayan"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="net_earned_premium"
                stroke="#10b981"
                strokeWidth={2}
                name="Kazanılmış Prim (EP)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Chart: Net EP, Net Ultimate, Loss Ratio */}
      <Card>
        <CardHeader>
          <CardTitle>Performans Göstergeleri</CardTitle>
          <CardDescription>Net EP, Net Ultimate ve Loss Ratio - Son 8 Çeyrek</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === 'Loss Ratio (%)') {
                    return `${(value as number).toFixed(2)}%`;
                  }
                  return formatCurrency(value as number);
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="net_earned_premium" fill="#10b981" name="Net EP" />
              <Bar yAxisId="left" dataKey="net_ultimate" fill="#f59e0b" name="Net Ultimate" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="loss_ratio"
                stroke="#ef4444"
                strokeWidth={3}
                name="Loss Ratio (%)"
                dot={{ r: 5, fill: '#ef4444' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Prim vs Net Ödeme */}
      <Card>
        <CardHeader>
          <CardTitle>Net Prim vs Net Ödeme</CardTitle>
          <CardDescription>Prim üretimi ve hasar karşılaştırması</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="net_premium" fill="#3b82f6" name="Net Prim" />
              <Bar dataKey="net_payment" fill="#ef4444" name="Net Ödeme" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loss Ratio Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Hasar Prim Oranı Trendi</CardTitle>
          <CardDescription>Dönemsel loss ratio analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip formatter={(value: any) => formatPercent(value as number)} />
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

      {/* Detailed Quarterly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Çeyreklik Analiz</CardTitle>
          <CardDescription>Son 8 çeyrek performans özeti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Dönem</th>
                  <th className="text-right p-3">Net Ödeme</th>
                  <th className="text-right p-3">Tahakkuk</th>
                  <th className="text-right p-3">Raporlanmayan</th>
                  <th className="text-right p-3">Kazanılmış Prim</th>
                  <th className="text-right p-3">Loss Ratio</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyData?.map((row) => (
                  <tr key={row.period} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-semibold">{row.period}</td>
                    <td className="text-right p-3 font-mono">
                      {formatCurrency(row.net_payment)}
                    </td>
                    <td className="text-right p-3 font-mono">
                      {formatCurrency(row.net_incurred)}
                    </td>
                    <td className="text-right p-3 font-mono">
                      {formatCurrency(row.net_unreported)}
                    </td>
                    <td className="text-right p-3 font-mono">
                      {formatCurrency(row.net_earned_premium)}
                    </td>
                    <td className="text-right p-3">
                      <span
                        className={`font-semibold ${
                          row.loss_ratio > 80
                            ? 'text-red-600'
                            : row.loss_ratio < 60
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {row.loss_ratio.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
