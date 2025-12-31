# TSB Analytics Backend API

Cloudflare Workers ve D1 kullanılarak oluşturulmuş TSB Analytics platformunun backend API'si.

## 🚀 Kurulum

### 1. Dependencies Kurulumu
```bash
npm install
```

### 2. Cloudflare D1 Database Oluşturma
```bash
# D1 database oluştur
wrangler d1 create tsb-analytics-db

# Output'tan database_id'yi kopyala ve wrangler.toml'a yapıştır
```

### 3. Database Migration
```bash
# Migrations uygula
wrangler d1 migrations apply tsb-analytics-db

# Verify
wrangler d1 execute tsb-analytics-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## 🔧 Development

### Local Development
```bash
# Development server başlat
npm run dev

# API local'de çalışacak: http://localhost:8787
```

### Test API
```bash
# Health check
curl http://localhost:8787

# Companies
curl http://localhost:8787/api/companies

# Data
curl "http://localhost:8787/api/data?period=20253&limit=10"
```

## 📤 Deployment

### Production'a Deploy
```bash
npm run deploy
```

### Logs İzleme
```bash
npm run tail
```

## 📊 API Endpoints

### Companies
- `GET /api/companies` - Tüm şirketler
- `GET /api/companies/:id` - Şirket detayı
- `GET /api/companies/:id/data` - Şirket finansal verileri

### Data
- `GET /api/data` - Filtrelenmiş finansal veriler
- `GET /api/data/branches` - Branş listesi
- `GET /api/data/periods` - Dönem listesi

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrikleri
- `GET /api/analytics/trends` - Trend verileri
- `GET /api/analytics/rankings` - Sıralama/Ranking
- `GET /api/analytics/growth` - Büyüme oranları

### Comparisons
- `POST /api/comparisons/companies` - Şirket karşılaştırma
- `GET /api/comparisons/yoy` - Year over Year
- `GET /api/comparisons/qoq` - Quarter over Quarter

## 🗄️ Database Schema

Database schema'sı `migrations/0001_initial_schema.sql` dosyasında tanımlıdır.

### Tables
- `companies` - Şirket bilgileri
- `branch_codes` - Branş kodları
- `periods` - Dönem bilgileri
- `financial_data` - Finansal veriler

## 📝 Environment Variables

`wrangler.toml` dosyasında tanımlı:
- `ALLOWED_ORIGINS` - CORS izinleri
- `API_VERSION` - API versiyonu

## 🔒 Güvenlik

- CORS koruması aktif
- SQL injection koruması (parameterized queries)
- Rate limiting (Cloudflare tarafından)
- Input validation

## 📚 Kaynaklar

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev/)
