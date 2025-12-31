import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Building2, GitCompare, Home } from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Şirketler', href: '/companies', icon: Building2 },
  { name: 'Karşılaştırma', href: '/compare', icon: GitCompare },
  { name: 'Analizler', href: '/analytics', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">TSB Analytics</h1>
          </div>
          <nav className="ml-12 flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
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
      </div>
      <main className="container mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
