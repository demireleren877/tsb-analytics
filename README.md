# TSB File Monitor

TSB (Türkiye Sigorta Birliği) web sitesinden belirli dosyaları otomatik olarak takip eden ve değişiklik olduğunda Gmail API ile email bildirimi gönderen bir Node.js uygulaması.

## Özellikler

- ✅ Belirtilen aralıklarla TSB dosyalarını kontrol eder
- ✅ Dosya değişikliklerini SHA-256 hash ile tespit eder
- ✅ Gmail API ile güvenli email bildirimi
- ✅ OAuth2 ile kimlik doğrulama
- ✅ Cron schedule ile esnek zamanlama
- ✅ TypeScript ile tip güvenli geliştirme
- ✅ Hata durumlarında bildirim

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Gmail API Kurulumu

#### a) Google Cloud Console'da Proje Oluşturun

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni bir proje oluşturun veya mevcut bir projeyi seçin
3. Sol menüden **APIs & Services > Library** seçin
4. "Gmail API" arayın ve **Enable** butonuna tıklayın

#### b) OAuth2 Credentials Oluşturun

1. **APIs & Services > Credentials** sayfasına gidin
2. **Create Credentials > OAuth client ID** seçin
3. Application type: **Desktop app** seçin
4. İsim verin (örn: "TSB Monitor")
5. **Create** butonuna tıklayın
6. Client ID ve Client Secret bilgilerini kopyalayın

#### c) OAuth Consent Screen Ayarlayın

1. **OAuth consent screen** sekmesine gidin
2. User Type: **External** seçin
3. App name, user support email ve developer email girin
4. **Save and Continue**
5. Scopes bölümünde **Add or Remove Scopes** tıklayın
6. `.../auth/gmail.send` scope'unu seçin
7. Test users bölümüne kendi email adresinizi ekleyin

### 3. Environment Değişkenlerini Ayarlayın

`.env` dosyasını oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin ve şu bilgileri girin:

```env
# TSB Cookie Bilgileri (Tarayıcınızdan alın)
TSB_REMEMBER_ME_TOKEN=your_token
TSB_SESSION_COOKIE=your_session
TSB_XSRF_TOKEN=your_xsrf_token

# İzlenecek Dosya ID'si
STATISTIC_ID=5061

# Gmail API Credentials (Google Cloud Console'dan)
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
GMAIL_REFRESH_TOKEN=  # Bir sonraki adımda alacağız

# Mail Ayarları
MAIL_FROM=your-email@gmail.com
MAIL_TO=recipient@example.com

# Kontrol Aralığı
CRON_SCHEDULE=0 9 * * *

# Dosya saklama dizini
DOWNLOAD_DIR=./downloads
```

### 4. Gmail Refresh Token Alın

```bash
npm run get-token
```

Bu komut:
1. Tarayıcıda açmanız gereken bir URL verecek
2. Google hesabınızla giriş yapıp izin verin
3. Yönlendirilen URL'deki `code` parametresini kopyalayın
4. Terminal'e yapıştırın
5. Aldığınız `GMAIL_REFRESH_TOKEN`'ı `.env` dosyasına ekleyin

## Kullanım

### Tek Seferlik Kontrol

Sistemin çalışıp çalışmadığını test etmek için:

```bash
npm run check
```

### Sürekli Çalıştırma (Cron ile)

Belirlenen zamanlarda otomatik kontrol için:

```bash
npm start
```

### Development Mode

Geliştirme sırasında:

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## TSB Cookie Bilgilerini Alma

