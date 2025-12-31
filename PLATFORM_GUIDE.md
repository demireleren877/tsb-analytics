# TSB Analytics Platform - Kullanım Kılavuzu

## 🚀 Hızlı Başlangıç

### Ön Koşullar
- Node.js 18+
- npm veya yarn
- Cloudflare hesabı (ücretsiz plan yeterli)
- Cloudflare Wrangler CLI

### 1. Cloudflare Wrangler Kurulumu
```bash
npm install -g wrangler
wrangler login
```

### 2. Backend Kurulumu

#### D1 Database Oluşturma
```bash
cd backend
npm install

# D1 database oluştur
wrangler d1 create tsb-analytics-db

# Output'tan database_id'yi kopyala ve wrangler.toml'a ekle
```

#### Database Migration
```bash
# Migration dosyalarını uygula
npm run d1:migrate

# Database'i kontrol et
wrangler d1 execute tsb-analytics-db --command "SELECT * FROM companies LIMIT 5"
```

#### Backend Development
```bash
# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### 3. Veri Yükleme

#### Excel Verilerini D1'e Yükle
```bash
# Ana dizine dön
cd ..

# D1 uploader script'i çalıştır (yeni oluşturulacak)
npm run upload-to-d1
```

### 4. Frontend Kurulumu

```bash
cd frontend
npm install

# Development server
npm run dev

# Production build
npm run build

# Cloudflare Pages'e deploy
npm run deploy
```

## 📊 Platform Özellikleri

### 1. Dashboard (Ana Sayfa)

#### Genel Metrikkler Kartları
- **Toplam Prim Üretimi**: Seçili döneme göre
- **Toplam Hasar Ödemeleri**: Tüm branşlar
- **Pazar Büyüklüğü**: Aktif şirket sayısı
- **Ortalama Hasar/Prim Oranı**: Loss ratio

#### Grafik Bileşenleri

**1. Prim Gelişim Trendi (Line Chart)**
```
- X Axis: Dönemler (20201, 20202, ...)
- Y Axis: Net Prim (Milyon TL)
- Çizgiler: Toplam, Top 5 Şirket
- Özellik: Zoom, tooltip, legend toggle
```

**2. Branş Dağılımı (Pie/Donut Chart)**
```
- Veriler: Branş bazında toplam prim
- Renkler: Her branş farklı renk
- İnteraktif: Click ile detay
```

**3. Hasar/Prim Oranı (Bar Chart)**
```
- X Axis: Şirketler
- Y Axis: Loss Ratio (%)
- Renk Kodlama: Yeşil (iyi), Sarı (orta), Kırmızı (yüksek)
```

**4. YoY Büyüme (Multi-line Chart)**
```
- Comparison: Bu yıl vs geçen yıl
- Metrikler: Prim, Hasar, Net Kazanç
```

### 2. Şirket Analizi Sayfası

#### Filtreleme Özellikleri
- **Şirket Seçimi**: Dropdown (autocomplete)
- **Dönem Aralığı**: Date range picker
- **Branş Filtresi**: Multi-select
- **Metrik Seçimi**: Prim, Hasar, Net EP

#### Görünümler

**Trend Analizi**
- Son 8 çeyrek performansı
- Moving averages (3, 6 quarters)
- Growth rates (QoQ, YoY)

**Finansal Tablo**
```
| Dönem | Brüt Prim | Net Prim | Brüt Hasar | Net Hasar | Loss Ratio | Net EP |
|-------|-----------|----------|------------|-----------|------------|--------|
| 20253 | 1,234,567 | 987,654  | 678,901    | 567,890   | 57.6%      | ...    |
```
- Sortable columns
- Export: Excel, CSV, PDF
- Pagination

**Branş Performansı**
- Radar chart: Her branşta performans
- Stacked bar: Branş bazında prim/hasar

### 3. Karşılaştırmalı Analiz

#### Şirket Karşılaştırma
```
Şirket A     vs     Şirket B     vs     Şirket C
───────────────────────────────────────────────
Prim:       100M           150M           120M
Hasar:       60M            75M            70M
Loss:       60%            50%            58%
Growth:     +12%           +8%            +15%
```

#### Benchmark Analizi
- Sektör ortalaması ile karşılaştırma
- Percentile rankings
- Peer group comparison

#### Dönemsel Karşılaştırma
- **YoY**: 20251 vs 20241
- **QoQ**: 20253 vs 20252
- **PYE**: Current vs Previous Year End
- **PQ**: Current vs Previous Quarter

### 4. Raporlar & Export

#### Hazır Raporlar
1. **Üç Aylık Performans Raporu**
2. **Yıllık Özet Raporu**
3. **Branş Analiz Raporu**
4. **Şirket Karşılaştırma Raporu**

#### Özel Rapor Oluşturma
```
1. Filtreleri seç (şirket, dönem, branş)
2. Metrikleri seç
3. Grafik tiplerini belirle
4. Rapor adı ver ve kaydet
5. Export formatı seç (Excel/PDF)
```

#### Export Formatları

**Excel (.xlsx)**
- Tüm veriler
- Grafikler embedded
- Multiple sheets

**CSV (.csv)**
- Raw data
- Import-friendly

**PDF (.pdf)**
- Grafikler dahil
- Professional formatting
- Header/footer

**JSON (.json)**
- API data
- Developer-friendly

## 🎨 UI/UX Özellikleri

### Renk Paleti
```
Primary:    #3B82F6 (Blue)
Secondary:  #10B981 (Green)
Accent:     #F59E0B (Amber)
Danger:     #EF4444 (Red)
Success:    #22C55E (Green)
Warning:    #F59E0B (Yellow)
```

### Dark/Light Mode
- Otomatik sistem tercihi
- Manuel toggle
- Tüm komponentlerde destekli

### Responsive Design
- Mobile: 320px+
- Tablet: 768px+
- Desktop: 1024px+
- Large: 1440px+

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- High contrast mode

## 🔧 API Endpoints

### Companies
```http
GET /api/companies
GET /api/companies/:id
GET /api/companies/:id/data?period=20253&branch=701
```

### Data
```http
GET /api/data?company=1&period=20253&branch=701
GET /api/data/export?format=csv&filters=...
```

### Analytics
```http
GET /api/analytics/dashboard?period=20253
GET /api/analytics/trends?company=1&metric=net_premium
GET /api/analytics/rankings?metric=net_premium&limit=10
```

### Comparisons
```http
POST /api/comparisons/companies
Body: { companyIds: [1, 2, 3], period: "20253" }

