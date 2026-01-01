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
  
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from 'recharts';
import { GitCompare, X, TrendingUp } from 'lucide-react';
import { getCompanies, compareCompanies, getPeriods, getBranches } from '../lib/api';
import { formatCurrency, formatPercent, formatPeriod } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';
import { useStore } from '../store/useStore';

export function Compare() {
  const { selectedPeriod } = useStore();
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: getPeriods,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const effectivePeriods = selectedPeriods.length > 0 ? selectedPeriods : [selectedPeriod];

  // Fetch data for all selected periods
  const { data: comparisonByPeriod, isLoading } = useQuery({
    queryKey: ['comparison-multi-period', selectedCompanies, effectivePeriods, selectedBranch],
    queryFn: async () => {
      const results = await Promise.all(
        effectivePeriods.map((period) =>
          compareCompanies(selectedCompanies, period, selectedBranch || undefined)
        )
      );
      return results;
    },
    enabled: selectedCompanies.length >= 2 && effectivePeriods.length > 0,
  });

  // For single period compatibility, get first period data
  const comparison = comparisonByPeriod?.[0];

  const toggleCompany = (companyId: number) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : prev.length < 10
        ? [...prev, companyId]
        : prev
    );
  };

  // Create company-based chart data (companies on X-axis, periods as bars)
  const companyDiscountChartData = comparison?.map((company) => {
    const companyObj: any = {
      name: company.name.substring(0, 15),
      fullName: company.name,
    };

    // Add discount rate for each selected period
    comparisonByPeriod?.forEach((periodData, periodIndex) => {
      const companyInPeriod = periodData?.find((c) => c.id === company.id);
      const periodLabel = formatPeriod(effectivePeriods[periodIndex]);
      companyObj[periodLabel] = companyInPeriod?.totals.discount_rate || 0;
    });

    return companyObj;
  }) || [];

  const chartData = comparison?.map((company) => {
    // Calculate Net Ultimate using correct formula:
    // Net Ödeme + Net Tahakkuk + Net Raporlanmayan - PYE_Net Tahakkuk - PYE_Net Raporlanmayan
    const netUltimate = Math.abs(company.totals.net_payment)
                      + Math.abs(company.totals.net_incurred)
                      + Math.abs(company.totals.net_unreported)
                      - Math.abs(company.totals.pye_net_incurred)
                      - Math.abs(company.totals.pye_net_unreported);

    const lossRatio = company.totals.net_earned_premium > 0
      ? (netUltimate / company.totals.net_earned_premium) * 100
      : 0;

    return {
      name: company.name.substring(0, 20),
      net_premium: company.totals.net_premium,
      net_payment: Math.abs(company.totals.net_payment),
      net_unreported: Math.abs(company.totals.net_unreported),
      net_earned_premium: company.totals.net_earned_premium,
      net_ultimate: netUltimate,
      loss_ratio: lossRatio,
      discount_rate: company.totals.discount_rate,
    };
  });

  // Market share calculation (used in table)
  const totalMarketPremium = comparison?.reduce((sum, c) => sum + c.totals.net_premium, 0) || 1;

  // Performance radar chart data
  const radarData = comparison?.map((company) => {
    const netUltimate = Math.abs(company.totals.net_payment)
                      + Math.abs(company.totals.net_incurred)
                      + Math.abs(company.totals.net_unreported)
                      - Math.abs(company.totals.pye_net_incurred)
                      - Math.abs(company.totals.pye_net_unreported);
    const lossRatio = company.totals.net_earned_premium > 0
      ? (netUltimate / company.totals.net_earned_premium) * 100
      : 0;
    const marketShare = (company.totals.net_premium / totalMarketPremium) * 100;
    return {
      company: company.name.substring(0, 15),
      'Prim Üretimi': (company.totals.net_premium / 1_000_000_000) * 10,
      'Loss Ratio Performansı': Math.max(0, 100 - lossRatio),
      'Pazar Payı': marketShare * 5,
      'EP/WP Oranı': (company.totals.net_earned_premium / company.totals.net_premium) * 100,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Yönetim Karşılaştırma Analizi</h2>
        <p className="text-muted-foreground">Şirketlerin performanslarını karşılaştırmalı olarak inceleyin</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dönem (Çoklu Seçim)</label>
              <div className="border rounded-md max-h-40 overflow-y-auto p-2 bg-background">
                {periods?.map((period) => (
                  <label
                    key={period.period}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeriods.includes(period.period)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPeriods((prev) => [...prev, period.period]);
                        } else {
                          setSelectedPeriods((prev) =>
                            prev.filter((p) => p !== period.period)
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{formatPeriod(period.period)}</span>
                  </label>
                ))}
              </div>
              {selectedPeriods.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedPeriods.length} dönem seçili
                </p>
              )}
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
              <label className="text-sm font-medium">Şirketler (Karşılaştırma için)</label>
              <div className="relative">
                <button
                  onClick={() => setShowCompanySelector(!showCompanySelector)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent flex items-center justify-between"
                >
                  <span>
                    {selectedCompanies.length > 0
                      ? `${selectedCompanies.length} şirket seçili`
                      : 'Şirket seçin...'}
                  </span>
                  <span className="text-xs">▼</span>
                </button>
                {showCompanySelector && (
                  <div className="absolute z-50 w-full mt-1 border rounded-md bg-background shadow-lg max-h-48 overflow-y-auto">
                    {companies?.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => toggleCompany(company.id)}
                          disabled={!selectedCompanies.includes(company.id) && selectedCompanies.length >= 10}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm flex-1">{company.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Companies Display */}
      {selectedCompanies.length > 0 && (
        <Card>
          <CardContent className="p-4">
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {selectedCompanies.length >= 2 && (
        <>
          {isLoading ? (
            <Loading />
          ) : (
            <div className="space-y-6">
              {/* Performance Overview Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Toplam Net Prim</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(comparison?.reduce((sum, c) => sum + c.totals.net_premium, 0) || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCompanies.length} şirket toplamı
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ortalama Loss Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercent(
                        (comparison?.reduce((sum, c) => sum + (Math.abs(c.totals.net_payment) / c.totals.net_premium) * 100, 0) || 0) /
                        (selectedCompanies.length || 1)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seçili şirketler ortalaması
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">En Yüksek Performans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {(() => {
                        if (!comparison || comparison.length === 0) return '-';
                        const bestCompany = comparison.reduce((best, company) => {
                          const netUltimate = Math.abs(company.totals.net_payment)
                                            + Math.abs(company.totals.net_incurred)
                                            + Math.abs(company.totals.net_unreported)
                                            - Math.abs(company.totals.pye_net_incurred)
                                            - Math.abs(company.totals.pye_net_unreported);
                          const lossRatio = company.totals.net_earned_premium > 0
                            ? (netUltimate / company.totals.net_earned_premium) * 100
                            : 999999;

                          const bestNetUltimate = Math.abs(best.totals.net_payment)
                                                + Math.abs(best.totals.net_incurred)
                                                + Math.abs(best.totals.net_unreported)
                                                - Math.abs(best.totals.pye_net_incurred)
                                                - Math.abs(best.totals.pye_net_unreported);
                          const bestLossRatio = best.totals.net_earned_premium > 0
                            ? (bestNetUltimate / best.totals.net_earned_premium) * 100
                            : 999999;

                          return lossRatio < bestLossRatio ? company : best;
                        });
                        return bestCompany.name.substring(0, 25);
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      En düşük loss ratio
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Multi-Metric Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Kapsamlı Performans Karşılaştırması</CardTitle>
                  <CardDescription>Net Prim, Net Ödeme, Muallak (Raporlanmayan), Kazanılmış Prim</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                      <YAxis tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="net_premium" fill="#3b82f6" name="Net Prim" />
                      <Bar dataKey="net_payment" fill="#ef4444" name="Net Ödeme" />
                      <Bar dataKey="net_unreported" fill="#f59e0b" name="Muallak" />
                      <Bar dataKey="net_earned_premium" fill="#10b981" name="Kazanılmış Prim" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Net EP, Net Ultimate and Loss Ratio Combined Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Net EP vs Net Ultimate ve Loss Ratio</CardTitle>
                  <CardDescription>Net Kazanılmış Prim, Net Ultimate (Sütun) ve Loss Ratio (Çizgi)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value.toFixed(0)}%`}
                      />
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

              {/* Discount Rate Comparison - Company Based with Period Bars */}
              {companyDiscountChartData.length > 0 && effectivePeriods.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>İskonto Oranı Karşılaştırması</CardTitle>
                    <CardDescription>Şirketler bazında dönemsel iskonto oranları karşılaştırması</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={companyDiscountChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                        <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                        <Tooltip
                          formatter={(value: any) => `${(value as number).toFixed(2)}%`}
                          labelFormatter={(label) => {
                            const company = companyDiscountChartData.find((c) => c.name === label);
                            return company?.fullName || label;
                          }}
                        />
                        <Legend />
                        {effectivePeriods.map((period, idx) => {
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
                          const periodLabel = formatPeriod(period);
                          return (
                            <Bar
                              key={period}
                              dataKey={periodLabel}
                              fill={colors[idx % colors.length]}
                              name={periodLabel}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Performance Radar Chart */}
              {radarData && radarData.length <= 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Çok Boyutlu Performans Analizi</CardTitle>
                    <CardDescription>Şirketlerin farklı metriklerdeki konumları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="company" fontSize={11} />
                        <PolarRadiusAxis />
                        <Tooltip />
                        <Legend />
                        <Radar name="Prim Üretimi" dataKey="Prim Üretimi" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Loss Ratio Performansı" dataKey="Loss Ratio Performansı" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Radar name="Pazar Payı" dataKey="Pazar Payı" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        <Radar name="EP/WP Oranı" dataKey="EP/WP Oranı" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detaylı Karşılaştırma Tablosu</CardTitle>
                  <CardDescription>{formatPeriod(selectedPeriod)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Sıra</th>
                          <th className="text-left p-3">Şirket</th>
                          <th className="text-right p-3">Net Prim</th>
                          <th className="text-right p-3">Net Ödeme</th>
                          <th className="text-right p-3">Muallak</th>
                          <th className="text-right p-3">Kazanılmış Prim</th>
                          <th className="text-right p-3">Loss Ratio</th>
                          <th className="text-right p-3">İskonto Oranı</th>
                          <th className="text-right p-3">Pazar Payı</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison?.map((company, index) => {
                          // Calculate Net Ultimate with correct formula
                          const netUltimate = Math.abs(company.totals.net_payment)
                                            + Math.abs(company.totals.net_incurred)
                                            + Math.abs(company.totals.net_unreported)
                                            - Math.abs(company.totals.pye_net_incurred)
                                            - Math.abs(company.totals.pye_net_unreported);
                          const lossRatio = company.totals.net_earned_premium > 0
                            ? (netUltimate / company.totals.net_earned_premium) * 100
                            : 0;
                          const marketShare = (company.totals.net_premium / totalMarketPremium) * 100;
                          return (
                            <tr key={company.id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold">{index + 1}</span>
                                  {index === 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
                                </div>
                              </td>
                              <td className="p-3 font-medium">{company.name}</td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(company.totals.net_premium)}
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(Math.abs(company.totals.net_payment))}
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(Math.abs(company.totals.net_unreported))}
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(company.totals.net_earned_premium)}
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
                              <td className="text-right p-3">
                                <span
                                  className={`font-semibold ${
                                    company.totals.discount_rate > 15
                                      ? 'text-green-600'
                                      : company.totals.discount_rate > 10
                                      ? 'text-blue-600'
                                      : 'text-yellow-600'
                                  }`}
                                >
                                  {company.totals.discount_rate.toFixed(2)}%
                                </span>
                              </td>
                              <td className="text-right p-3 font-mono">
                                {marketShare.toFixed(2)}%
                              </td>
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
