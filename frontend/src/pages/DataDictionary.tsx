import { BookOpen, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';

const dataDictionary = [
  {
    category: 'Finansal Metrikler',
    items: [
      {
        term: 'Net Prim (Net Premium)',
        definition: 'Şirketin ürettiği toplam primden reasürans payının düşülmesiyle elde edilen net prim tutarı.',
        formula: 'Brüt Prim - Reasürans Primi',
      },
      {
        term: 'Net Ödeme (Net Payment)',
        definition: 'Dönem içinde gerçekleşen hasar ödemelerinin reasürans payı düşüldükten sonraki net tutarı.',
        formula: 'Brüt Ödeme - Reasürans Ödemesi',
      },
      {
        term: 'Net Kazanılmış Prim (Net EP - Earned Premium)',
        definition: 'İlgili dönemde kazanılmış olan net prim tutarı. Henüz kazanılmamış primler düşüldükten sonraki tutar.',
        formula: 'Net Prim + Kazanılmamış Primler Karşılığı Başlangıç - Kazanılmamış Primler Karşılığı Bitiş',
      },
      {
        term: 'Net Tahakkuk (Net Incurred)',
        definition: 'Dönem içinde tahakkuk eden toplam hasar tutarı (hem ödenen hem de ödenmesi gereken).',
        formula: 'Net Ödeme + Muallak Hasar Karşılığı Değişimi',
      },
      {
        term: 'Net Raporlanmayan (Net Unreported)',
        definition: 'Gerçekleşmiş ancak henüz bildirilmemiş hasarlar için ayrılan karşılık tutarı (IBNR - Incurred But Not Reported).',
        formula: 'Raporlanmamış Hasar Karşılığı',
      },
    ],
  },
  {
    category: 'Hesaplanmış Göstergeler',
    items: [
      {
        term: 'Net Ultimate',
        definition: 'Dönemin nihai hasar maliyetini gösteren gösterge. PYE (Önceki Yıl Sonu) değerlerindeki değişimi de hesaba katar.',
        formula: 'Net Ödeme + Net Tahakkuk + Net Raporlanmayan - PYE_Net Tahakkuk - PYE_Net Raporlanmayan',
      },
      {
        term: 'Loss Ratio (Hasar Prim Oranı)',
        definition: 'Şirketin hasarlarının kazanılmış primlerine oranı. Düşük oran daha iyi karlılığı gösterir.',
        formula: '(Net Ultimate / Net Kazanılmış Prim) × 100',
      },
      {
        term: 'PYE (Previous Year End)',
        definition: 'Önceki yıl sonu (Q4) verilerini ifade eder. Net Ultimate hesaplamasında delta hesabı için kullanılır.',
        formula: 'Önceki yılın 4. çeyrek verileri',
      },
    ],
  },
  {
    category: 'Hazine Kodları',
    items: [
      {
        term: '701',
        definition: 'Kaza',
        formula: '-',
      },
      {
        term: '715',
        definition: 'Kara Taşıtları (Kasko)',
        formula: '-',
      },
      {
        term: '716',
        definition: 'Kara Taşıtları (Trafik)',
        formula: '-',
      },
      {
        term: '717',
        definition: 'Yangın ve Doğal Afetler',
        formula: '-',
      },
      {
        term: '719',
        definition: 'Genel Zararlar',
        formula: '-',
      },
      {
        term: '855',
        definition: 'Genel Sorumluluk',
        formula: '-',
      },
      {
        term: '856',
        definition: 'Hukuksal Koruma',
        formula: '-',
      },
    ],
  },
  {
    category: 'Dönem Gösterimleri',
    items: [
      {
        term: 'Period (Dönem)',
        definition: 'Finansal verilerin ait olduğu dönem. Format: YYYYQ (Yıl + Çeyrek)',
        formula: 'Örnek: 20253 = 2025 yılı 3. çeyrek',
      },
      {
        term: 'QoQ (Quarter over Quarter)',
        definition: 'Çeyreksel bazda bir önceki çeyreğe göre değişim oranı.',
        formula: '((Mevcut Çeyrek - Önceki Çeyrek) / Önceki Çeyrek) × 100',
      },
      {
        term: 'YoY (Year over Year)',
        definition: 'Yıllık bazda bir önceki yılın aynı dönemine göre değişim oranı.',
        formula: '((Mevcut Dönem - Geçen Yıl Aynı Dönem) / Geçen Yıl Aynı Dönem) × 100',
      },
    ],
  },
  {
    category: 'Performans Göstergeleri',
    items: [
      {
        term: 'Pazar Payı',
        definition: 'Şirketin toplam pazar içindeki payı.',
        formula: '(Şirket Net Prim / Toplam Pazar Net Prim) × 100',
      },
      {
        term: 'Pazar Yoğunlaşması',
        definition: 'İlk 5 şirketin toplam pazar içindeki toplam payı. Yüksek değer oligopolistik yapıya işaret eder.',
        formula: '(İlk 5 Şirket Toplam Prim / Toplam Pazar Prim) × 100',
      },
      {
        term: 'EP/WP Oranı',
        definition: 'Kazanılmış primin yazılan prime oranı. Prim üretim trendini gösterir.',
        formula: '(Net Kazanılmış Prim / Net Prim) × 100',
      },
    ],
  },
];

export function DataDictionary() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Veri Sözlüğü
        </h2>
        <p className="text-muted-foreground mt-2">
          TSB Analytics platformunda kullanılan terimler, metrikler ve hesaplama formülleri
        </p>
      </div>

      <div className="space-y-6">
        {dataDictionary.map((category, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-xl">{category.category}</CardTitle>
              <CardDescription>
                {category.category === 'Finansal Metrikler' && 'Temel finansal ölçümler ve tanımları'}
                {category.category === 'Hesaplanmış Göstergeler' && 'Platform tarafından hesaplanan performans metrikleri'}
                {category.category === 'Hazine Kodları' && 'Türkiye Sigorta Birliği branş kodları'}
                {category.category === 'Dönem Gösterimleri' && 'Zaman bazlı gösterimler ve karşılaştırmalar'}
                {category.category === 'Performans Göstergeleri' && 'Şirket ve pazar performans ölçütleri'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">{item.term}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.definition}
                        </p>
                        {item.formula !== '-' && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-md">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Formül:
                            </p>
                            <code className="text-sm font-mono text-foreground">
                              {item.formula}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold">Önemli Not</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bu platformdaki tüm hesaplamalar Türkiye Sigorta Birliği (TSB) standartlarına uygun olarak
                yapılmaktadır. Loss Ratio hesaplamalarında PYE (Previous Year End) verileri kullanılarak
                daha doğru performans ölçümü sağlanmaktadır. Negatif değerler mutlak değere dönüştürülerek
                hesaplamalara dahil edilmektedir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
