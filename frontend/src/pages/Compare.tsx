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
  Legend,
} from 'recharts';
import { GitCompare, Plus, X } from 'lucide-react';
import { getCompanies, compareCompanies, getPeriods } from '../lib/api';
import { formatCurrency, formatPeriod } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { useStore } from '../store/useStore';

export function Compare() {
  const { selectedPeriod, setSelectedPeriod } = useStore();
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: getPeriods,
  });

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['comparison', selectedCompanies, selectedPeriod],
    queryFn: () => compareCompanies(selectedCompanies, selectedPeriod),
    enabled: selectedCompanies.length >= 2,
  });

  const toggleCompany = (companyId: number) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : prev.length < 5
        ? [...prev, companyId]
        : prev
    );
  };

  const chartData = comparison?.map((company) => ({
    name: company.name.substring(0, 20),
    net_premium: company.totals.net_premium,
    net_payment: Math.abs(company.totals.net_payment),
    net_earned_premium: company.totals.net_earned_premium,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Şirket Karşılaştırma</h2>
          <p className="text-muted-foreground">Birden fazla şirketi karşılaştırarak analiz edin</p>
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

      {/* Company Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Seçili Şirketler ({selectedCompanies.length}/5)</h3>
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="inline-flex items-center space-x-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Şirket Ekle</span>
              </button>
            </div>

            {/* Selected Companies */}
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
                      onClick={() => toggleCompany(companyId)}
                      className="text-primary hover:text-primary/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {selectedCompanies.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Karşılaştırma için en az 2 şirket seçin
                </p>
              )}
            </div>

            {/* Company List */}
            {showSelector && (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto border rounded-md p-4">
                {companies?.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleCompany(company.id)}
                      disabled={!selectedCompanies.includes(company.id) && selectedCompanies.length >= 5}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{company.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {selectedCompanies.length >= 2 && (
        <>
          {isLoading ? (
            <Loading />
          ) : (
            <div className="space-y-6">
              {/* Net Premium Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Net Prim Karşılaştırması</CardTitle>
                  <CardDescription>{formatPeriod(selectedPeriod)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                      <Bar dataKey="net_premium" fill="#3b82f6" name="Net Prim" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Multi-Metric Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Detaylı Karşılaştırma</CardTitle>
                  <CardDescription>Net prim, hasar ve kazanılmış prim</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="net_premium" fill="#3b82f6" name="Net Prim" />
                      <Bar dataKey="net_payment" fill="#ef4444" name="Hasar Ödemesi" />
                      <Bar dataKey="net_earned_premium" fill="#10b981" name="Kazanılmış Prim" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table View */}
              <Card>
                <CardHeader>
                  <CardTitle>Detaylı Tablo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Şirket</th>
                          <th className="text-right p-2">Net Prim</th>
                          <th className="text-right p-2">Hasar Ödemesi</th>
                          <th className="text-right p-2">Kazanılmış Prim</th>
                          <th className="text-right p-2">Loss Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison?.map((company) => {
                          const lossRatio =
                            (Math.abs(company.totals.net_payment) / company.totals.net_premium) * 100;
                          return (
                            <tr key={company.id} className="border-b">
                              <td className="p-2 font-medium">{company.name}</td>
                              <td className="text-right p-2">
                                {formatCurrency(company.totals.net_premium)}
                              </td>
                              <td className="text-right p-2">
                                {formatCurrency(Math.abs(company.totals.net_payment))}
                              </td>
                              <td className="text-right p-2">
                                {formatCurrency(company.totals.net_earned_premium)}
                              </td>
                              <td className="text-right p-2">{lossRatio.toFixed(2)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {selectedCompanies.length < 2 && (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Şirket Karşılaştırması</p>
            <p className="text-muted-foreground">
              Karşılaştırma yapmak için yukarıdan en az 2 şirket seçin
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