1. [TSB İstatistikler](https://www.tsb.org.tr/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar) sayfasına gidin
2. Hesabınızla giriş yapın
3. Tarayıcıda F12 ile Developer Tools'u açın
4. **Application > Cookies > https://www.tsb.org.tr** bölümüne gidin
5. Şu cookie'leri kopyalayın:
   - `rememberMeToken` → `TSB_REMEMBER_ME_TOKEN`
   - `.AspNetCore.Session` → `TSB_SESSION_COOKIE`
   - `X-XSRF-Token-Cookie` → `TSB_XSRF_TOKEN`

## Cron Schedule Örnekleri

`.env` dosyasındaki `CRON_SCHEDULE` değeri:

```bash
0 9 * * *      # Her gün saat 09:00'da
0 */6 * * *    # Her 6 saatte bir
*/30 * * * *   # Her 30 dakikada bir
0 9,17 * * *   # Her gün 09:00 ve 17:00'de
0 9 * * 1-5    # Hafta içi her gün 09:00'da
0 0 1 * *      # Her ayın 1'inde gece yarısı
```

Format: `dakika saat gün ay haftanın_günü`

## Proje Yapısı

```
tsb_scrap/
├── src/
│   ├── index.ts              # Ana uygulama ve scheduler
│   ├── config.ts             # Konfigürasyon yönetimi
│   ├── tsb-downloader.ts     # TSB dosya indirme modülü
│   ├── file-tracker.ts       # Dosya değişiklik takibi (hash)
│   ├── mail-sender.ts        # Gmail API ile mail gönderimi
│   ├── get-gmail-token.ts    # OAuth2 token alma yardımcısı
│   └── types.ts              # TypeScript tipleri
├── downloads/                # İndirilen dosyalar
├── .env                      # Ortam değişkenleri (GİT'e eklenmez)
├── .env.example              # Örnek ortam değişkenleri
├── file-tracking.json        # Son dosya bilgileri (otomatik oluşur)
├── package.json
├── tsconfig.json
└── README.md
```

## Nasıl Çalışır?

1. **İndirme**: TSB sitesinden belirtilen dosyayı indirir (statisticId ile)
2. **Hash Hesaplama**: Dosyanın SHA-256 hash'ini hesaplar
3. **Karşılaştırma**: `file-tracking.json`'daki önceki hash ile karşılaştırır
4. **Bildirim**: Değişiklik varsa Gmail API ile email gönderir
5. **Kayıt**: Yeni dosya bilgilerini kaydeder

## İzlenebilecek Dosyalar

`.env` dosyasındaki `STATISTIC_ID` değerini değiştirerek farklı dosyaları izleyebilirsiniz:

```
5051 - 1 Şirketler Bilanço Özet
5060 - 4 Şirketler Gelir Tablosu Özet
5061 - 3 Şirketler Gelir Tablosu Detay  (varsayılan)
5062 - 2 Şirketler Bilanço Detay
5063 - 1 Şirketler Bilanço Özet
```

## Güvenlik Notları

- ✅ Gmail API OAuth2 kullanır (şifre paylaşımı yok)
- ✅ `.env` dosyası `.gitignore`'da (credential'lar paylaşılmaz)
- ✅ Refresh token ile otomatik token yenileme
- ⚠️ TSB cookie'leri belirli süre sonra expire olabilir
- ⚠️ Cookie'leri düzenli olarak güncellemelisiniz

## Sorun Giderme

### "Missing required environment variables" hatası
- `.env` dosyasının varlığını kontrol edin
- Tüm gerekli değişkenlerin dolu olduğundan emin olun

### "Gmail API connection failed" hatası
- Refresh token'ın geçerli olduğundan emin olun
- `npm run get-token` ile yeni token alın
- Gmail API'nin Google Cloud Console'da aktif olduğunu kontrol edin

### "Failed to download file" hatası
- TSB cookie'lerinin geçerli olduğunu kontrol edin
- Tarayıcıda manuel olarak giriş yapıp cookie'leri güncelleyin

### İlk çalıştırmada mail gelmiyor
- Normal! İlk çalıştırma dosyayı indirir ve hash'ini kaydeder
- İkinci çalıştırmadan itibaren değişiklik kontrolü yapılır

## Lisans

ISC

## Katkıda Bulunma

Issues ve pull request'ler açabilirsiniz.
