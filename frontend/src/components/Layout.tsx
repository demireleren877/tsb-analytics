import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Building2, GitCompare } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const navigation = [
  { name: 'Şirketler', href: '/companies', icon: Building2 },
  { name: 'Karşılaştırma', href: '/compare', icon: GitCompare },
  { name: 'Analizler', href: '/analytics', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6 justify-between">
          <div className="flex items-center space-x-12">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">TSB Analytics</h1>
                <p className="text-xs text-muted-foreground">Türkiye Sigorta Birliği</p>
              </div>
            </div>
            <nav className="flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <main className="container mx-auto p-6 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
