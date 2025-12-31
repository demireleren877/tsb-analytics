# TSB Combined Data - Net Hesaplama Formülleri

Bu dokümanda `combined_data.xlsx` dosyasındaki net (net) sütunlarının nasıl hesaplandığı açıklanmaktadır.

## 📊 Net Hesaplama Formülleri

### 1. Net Prim
```
Net Prim = Brüt Yazılan Primler (+/-) + Reasüröre Devredilen Primler (+/-) + SGK ya Aktarılan Primler (-)
```

**Açıklama:** Tüm sütunlar işaretlerine göre toplanır. Sütunlardaki (+/-) ve (-) işaretleri zaten değerlerde mevcut olduğu için direkt toplama yapılır.

---

### 2. Net KPK (Kazanılmamış Primler Karşılığı)
```
Net KPK = Kazanılmamış Primler Karşılığı (+/-) + Devreden Kazanılmamış Primler Karşılığı (+/-) + Kazanılmamış Primler Karşılığında Reasürör Payı (+/-) + Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-) + Kazanılmamış Primler Karşılığında SGK Payı (+/-) + Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)
```

**Açıklama:** Tüm KPK ile ilgili sütunlar işaretlerine göre toplanır. Sütunlardaki (+/-) işaretleri zaten değerlerde mevcut olduğu için direkt toplama yapılır.

---

### 3. Net Ödeme
```
Net Ödeme = Brüt Ödenen Tazminatlar (+/-) + Ödenen Tazminatlarda Reasürör Payı (+/-)
```

**Açıklama:** İki sütun işaretlerine göre toplanır. Sütunlardaki (+/-) işaretleri zaten değerlerde mevcut olduğu için direkt toplama yapılır.

---

### 4. Net Raporlanmayan
```
Net Raporlanmayan = Raporlanmayan Muallak Tazminat + Raporlanmayan Muallak Tazminat Reasürör Payı
```

**Açıklama:** İki sütun toplanır. Değerler zaten işaretlerine göre saklandığı için direkt toplama yapılır.

---

### 5. Net Tahakkuk Eden
```
Net Tahakkuk Eden = Tahakkuk Eden Muallak Tazminat + Tahakkuk Eden Muallak Tazminat Reasürör Payı
```

**Açıklama:** İki sütun toplanır. Değerler zaten işaretlerine göre saklandığı için direkt toplama yapılır.

---

### 6. Net EP (Earned Premium - Kazanılmış Prim)
```
Net EP = Net Prim + Net KPK
```

**Açıklama:** Net kazanılmış prim, net prim üretimi ile net KPK'nın toplamıdır. Bu, dönem içinde gerçekten kazanılmış olan prim tutarını gösterir.

---

## 📅 Previous Year End (PYE) Kolonları

Her dönem için, **önceki yıl sonu** (bir önceki yılın 4. çeyreği) verileri de aynı satıra eklenir.

**Örnek:**
- 20251 (2025 Q1) için → PYE verileri 20244'ten (2024 Q4) gelir
- 20253 (2025 Q3) için → PYE verileri 20244'ten (2024 Q4) gelir
- 20211 (2021 Q1) için → PYE verileri 20204'ten (2020 Q4) gelir

### PYE Kolonları:
1. **PYE Net Ödeme** (yukarıdaki formülle hesaplanmış)
2. **PYE Net Raporlanmayan** (yukarıdaki formülle hesaplanmış)
3. **PYE Net Tahakkuk Eden** (yukarıdaki formülle hesaplanmış)
4. **PYE Net EP** (yukarıdaki formülle hesaplanmış)

---

## 📅 Previous Quarter (PQ) Kolonları

Her dönem için, **önceki çeyrek** verileri de aynı satıra eklenir.

**Örnek:**
- 20253 (2025 Q3) için → PQ verileri 20252'den (2025 Q2) gelir
- 20252 (2025 Q2) için → PQ verileri 20251'den (2025 Q1) gelir
- 20251 (2025 Q1) için → PQ verileri 20244'ten (2024 Q4) gelir
- 20244 (2024 Q4) için → PQ verileri 20243'ten (2024 Q3) gelir

### PQ Kolonları:
1. **PQ Net Ödeme** (yukarıdaki formülle hesaplanmış)
2. **PQ Net Raporlanmayan** (yukarıdaki formülle hesaplanmış)
3. **PQ Net Tahakkuk Eden** (yukarıdaki formülle hesaplanmış)
4. **PQ Net EP** (yukarıdaki formülle hesaplanmış)

---

## 📋 Hazine Kodları

Veriler aşağıdaki hazine kodlarına (branşlara) göre gruplanmıştır:

- **701**: Kaza
- **715**: Nakliyat
- **716**: Yangın ve Doğal Afetler
- **717**: Genel Zararlar
- **719**: Genel Sorumluluk
- **855**: Kredi
- **856**: Kefalet

---

## 📊 Veri Yapısı

### Toplam Sütun Sayısı: 31
- Temel bilgiler: 3 (Şirket Adı, Şirket Kodu, Şirket Tipi)
- Brüt değerler: 12
- Net hesaplamalar: 6
- PYE net hesaplamalar: 4
- PQ net hesaplamalar: 4
- Meta bilgiler: 2 (Hazine Kodu, Dönem)

### Toplam Satır Sayısı: 7,119
- 23 çeyrek dönem (2020 Q1 - 2025 Q3)
- 7 hazine kodu
- Yaklaşık 38-50 HD (Hayat Dışı) şirket/dönem

### PYE Kapsamı
- Toplam satırların %79.7'sinde PYE verisi mevcut
- 5,677 satırda önceki yıl sonu karşılaştırması yapılabilir

---

## 🔄 Güncelleme Süreci

1. **İndirme**: `npm run api-download 2020` - TSB'den tüm dosyaları indir
2. **Birleştirme**: `npm run combine` - Dosyaları birleştir ve net hesaplamaları yap
3. **Analiz**: `npm run analyze` - Raporlar oluştur (opsiyonel)

---

**Son Güncelleme:** 2025-12-31
**Kaynak:** Türkiye Sigorta Birliği (TSB)
