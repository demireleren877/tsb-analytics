# TSB Analytics Platform - Deployment Guide

## 🎉 Projeye Genel Bakış

TSB (Türkiye Sigorta Birliği) finansal verilerini analiz eden modern, full-stack bir analytics platformu.

### 📊 Özellikler

#### Backend (Cloudflare Workers + D1)
- ✅ **13 API Endpoint** - Companies, Analytics, Comparisons, Data
- ✅ **7,119 Finansal Kayıt** - 23 dönem, 53 şirket, 7 branş
- ✅ **Cloudflare D1 Database** - 2.27 MB veri
- ✅ **Production'da Canlı**: https://tsb-analytics-api.l5819033.workers.dev

#### Frontend (React + TypeScript + Vite)
- ✅ **5 Sayfa** - Dashboard, Companies, Company Detail, Compare, Analytics
- ✅ **Modern UI** - Tailwind CSS + Custom Components
- ✅ **Interactive Charts** - Recharts ile görselleştirme
- ✅ **State Management** - Zustand + React Query
- ✅ **Production Build** - dist/ klasöründe hazır

## 🚀 Backend Deployment (Tamamlandı)

### Cloudflare Workers + D1

```bash
cd backend
npx wrangler login          # ✅ Tamamlandı
npx wrangler d1 create tsb-analytics-db  # ✅ Tamamlandı
npx wrangler d1 migrations apply tsb-analytics-db --remote  # ✅ Tamamlandı
npm run deploy              # ✅ Tamamlandı
```

**API URL**: https://tsb-analytics-api.l5819033.workers.dev

### Test Endpoints

```bash
# Health Check
curl https://tsb-analytics-api.l5819033.workers.dev/

# Dashboard
curl https://tsb-analytics-api.l5819033.workers.dev/api/analytics/dashboard?period=20253

# Companies
curl https://tsb-analytics-api.l5819033.workers.dev/api/companies?limit=10

# Rankings
curl https://tsb-analytics-api.l5819033.workers.dev/api/analytics/rankings?metric=net_premium&limit=10
```

## 🌐 Frontend Deployment

### Option 1: Cloudflare Pages (Önerilen)

```bash
cd frontend
npx wrangler pages deploy dist --project-name=tsb-analytics

# Veya Cloudflare Dashboard'dan:
# 1. Pages > Create a project
# 2. Upload dist/ klasörünü
# 3. Deploy!
```

### Option 2: Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Option 3: Netlify

```bash
cd frontend
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Local Test

```bash
cd frontend
npm run dev
# http://localhost:5173
```

## 📁 Proje Yapısı

```
tsb_scrap/
├── backend/                 # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts        # Ana API
│   │   └── routes/         # Endpoint'ler
│   ├── migrations/         # D1 schema
│   └── wrangler.toml       # Cloudflare config
│
├── frontend/                # React Dashboard
│   ├── src/
│   │   ├── pages/          # Sayfalar
│   │   ├── components/     # UI Components
│   │   ├── lib/           # API client, utils
│   │   └── store/         # State management
│   └── dist/              # Production build
│
├── src/                     # Data scrapers
│   ├── d1-uploader.ts      # Excel → D1
│   ├── combine-data.ts     # Data birleştirici
│   └── api-download.ts     # TSB API scraper
│
└── datas/
    ├── combined_data.xlsx  # Birleştirilmiş data
    └── upload.sql          # D1 SQL dump
```

## 🔑 API Endpoints

### Companies
- `GET /api/companies` - Tüm şirketler
- `GET /api/companies/:id` - Şirket detayı
- `GET /api/companies/:id/data` - Şirket finansal verileri

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrikleri
- `GET /api/analytics/trends` - Trend verileri
- `GET /api/analytics/rankings` - Sıralama
- `GET /api/analytics/growth` - Büyüme oranları

### Comparisons
- `POST /api/comparisons/companies` - Şirket karşılaştırma
- `GET /api/comparisons/yoy` - Year over Year
- `GET /api/comparisons/qoq` - Quarter over Quarter

### Data
- `GET /api/data` - Filtrelenmiş veriler
- `GET /api/data/branches` - Branş listesi
- `GET /api/data/periods` - Dönem listesi

## 📊 Veri Yapısı

### Database Tables
- `companies` (53 kayıt) - Sigorta şirketleri
- `branch_codes` (7 kayıt) - Branş kodları
- `periods` (23 kayıt) - Dönemler (2020-2025)
- `financial_data` (7,119 kayıt) - Finansal veriler

### Metrics
- Net Prim (Net Premium)
- Hasar Ödemesi (Net Payment)
- Kazanılmış Prim (Net Earned Premium)
- Loss Ratio
- QoQ & YoY Growth

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev        # Local Wrangler dev server
npm run deploy     # Deploy to Cloudflare
npm run tail       # View logs
```

### Frontend Development
```bash
cd frontend
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
```

### Data Pipeline
```bash
# 1. TSB API'den veri çek
npm run api-download

# 2. Excel dosyalarını birleştir
npm run combine

# 3. D1'e yükle
npm run upload-to-d1

# 4. Deploy backend
cd backend && npm run deploy
```

## 📈 Performance

- **Backend Response Time**: ~200ms
- **Database Size**: 2.27 MB
- **Frontend Bundle**: 730 KB (gzipped: 225 KB)
- **API Regions**: EEUR (Frankfurt)

## 🔒 Security

- CORS enabled
- SQL injection protected (parameterized queries)
- Rate limiting (Cloudflare)
- Input validation

## 📝 Environment Variables

Backend (`wrangler.toml`):
```toml
[vars]
ALLOWED_ORIGINS = "*"
API_VERSION = "v1"
```

Frontend (`.env` - isteğe bağlı):
```
VITE_API_URL=https://tsb-analytics-api.l5819033.workers.dev
```

## 🎯 Next Steps

1. **Frontend Deploy** - Cloudflare Pages'e yükle
2. **Custom Domain** - Domain bağla (opsiyonel)
3. **Analytics** - Google Analytics ekle (opsiyonel)
4. **Caching** - Cloudflare Cache optimize et
5. **Monitoring** - Error tracking ekle (Sentry, etc.)

## 📚 Kaynaklar

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [React Query](https://tanstack.com/query)
- [Recharts](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## ✅ Checklist

- [x] Backend API oluşturuldu
- [x] D1 database kuruldu
- [x] 7,119 kayıt yüklendi
- [x] Backend Cloudflare'e deploy edildi
- [x] Frontend oluşturuldu
- [x] Production build hazırlandı
- [ ] Frontend deploy edilecek (Manuel)
- [ ] Custom domain bağlanacak (Opsiyonel)

---

**🎉 Platform hazır! Frontend'i deploy etmek için yukarıdaki deployment seçeneklerinden birini kullanın.**
