import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface CombinedRow {
  'Şirket Adı': string;
  'Şirket Kodu': string | number;
  'Şirket Tipi': string;
  'Brüt Yazılan Primler (+/-)'?: number;
  'Reasüröre Devredilen Primler (+/-)'?: number;
  'SGK ya Aktarılan Primler (-)'?: number;
  'Kazanılmamış Primler Karşılığı (+/-)'?: number;
  'Devreden Kazanılmamış Primler Karşılığı (+/-)'?: number;
  'Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)'?: number;
  'Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)'?: number;
  'Kazanılmamış Primler Karşılığında SGK Payı (+/-)'?: number;
  'Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)'?: number;
  'Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri'?: number;
  'Brüt Ödenen Tazminatlar (+/-)'?: number;
  'Ödenen Tazminatlarda Reasürör Payı (+/-)'?: number;
  'Tahakkuk Eden Muallak Tazminat'?: number;
  'Raporlanmayan Muallak Tazminat'?: number;
  'Tahakkuk Eden Muallak Tazminat Reasürör Payı'?: number;
  'Raporlanmayan Muallak Tazminat Reasürör Payı'?: number;
  'Nakit Akışlarından Kaynaklanan İskonto'?: number;
  // Net hesaplamalar
  'Net Prim'?: number;
  'Net KPK'?: number;
  'Net Ödeme'?: number;
  'Net Raporlanmayan'?: number;
  'Net Tahakkuk Eden'?: number;
  'Net EP'?: number;
  // Previous Year End kolonları (sadece Net hesaplamalar)
  'PYE Net Ödeme'?: number;
  'PYE Net Raporlanmayan'?: number;
  'PYE Net Tahakkuk Eden'?: number;
  'PYE Net EP'?: number;
  // Previous Quarter kolonları (sadece Net hesaplamalar)
  'PQ Net Ödeme'?: number;
  'PQ Net Raporlanmayan'?: number;
  'PQ Net Tahakkuk Eden'?: number;
  'PQ Net EP'?: number;
  'Hazine Kodu': string;
  'Dönem': string;
  [key: string]: any;
}

export class ExcelCombiner {
  // All TSB branch codes (701-799, 855, 856)
  private targetSheets = [
    '701', '702', '703', '704', '705', '706', '707', '708', '710', '711', '712', '713', '714',
    '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727',
    '728', '729', '730', '731', '732', '733', '734', '735', '736', '737', '738', '739', '740',
    '741', '742', '743', '744', '745', '746', '747', '748', '749', '750', '751', '752', '753',
    '754', '755', '756', '757', '758', '759', '760', '761', '765', '766', '767', '768', '769',
    '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782',
    '783', '784', '785', '786', '789', '790', '791', '792', '793', '794', '795', '796', '797',
    '798', '799', '855', '856'
  ];
  // Excel'deki orijinal sütun isimleri (okuma için) -> combined_data'daki hedef isimler
  private sourceColumns: { [key: string]: string } = {
    'Brüt Yazılan Primler (+/-);': 'Brüt Yazılan Primler (+/-)',
    'Reasüröre Devredilen Primler (+/-);': 'Reasüröre Devredilen Primler (+/-)',
    'SGK ya Aktarılan Primler (-);': 'SGK ya Aktarılan Primler (-)',
    'Kazanılmamış Primler Karşılığı (+/-);': 'Kazanılmamış Primler Karşılığı (+/-)',
    'Devreden Kazanılmamış Primler Karşılığı (+/-);': 'Devreden Kazanılmamış Primler Karşılığı (+/-)',
    'Kazanılmamış Prımler Karşılığında Reasürör Payı (+/-);': 'Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)',
    'Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-);': 'Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)',
    'Kazanılmamış Prımler Karşılığında SGK Payı (+/-);': 'Kazanılmamış Primler Karşılığında SGK Payı (+/-)',
    'Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-);': 'Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)',
    'Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri': 'Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri',
    'Brüt Ödenen Tazminatlar (+/-);': 'Brüt Ödenen Tazminatlar (+/-)',
    'Ödenen Tazminatlarda Reasürör Payı (+/-);': 'Ödenen Tazminatlarda Reasürör Payı (+/-)'
  };

