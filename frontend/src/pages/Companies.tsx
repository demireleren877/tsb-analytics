import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import { getCompanies } from '../lib/api';
import { Card, CardContent } from '../components/Card';
import { Loading } from '../components/Loading';

export function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
  });

  const filteredCompanies = companies?.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code.includes(searchTerm)
  );

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Şirketler</h2>
        <p className="text-muted-foreground">Tüm sigorta şirketleri ve performans analizi</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Şirket ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Companies List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies?.map((company) => (
          <Card
            key={company.id}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate(`/company/${company.id}`)}
          >
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-none">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">Kod: {company.code}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-3 border-t">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {company.type}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Şirket bulunamadı</p>
        </div>
      )}
    </div>
  );
}
