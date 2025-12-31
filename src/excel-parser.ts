import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface CompanyData {
  companyName: string;
  year: number;
  quarter: number;
  writtenPremium?: number;  // Yazılan Primler
  earnedPremium?: number;   // Kazanılan Primler
  claims?: number;          // Hasarlar
  expenses?: number;        // Giderler
  investments?: number;     // Yatırım Gelirleri
  netProfit?: number;       // Net Kar/Zarar
  [key: string]: any;
}

export class ExcelParser {
  /**
   * Excel dosyasını okur ve yapısını inceler
   */
  static inspectExcel(filePath: string): void {
    console.log(`\n📄 Inspecting: ${path.basename(filePath)}\n`);

    const workbook = XLSX.readFile(filePath);

    console.log(`📊 Sheets found: ${workbook.SheetNames.length}`);
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`   ${index + 1}. ${sheetName}`);
    });

    // İlk sheet'i detaylı incele
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    console.log(`\n📋 First sheet preview (first 10 rows):\n`);
    jsonData.slice(0, 10).forEach((row: any, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  }

  /**
   * Excel dosyasından şirket verilerini parse eder
   */
  static parseIncomeStatement(filePath: string): CompanyData[] {
    const workbook = XLSX.readFile(filePath);
    const data: CompanyData[] = [];

    // Dosya adından yıl ve çeyrek çıkar
    const fileName = path.basename(filePath);
    const match = fileName.match(/(\d{4})\s+(\d{1,2})/);
    const year = match ? parseInt(match[1]) : 0;
    const quarter = match ? parseInt(match[2]) : 0;

    // İlk sheet'i al (genelde şirket verileri ilk sheet'te)
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Header satırını bul
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (row && row.some((cell: any) =>
        typeof cell === 'string' &&
        (cell.toLowerCase().includes('company') ||
         cell.toLowerCase().includes('şirket') ||
         cell.toLowerCase().includes('sirket'))
      )) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.warn(`⚠️  Could not find header row in ${fileName}`);
      return data;
    }

    const headers = rows[headerRowIndex];
    console.log(`✓ Found headers at row ${headerRowIndex + 1}`);

    // Veri satırlarını parse et
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const companyName = row[0];
      if (!companyName || typeof companyName !== 'string') continue;

      const companyData: CompanyData = {
        companyName: companyName.trim(),
        year,
        quarter,
      };

      // Diğer kolonları ekle
      headers.forEach((header: any, index: number) => {
        if (index > 0 && header) {
          const value = row[index];
          if (typeof value === 'number') {
            companyData[String(header)] = value;
          }
        }
      });

      data.push(companyData);
    }

    return data;
  }

  /**
   * Birden fazla Excel dosyasını birleştirir
   */
  static parseMultipleFiles(filePaths: string[]): CompanyData[] {
    const allData: CompanyData[] = [];

    filePaths.forEach(filePath => {
      console.log(`\n📂 Parsing: ${path.basename(filePath)}`);
      const data = this.parseIncomeStatement(filePath);
      console.log(`   ✓ Found ${data.length} companies`);
      allData.push(...data);
    });

    return allData;
  }

  /**
   * Veriyi CSV olarak export eder
   */
  static exportToCSV(data: CompanyData[], outputPath: string): void {
    if (data.length === 0) {
      console.log('⚠️  No data to export');
      return;
    }

    // Tüm unique key'leri topla
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csv: string[] = [];

    // Header satırı
    csv.push(headers.join(','));

    // Data satırları
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return String(value);
      });
      csv.push(row.join(','));
    });

    fs.writeFileSync(outputPath, csv.join('\n'));
    console.log(`\n✅ CSV exported to: ${outputPath}`);
  }

  /**
   * Veriyi JSON olarak export eder
   */
  static exportToJSON(data: CompanyData[], outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ JSON exported to: ${outputPath}`);
  }
}