  /**
   * Excel dosyasından period bilgisini çıkartır
   * Örnek: "20244.xlsx" -> "20244"
   * Örnek: "3 Company Level Income Statement Details 2024 4.xlsx" -> "20244"
   */
  private extractPeriod(fileName: string): string {
    // Format 1: YYYYQ.xlsx (örn: 20244.xlsx)
    const simpleMatch = fileName.match(/^(\d{4})(\d)\.xlsx$/);
    if (simpleMatch) {
      return `${simpleMatch[1]}${simpleMatch[2]}`;
    }

    // Format 2: "... YYYY Q.xlsx"
    const complexMatch = fileName.match(/(\d{4})\s+(\d{1,2})/);
    if (complexMatch) {
      return `${complexMatch[1]}${complexMatch[2]}`;
    }

    return fileName.replace('.xlsx', '');
  }

  /**
   * Bir sheet'ten veriyi parse eder
   */
  private parseSheet(
    sheet: XLSX.WorkSheet,
    sheetName: string,
    period: string
  ): CombinedRow[] {
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const result: CombinedRow[] = [];

    // "Şirket Adı" header'ını bul
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (row && row.some((cell: any) =>
        typeof cell === 'string' && cell.includes('Şirket Adı')
      )) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.warn(`⚠️  "Şirket Adı" header not found in sheet ${sheetName}`);
      return result;
    }

    const headers = rows[headerRowIndex];
    console.log(`   ✓ Found headers at row ${headerRowIndex + 1} in sheet ${sheetName}`);

    // Veri satırlarını parse et
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const sirketAdi = row[0];
      if (!sirketAdi || typeof sirketAdi !== 'string') continue;

      // TOPLAM satırını atla
      if (sirketAdi.includes('TOPLAM')) break;

      // Row'dan nesne oluştur
      const rowData: any = {};
      headers.forEach((header: any, index: number) => {
        if (header && index < row.length) {
          rowData[String(header).trim()] = row[index];
        }
      });

      // Şirket Tipi kontrolü
      if (rowData['Şirket Tipi'] !== 'HD') continue;

      // Hedef kolonları filtrele ve isimlerini dönüştür
      const filteredRow: Partial<CombinedRow> = {};

      // Basit sütunları kopyala (Şirket Adı, Şirket Kodu, Şirket Tipi)
      if (rowData['Şirket Adı']) filteredRow['Şirket Adı'] = rowData['Şirket Adı'];
      if (rowData['Şirket Kodu']) filteredRow['Şirket Kodu'] = rowData['Şirket Kodu'];
      if (rowData['Şirket Tipi']) filteredRow['Şirket Tipi'] = rowData['Şirket Tipi'];

      // Diğer sütunları sourceColumns mapping'inden al ve yeni isimleriyle yaz
      Object.keys(this.sourceColumns).forEach(sourceCol => {
        const targetCol = this.sourceColumns[sourceCol];
        if (rowData[sourceCol] !== undefined) {
          (filteredRow as any)[targetCol] = rowData[sourceCol];
        }
      });

