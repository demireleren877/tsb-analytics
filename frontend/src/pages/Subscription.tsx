import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Mail, CheckCircle, AlertCircle, Loader2, Users, Calendar, Clock } from 'lucide-react';
import { subscribe, getSubscriptionStats, getLatestCheck } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { formatPeriod } from '../lib/utils';

export function Subscription() {
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Veri Bildirimleri</h2>
        <p className="text-muted-foreground mt-2">
          TSB'de yeni veri yayınlandığında e-posta ile bilgilendirilmek için abone olun
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktif Abone</p>
                <p className="text-2xl font-bold">{stats?.activeSubscribers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Veri Dönemi</p>
                <p className="text-2xl font-bold">
                  {latestCheck?.latestPeriod ? formatPeriod(latestCheck.latestPeriod) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kontrol Sıklığı</p>
                <p className="text-2xl font-bold">15 Dakika</p>
                <p className="text-xs text-muted-foreground">Otomatik kontrol</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            E-posta Aboneliği
          </CardTitle>
          <CardDescription>
            Yeni TSB verisi yayınlandığında size otomatik olarak e-posta gönderilecektir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-lg border border-input bg-background text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={subscribeMutation.isPending}
                />
              </div>
              <button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="h-12 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {subscribeMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Bell className="h-5 w-5" />
                    Abone Ol
                  </>
                )}
              </button>
            </div>

            {message && (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>Nasıl Çalışır?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Abone Olun</h4>
                <p className="text-sm text-muted-foreground">
                  E-posta adresinizi girerek bildirim listesine kaydolun
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Otomatik Kontrol</h4>
                <p className="text-sm text-muted-foreground">
                  Sistem her 15 dakikada bir TSB web sitesini yeni veri için kontrol eder
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Anında Bildirim</h4>
                <p className="text-sm text-muted-foreground">
                  Yeni veri tespit edildiğinde size e-posta ile bildirim gönderilir
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Bildirim İçeriği</h4>
              <p className="text-sm text-muted-foreground">
                TSB'de yeni "Şirketler Gelir Tablosu Detay" verisi yayınlandığında, hangi dönem için veri
                yayınlandığını ve TSB Analytics'e erişim bilgilerini içeren bir e-posta alırsınız.
                Her e-postada abonelikten çıkmak için bir bağlantı bulunur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
