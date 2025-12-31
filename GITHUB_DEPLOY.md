# 🚀 GitHub ile Cloudflare Pages Deploy Rehberi

## ✅ Git Repository Hazır!

İlk commit oluşturuldu. Şimdi GitHub'a push edip Cloudflare Pages ile bağlayalım.

## 📋 Adım Adım Deploy

### 1️⃣ GitHub'da Repository Oluştur

1. **GitHub'a git**: https://github.com/new
2. **Repository adı**: `tsb-analytics` (veya istediğin ad)
3. **Visibility**: Public veya Private (ikisi de çalışır)
4. ⚠️ **ÖNEMLİ**: "Initialize with README" seçeneğini **SEÇME**
5. **Create repository**'ye tıkla

### 2️⃣ GitHub'a Push Et

Terminalden aşağıdaki komutları çalıştır:

```bash
# Repository'yi remote olarak ekle (REPO_URL'yi değiştir)
git remote add origin https://github.com/KULLANICI_ADIN/tsb-analytics.git

# Ana branch'i main olarak değiştir (modern standart)
git branch -M main

# GitHub'a push et
git push -u origin main
```

**Örnek** (kendi kullanıcı adınla):
```bash
git remote add origin https://github.com/erendemirel/tsb-analytics.git
git branch -M main
git push -u origin main
```

### 3️⃣ Cloudflare Pages'i Bağla

#### A. Cloudflare Dashboard'a Git

1. https://dash.cloudflare.com/ adresine git
2. Sol menüden **Workers & Pages** > **Pages** seç
3. **Create a project** > **Connect to Git** tıkla

#### B. GitHub'ı Bağla

1. **Connect GitHub account** tıkla
2. GitHub authorization sayfası açılacak
3. **Authorize Cloudflare** tıkla
4. **Repository seç**: `tsb-analytics` seçerek **Begin setup** tıkla

#### C. Build Ayarlarını Yap

**Project name**: `tsb-analytics` (veya istediğin ad)

**Production branch**: `main`

**Build settings**:
- **Framework preset**: Vite
- **Build command**:
  ```
  cd frontend && npm install && npm run build
  ```
- **Build output directory**:
  ```
  frontend/dist
  ```
- **Root directory**: `/` (boş bırakabilirsin)

**Environment variables** (isteğe bağlı):
- Name: `NODE_VERSION`
- Value: `18`

#### D. Deploy Et!

1. **Save and Deploy** tıkla
2. ⏱️ Build işlemi 2-3 dakika sürer
3. ✅ Deploy tamamlandığında URL'i alacaksın!

### 4️⃣ Deployment Tamamlandı! 🎉

Cloudflare size şu formatta bir URL verecek:
```
https://tsb-analytics.pages.dev
```

veya custom domain ayarlayabilirsin:
```
https://tsb-analytics.senindomain.com
```

## 🔄 Güncellemeler

Her değişiklikten sonra otomatik deploy olacak:

```bash
# Değişiklikleri yap
git add .
git commit -m "Yeni özellik eklendi"
git push

# Cloudflare otomatik olarak yeniden deploy edecek!
```

## ⚙️ Build Ayarları (Detaylı)

Cloudflare Pages build settings'i şu şekilde olmalı:

| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` (empty) |
| Environment variables | NODE_VERSION=18 |

## 🌐 Custom Domain Ekleme (Opsiyonel)

1. Cloudflare Pages > **Custom domains**
2. **Set up a custom domain**
3. Domain'ini ekle (örn: `analytics.senindomain.com`)
4. DNS ayarlarını Cloudflare'e göre yapılandır
5. SSL otomatik aktif olacak (HTTPS)

## 🔍 Monitoring & Logs

**Deployment logs**:
- Cloudflare Dashboard > Pages > Deployments
- Her commit için build log görebilirsin

**Analytics**:
- Cloudflare Dashboard > Analytics > Web Analytics

## ⚡ Performans

Cloudflare Pages özellikleri:
- ✅ **Global CDN**: Dünya çapında hızlı erişim
- ✅ **Unlimited bandwidth**: Sınırsız trafik
- ✅ **Free SSL**: Otomatik HTTPS
- ✅ **Auto previews**: Her branch için preview URL
- ✅ **Instant rollback**: Önceki versiyona dönebilme

## 🎯 URL'ler

Deployment sonrası şu URL'lere sahip olacaksın:

- **Frontend**: `https://tsb-analytics.pages.dev`
- **Backend API**: `https://tsb-analytics-api.l5819033.workers.dev`

## 📝 Notlar

- ✅ Her commit otomatik deploy olur
- ✅ Preview deployments: Her PR için ayrı URL
- ✅ Rollback: Önceki versiyona tek tıkla dönüş
- ✅ Custom domains: İstediğin kadar domain ekleyebilirsin
- ✅ Free plan: Aylık 500 build, unlimited requests

## 🆘 Sorun Giderme

### Build Hatası Alırsan

1. Cloudflare Dashboard > Pages > Deployment logs'a bak
2. Hata mesajını incele
3. Genellikle `build command` veya `output directory` yanlış

### Doğru Ayarlar:
```
Build command: cd frontend && npm install && npm run build
Output directory: frontend/dist
```

### Frontend Boş Sayfa Gösteriyorsa

`frontend/dist/_redirects` dosyasının olduğundan emin ol:
```
/*    /index.html   200
```

Bu dosya zaten `npm run build` ile oluşturuldu ✅

## 🎊 Tamamlandı!

Artık TSB Analytics platformun tam otomatik olarak deploy edilecek:

1. ✅ GitHub'a push et
2. ✅ Cloudflare otomatik build yapar
3. ✅ Canlıya alır
4. ✅ Slack/email bildirimi (ayarlarsan)

---

**İhtiyacın olursa**: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