      // Muallak tazminat sütunlarını row array'inden direkt al
      // Position 111: Tahakkuk Eden (Muallak Tazminat Karşılığı)
      // Position 117: Raporlanmayan (Muallak Tazminat Karşılığı)
      // Position 119: Nakit Akışlarından Kaynaklanan İskonto
      // Position 123: Tahakkuk Eden (Muallak Tazminatlar Karşılığında Reasürör Payı)
      // Position 129: Raporlanmayan (Muallak Tazminatlar Karşılığında Reasürör Payı)
      if (row[111] !== undefined && row[111] !== '') {
        (filteredRow as any)['Tahakkuk Eden Muallak Tazminat'] = row[111];
      }
      if (row[117] !== undefined && row[117] !== '') {
        (filteredRow as any)['Raporlanmayan Muallak Tazminat'] = row[117];
      }
      if (row[119] !== undefined && row[119] !== '') {
        (filteredRow as any)['Nakit Akışlarından Kaynaklanan İskonto'] = row[119];
      }
      if (row[123] !== undefined && row[123] !== '') {
        (filteredRow as any)['Tahakkuk Eden Muallak Tazminat Reasürör Payı'] = row[123];
      }
      if (row[129] !== undefined && row[129] !== '') {
        (filteredRow as any)['Raporlanmayan Muallak Tazminat Reasürör Payı'] = row[129];
      }

      // Net hesaplamaları yap
      const brutPrim = (filteredRow as any)['Brüt Yazılan Primler (+/-)'] || 0;
      const reasuror = (filteredRow as any)['Reasüröre Devredilen Primler (+/-)'] || 0;
      const sgk = (filteredRow as any)['SGK ya Aktarılan Primler (-)'] || 0;
      const kpk = (filteredRow as any)['Kazanılmamış Primler Karşılığı (+/-)'] || 0;
      const devredenKpk = (filteredRow as any)['Devreden Kazanılmamış Primler Karşılığı (+/-)'] || 0;
      const kpkReasuror = (filteredRow as any)['Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)'] || 0;
      const devredenKpkReasuror = (filteredRow as any)['Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)'] || 0;
      const kpkSgk = (filteredRow as any)['Kazanılmamış Primler Karşılığında SGK Payı (+/-)'] || 0;
      const devredenKpkSgk = (filteredRow as any)['Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)'] || 0;
      const brutOdeme = (filteredRow as any)['Brüt Ödenen Tazminatlar (+/-)'] || 0;
      const odemeReasuror = (filteredRow as any)['Ödenen Tazminatlarda Reasürör Payı (+/-)'] || 0;
      const tahakkukEden = (filteredRow as any)['Tahakkuk Eden Muallak Tazminat'] || 0;
      const tahakkukEdenReasuror = (filteredRow as any)['Tahakkuk Eden Muallak Tazminat Reasürör Payı'] || 0;
      const raporlanmayan = (filteredRow as any)['Raporlanmayan Muallak Tazminat'] || 0;
      const raporlanmayanReasuror = (filteredRow as any)['Raporlanmayan Muallak Tazminat Reasürör Payı'] || 0;

      // Net Prim = Brüt Prim + Reasürör + SGK (sadece toplama, işaretlere göre)
      (filteredRow as any)['Net Prim'] = brutPrim + reasuror + sgk;

      // Net KPK = KPK + Devreden KPK + KPK Reasürör + Devreden KPK Reasürör + KPK SGK + Devreden KPK SGK (sadece toplama, işaretlere göre)
      (filteredRow as any)['Net KPK'] = kpk + devredenKpk + kpkReasuror + devredenKpkReasuror + kpkSgk + devredenKpkSgk;

      // Net Ödeme = Brüt Ödeme + Ödeme Reasürör (sadece toplama, işaretlere göre)
      (filteredRow as any)['Net Ödeme'] = brutOdeme + odemeReasuror;

      // Net Raporlanmayan = Raporlanmayan + Raporlanmayan Reasürör (sadece toplama)
      (filteredRow as any)['Net Raporlanmayan'] = raporlanmayan + raporlanmayanReasuror;

      // Net Tahakkuk Eden = Tahakkuk Eden + Tahakkuk Eden Reasürör (sadece toplama)
      (filteredRow as any)['Net Tahakkuk Eden'] = tahakkukEden + tahakkukEdenReasuror;

      // Net EP (Earned Premium) = Net Prim + Net KPK
      (filteredRow as any)['Net EP'] = (filteredRow as any)['Net Prim'] + (filteredRow as any)['Net KPK'];

