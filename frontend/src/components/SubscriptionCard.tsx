import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { subscribe, getSubscriptionStats, getLatestCheck } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { formatPeriod } from '../lib/utils';

export function SubscriptionCard() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: getSubscriptionStats,
  });

  const { data: latestCheck } = useQuery({
    queryKey: ['latest-check'],
    queryFn: getLatestCheck,
  });

  const subscribeMutation = useMutation({
    mutationFn: subscribe,
    onSuccess: (data) => {
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Abone oldunuz!' });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Bir hata oluştu' });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Bir hata oluştu';
      setMessage({ type: 'error', text: errorMessage });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'E-posta adresi giriniz' });
      return;
    }
    setMessage(null);
    subscribeMutation.mutate(email.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Veri Bildirimleri
        </CardTitle>
        <CardDescription>
          Yeni TSB verisi yayınlandığında e-posta ile bilgilendirilmek için abone olun
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={subscribeMutation.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {subscribeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                'Abone Ol'
              )}
            </button>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {message.text}
            </div>
          )}
        </form>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {stats && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{stats.activeSubscribers}</span>
                <span>aktif abone</span>
              </div>
            )}
            {latestCheck?.latestPeriod && (
              <div className="flex items-center gap-1">
                <span>Son veri:</span>
                <span className="font-medium text-foreground">
                  {formatPeriod(latestCheck.latestPeriod)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