GET /api/comparisons/yoy?company=1&currentPeriod=20253
GET /api/comparisons/qoq?company=1&currentPeriod=20253
```

## 📈 Performans Optimizasyonu

### Backend
- Database indexleme stratejisi
- Query caching (Cloudflare KV kullanılabilir)
- Connection pooling
- Pagination (limit/offset)

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

### Cloudflare Features
- CDN caching
- Minification
- Brotli compression
- HTTP/2

## 🔒 Güvenlik

### API Security
- CORS yapılandırması
- Rate limiting (100 req/min per IP)
- Input validation (Zod)
- SQL injection koruması

### Frontend Security
- Content Security Policy (CSP)
- XSS koruması
- HTTPS only
- Secure cookies

## 🐛 Troubleshooting

### Backend Sorunları

**Database bağlantı hatası**
```bash
# D1 database'in var olduğunu kontrol et
wrangler d1 list

# Migration durumunu kontrol et
wrangler d1 migrations list tsb-analytics-db
```

**API 500 hatası**
```bash
# Logs'u kontrol et
wrangler tail

# Local test
curl http://localhost:8787/api/companies
```

### Frontend Sorunları

**Build hatası**
```bash
# node_modules'ü temizle
rm -rf node_modules package-lock.json
npm install

# TypeScript hataları
npm run typecheck
```

**API bağlantı hatası**
- `.env` dosyasında `VITE_API_URL` kontrolü
- CORS ayarları
- Network tab kontrolü

## 📚 Kaynaklar

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)

---

**Yardım & Destek**
- GitHub Issues: [repository-url]/issues
- Email: support@tsb-analytics.com

**Son Güncelleme**: 2025-12-31
