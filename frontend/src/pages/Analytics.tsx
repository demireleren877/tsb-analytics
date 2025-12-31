import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { getRankings, getBranches, getPeriods } from '../lib/api';
import { formatCurrency, formatPeriod } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { useState } from 'react';

const METRICS = [
  { value: 'net_premium', label: 'Net Prim' },
  { value: 'net_payment', label: 'Hasar Ödemesi' },
  { value: 'net_earned_premium', label: 'Kazanılmış Prim' },
  { value: 'net_incurred', label: 'Tahakkuk Eden' },
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

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['rankings', selectedMetric, selectedPeriod, selectedBranch],
    queryFn: () =>
      getRankings(selectedMetric, selectedPeriod, selectedBranch || undefined, 20),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analizler</h2>
        <p className="text-muted-foreground">Detaylı performans analizi ve sıralamalar</p>
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
              <label className="text-sm font-medium">Branş</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tüm Branşlar</option>
                {branches?.map((branch) => (
                  <option key={branch.code} value={branch.code}>
                    {branch.name}
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

      {/* Rankings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {METRICS.find((m) => m.value === selectedMetric)?.label} Sıralaması
          </CardTitle>
          <CardDescription>
            {formatPeriod(selectedPeriod)}
            {selectedBranch && ` - ${branches?.find((b) => b.code === selectedBranch)?.name}`}
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

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Sıralama Tablosu</CardTitle>
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
                </tr>
              </thead>
              <tbody>
                {rankings?.map((company, index) => (
                  <tr key={company.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{index + 1}</span>
                        {index < 3 && <TrendingUp className="h-4 w-4 text-primary" />}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{company.name}</td>
                    <td className="p-3 text-muted-foreground">{company.code}</td>
                    <td className="text-right p-3 font-mono">
                      {formatCurrency(Math.abs(company.total))}
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
