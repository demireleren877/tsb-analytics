# TSB Analytics Platform - Mimari Tasarım

## 🎯 Proje Genel Bakış

TSB (Türkiye Sigorta Birliği) verilerini toplayan, analiz eden ve görselleştiren tam teşekküllü bir analiz platformu.

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                    │
│  ┌─────────────┬──────────────┬─────────────┬─────────────┐ │
│  │  Dashboard  │  Şirketler   │  Karşılaş.  │   Raporlar  │ │
│  │   Sayfası   │   Analizi    │   Analizi   │   & Export  │ │
│  └─────────────┴──────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Backend API)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/companies     - Şirket listesi                 │   │
│  │  /api/data          - Filtrelenmiş veri              │   │
│  │  /api/analytics     - Hesaplanmış metrikler          │   │
│  │  /api/comparisons   - Karşılaştırma verileri         │   │
│  │  /api/trends        - Trend analizleri               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare D1 (SQLite)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables:                                             │   │
│  │  - companies        (Şirket master data)            │   │
│  │  - financial_data   (Ana finansal veriler)          │   │
│  │  - branch_codes     (Hazine kodları lookup)         │   │
│  │  - periods          (Dönem bilgileri)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑ Upload
┌─────────────────────────────────────────────────────────────┐
│              Data Pipeline (Node.js + TypeScript)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. TSB API Downloader  (tsb-api-downloader.ts)     │   │
│  │  2. Excel Combiner      (excel-combiner.ts)         │   │
│  │  3. D1 Uploader         (d1-uploader.ts) [YENİ]     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Özellikler

### 1. Dashboard (Ana Sayfa)
- **Genel Metrikkler**
  - Toplam prim üretimi
  - Toplam hasar ödemeleri
  - Pazar büyüklüğü
  - Aktif şirket sayısı

- **Trend Grafikleri**
  - Çeyreklik prim gelişimi (Line Chart)
  - Branş bazında dağılım (Pie Chart)
  - Hasar/Prim oranı (Bar Chart)
  - Yıllık karşılaştırma (Multi-line Chart)

- **Top Performanslar**
  - En yüksek prim üreten 10 şirket
  - En düşük hasar oranına sahip şirketler
  - En hızlı büyüyen şirketler (QoQ, YoY)

### 2. Şirket Analizi
- **Şirket Seçimi**
  - Dropdown ile şirket seçimi
  - Multi-select destekli karşılaştırma
  - Favori şirketler

- **Detaylı Metrikler**
  - Prim üretim trendi
  - Hasar gelişimi
  - Net karlılık analizi
  - Branş dağılımı

- **Finansal Tablolar**
  - Çeyreklik veriler tablosu
  - Export özelliği (Excel, CSV, PDF)
  - Filtreleme ve sıralama

### 3. Karşılaştırmalı Analiz
- **Şirket Karşılaştırma**
  - Yan yana şirket metrikleri
  - Performans karşılaştırma grafikleri
  - Benchmark analizi

- **Branş Analizi**
  - Branş bazında pazar payı
  - Branş performans metrikleri
  - Cross-branch analizi

- **Dönemsel Karşılaştırma**
  - YoY (Year-over-Year)
  - QoQ (Quarter-over-Quarter)
  - PYE vs Current
  - PQ vs Current

### 4. Raporlar & Export
- **Özel Raporlar**
  - Kullanıcı tanımlı filtreler
  - Kayıtlı rapor şablonları
  - Otomatik rapor oluşturma

- **Export Formatları**
  - Excel (.xlsx)
  - CSV (.csv)
  - PDF (grafiklerle)
  - JSON (API data)

### 5. Veri Yönetimi
- **Veri Güncelleme**
  - Manuel upload
  - Otomatik TSB sync
  - Veri validasyonu

- **Veri Kalitesi**
  - Missing data kontrolü
  - Anomali tespiti
  - Data quality dashboard

## 🗄️ Veri Modeli (Cloudflare D1)