      // Hazine Kodu ve Dönem ekle
      (filteredRow as CombinedRow)['Hazine Kodu'] = sheetName;
      (filteredRow as CombinedRow)['Dönem'] = period;

      result.push(filteredRow as CombinedRow);
    }

    return result;
  }

  /**
   * Tek bir Excel dosyasını parse eder
   */
  parseExcelFile(filePath: string): CombinedRow[] {
    const fileName = path.basename(filePath);
    const period = this.extractPeriod(fileName);
    const combinedData: CombinedRow[] = [];

    console.log(`\n📄 Processing: ${fileName}`);
    console.log(`   Period: ${period}`);

    try {
      const workbook = XLSX.readFile(filePath);

      this.targetSheets.forEach(sheetName => {
        if (workbook.SheetNames.includes(sheetName)) {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = this.parseSheet(sheet, sheetName, period);
          console.log(`   📊 Sheet ${sheetName}: ${sheetData.length} HD companies`);
          combinedData.push(...sheetData);
        } else {
          console.log(`   ⚠️  Sheet ${sheetName} not found`);
        }
      });

      console.log(`   ✅ Total rows extracted: ${combinedData.length}`);
    } catch (error) {
      console.error(`   ❌ Error reading ${fileName}:`, error);
    }

    return combinedData;
  }

  /**
   * Birden fazla Excel dosyasını parse eder ve birleştirir
   */
  combineMultipleFiles(filePaths: string[]): CombinedRow[] {
    const allData: CombinedRow[] = [];

    filePaths.forEach(filePath => {
      const fileData = this.parseExcelFile(filePath);
      allData.push(...fileData);
    });

    return allData;
  }

  /**
   * Previous Year End verilerini ekler
   * Örnek: 20253 için 20244 verilerini ekler (önceki yıl sonu)
   */
  addPreviousYearEndData(data: CombinedRow[]): CombinedRow[] {
    console.log('\n📊 Adding Previous Year End data...\n');

    // Dönem bazlı veri indexi oluştur (Şirket Adı + Hazine Kodu + Dönem)
    const dataIndex = new Map<string, CombinedRow>();
    data.forEach(row => {
      const key = `${row['Şirket Adı']}_${row['Hazine Kodu']}_${row['Dönem']}`;
      dataIndex.set(key, row);
    });

    // Her satır için Previous Year End verilerini bul ve ekle
    data.forEach(row => {
      const currentPeriod = row['Dönem'];
      const year = parseInt(currentPeriod.substring(0, 4));
      const quarter = parseInt(currentPeriod.substring(4, 5));

      // Önceki yıl sonunu hesapla
      const previousYearEnd = `${year - 1}4`; // Önceki yılın 4. çeyreği

      // PYE verisini bul
      const pyeKey = `${row['Şirket Adı']}_${row['Hazine Kodu']}_${previousYearEnd}`;
      const pyeData = dataIndex.get(pyeKey);

      if (pyeData) {
        // Sadece Net hesaplamaları ekle
        row['PYE Net Ödeme'] = pyeData['Net Ödeme'];
        row['PYE Net Raporlanmayan'] = pyeData['Net Raporlanmayan'];
        row['PYE Net Tahakkuk Eden'] = pyeData['Net Tahakkuk Eden'];
        row['PYE Net EP'] = pyeData['Net EP'];
      }
    });

    const pyeCount = data.filter(row => row['PYE Net Ödeme'] !== undefined).length;
    console.log(`✓ Added PYE data to ${pyeCount} rows\n`);

    return data;
  }

  /**
   * Previous Quarter verilerini ekler
   * Örnek: 20253 için 20252 verilerini ekler (önceki çeyrek)
   * Örnek: 20251 için 20244 verilerini ekler (önceki yılın 4. çeyreği)
   */
  addPreviousQuarterData(data: CombinedRow[]): CombinedRow[] {
    console.log('\n📊 Adding Previous Quarter data...\n');

    // Dönem bazlı veri indexi oluştur (Şirket Adı + Hazine Kodu + Dönem)
    const dataIndex = new Map<string, CombinedRow>();
    data.forEach(row => {
      const key = `${row['Şirket Adı']}_${row['Hazine Kodu']}_${row['Dönem']}`;
      dataIndex.set(key, row);
    });

    // Her satır için Previous Quarter verilerini bul ve ekle
    data.forEach(row => {
      const currentPeriod = row['Dönem'];
      const year = parseInt(currentPeriod.substring(0, 4));
      const quarter = parseInt(currentPeriod.substring(4, 5));

      // Önceki çeyreği hesapla
      let previousQuarter: string;
      if (quarter === 1) {
        // Q1 ise önceki yılın Q4'ü
        previousQuarter = `${year - 1}4`;
      } else {
        // Diğer durumlarda bir önceki çeyrek
        previousQuarter = `${year}${quarter - 1}`;
      }

      // PQ verisini bul
      const pqKey = `${row['Şirket Adı']}_${row['Hazine Kodu']}_${previousQuarter}`;
      const pqData = dataIndex.get(pqKey);

      if (pqData) {
        // Sadece Net hesaplamaları ekle
        row['PQ Net Ödeme'] = pqData['Net Ödeme'];
        row['PQ Net Raporlanmayan'] = pqData['Net Raporlanmayan'];
        row['PQ Net Tahakkuk Eden'] = pqData['Net Tahakkuk Eden'];
        row['PQ Net EP'] = pqData['Net EP'];
      }
    });

    const pqCount = data.filter(row => row['PQ Net Ödeme'] !== undefined).length;
    console.log(`✓ Added PQ data to ${pqCount} rows\n`);

    return data;
  }

  /**
   * Mevcut combined_data.xlsx dosyasını okur (varsa)
   */
  loadExistingCombinedData(combinedFilePath: string): CombinedRow[] {
    if (!fs.existsSync(combinedFilePath)) {
      console.log('ℹ️  No existing combined_data.xlsx found, starting fresh');
      return [];
    }

    try {
      const workbook = XLSX.readFile(combinedFilePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet) as CombinedRow[];
      console.log(`✓ Loaded ${data.length} existing rows from combined_data.xlsx`);
      return data;
    } catch (error) {
      console.error('❌ Error reading existing combined_data.xlsx:', error);
      return [];
    }
  }

  /**
   * Veriyi combined_data.xlsx'e yazar/append eder
   */
  saveCombinedData(data: CombinedRow[], outputPath: string): void {
    try {
      // Mevcut veriyi yükle
      const existingData = this.loadExistingCombinedData(outputPath);

      // Yeni veriyi ekle
      const allData = [...existingData, ...data];

      console.log(`\n💾 Saving combined data...`);
      console.log(`   Existing rows: ${existingData.length}`);
      console.log(`   New rows: ${data.length}`);
      console.log(`   Total rows: ${allData.length}`);

      // Excel'e yaz
      const worksheet = XLSX.utils.json_to_sheet(allData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Combined Data');

      // Kolon genişliklerini ayarla
      const columnWidths = Object.values(this.sourceColumns).map(col => ({
        wch: Math.max(col.length, 15)
      }));
      worksheet['!cols'] = columnWidths;

      XLSX.writeFile(workbook, outputPath);
      console.log(`✅ Data saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Error saving combined data:', error);
      throw error;
    }
  }

  /**
   * Dönem bazlı duplicate kontrolü yapar
   */
  removeDuplicates(data: CombinedRow[]): CombinedRow[] {
    const seen = new Set<string>();
    const unique: CombinedRow[] = [];

    data.forEach(row => {
      const key = `${row['Şirket Adı']}_${row['Dönem']}_${row['Hazine Kodu']}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    });

    const duplicatesRemoved = data.length - unique.length;
    if (duplicatesRemoved > 0) {
      console.log(`🔄 Removed ${duplicatesRemoved} duplicate rows`);
    }

    return unique;
  }
}