### Companies Table
```sql
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'HD' (Hayat Dışı)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Financial_Data Table
```sql
CREATE TABLE financial_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  branch_code TEXT NOT NULL, -- 701, 715, 716, etc.
  period TEXT NOT NULL, -- '20251', '20252', etc.

  -- Brüt Değerler
  gross_written_premium REAL,
  ceded_to_reinsurer REAL,
  transferred_to_sgk REAL,
  unearned_premium_reserve REAL,
  previous_unearned_premium_reserve REAL,
  reinsurer_share_unearned REAL,
  previous_reinsurer_share_unearned REAL,
  sgk_share_unearned REAL,
  previous_sgk_share_unearned REAL,
  technical_investment_income REAL,
  gross_paid_claims REAL,
  reinsurer_share_paid_claims REAL,
  incurred_claims REAL,
  unreported_claims REAL,
  reinsurer_share_incurred REAL,
  reinsurer_share_unreported REAL,

  -- Net Hesaplamalar
  net_premium REAL,
  net_unearned_reserve REAL,
  net_payment REAL,
  net_unreported REAL,
  net_incurred REAL,
  net_earned_premium REAL,

  -- Previous Year End (PYE)
  pye_net_payment REAL,
  pye_net_unreported REAL,
  pye_net_incurred REAL,
  pye_net_earned_premium REAL,

  -- Previous Quarter (PQ)
  pq_net_payment REAL,
  pq_net_unreported REAL,
  pq_net_incurred REAL,
  pq_net_earned_premium REAL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE(company_id, branch_code, period)
);
```

### Branch_Codes Table
```sql
CREATE TABLE branch_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

INSERT INTO branch_codes VALUES
  ('701', 'Kaza', 'Kaza Sigortası'),
  ('715', 'Nakliyat', 'Nakliyat Sigortası'),
  ('716', 'Yangın ve Doğal Afetler', 'Yangın ve Doğal Afetler Sigortası'),
  ('717', 'Genel Zararlar', 'Genel Zararlar Sigortası'),
  ('719', 'Genel Sorumluluk', 'Genel Sorumluluk Sigortası'),
  ('855', 'Kredi', 'Kredi Sigortası'),
  ('856', 'Kefalet', 'Kefalet Sigortası');
```

### Periods Table
```sql
CREATE TABLE periods (
  period TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  start_date DATE,
  end_date DATE
);
```

## 🔧 Teknoloji Yığını

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts (react tabanlı, responsive)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **API**: RESTful API
- **Validation**: Zod
- **ORM**: Drizzle ORM

### DevOps
- **Hosting**: Cloudflare Pages (Frontend)
- **CI/CD**: GitHub Actions
- **Environment**: .env dosyaları
- **Package Manager**: npm

## 📁 Proje Yapısı

```
tsb_scrap/
├── backend/                    # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts           # Main worker
│   │   ├── routes/            # API routes
│   │   ├── db/                # Database schemas
│   │   └── utils/             # Helper functions
│   ├── wrangler.toml          # Cloudflare config
│   └── package.json
│
├── frontend/                   # React App
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
├── src/                        # Data pipeline (mevcut)
│   ├── tsb-api-downloader.ts
│   ├── excel-combiner.ts
│   ├── d1-uploader.ts         # YENİ
│   └── ...
│
├── datas/                      # Excel dosyaları
├── ARCHITECTURE.md             # Bu dosya
├── FORMULAS.md
└── package.json
```

## 🚀 Geliştirme Adımları

1. **Fase 1: Backend Setup**
   - Cloudflare Workers projesi oluştur
   - D1 database oluştur ve migrate et
   - API endpoints geliştir
   - Excel → D1 upload script

2. **Fase 2: Frontend Setup**
   - React projesi oluştur
   - UI component library kur
   - Routing yapısı
   - API client setup

3. **Fase 3: Dashboard**
   - Ana metrikler
   - Grafikler
   - Responsive design

4. **Fase 4: Analiz Sayfaları**
   - Şirket analizi
   - Karşılaştırma
   - Raporlar

5. **Fase 5: Deploy & Production**
   - Cloudflare Pages deploy
   - Domain bağlama
   - SSL/HTTPS
   - Analytics

## 📊 Performans Hedefleri

- **API Response Time**: < 100ms (avg)
- **Page Load Time**: < 2s
- **Database Queries**: < 50ms
- **Bundle Size**: < 500KB (gzipped)

## 🔒 Güvenlik

- CORS yapılandırması
- Rate limiting (Cloudflare Workers)
- Input validation (Zod)
- SQL injection koruması (Parameterized queries)
- Environment variables güvenliği

---

**Son Güncelleme**: 2025-12-31
