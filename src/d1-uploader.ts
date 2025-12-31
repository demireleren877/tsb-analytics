import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

interface D1UploadRow {
  company_code: string;
  company_name: string;
  company_type: string;
  branch_code: string;
  period: string;

  // Brüt değerler
  gross_written_premium: number;
  ceded_to_reinsurer: number;
  transferred_to_sgk: number;
  unearned_premium_reserve: number;
  previous_unearned_premium_reserve: number;
  reinsurer_share_unearned: number;
  previous_reinsurer_share_unearned: number;
  sgk_share_unearned: number;
  previous_sgk_share_unearned: number;
  technical_investment_income: number;
  gross_paid_claims: number;
  reinsurer_share_paid_claims: number;
  incurred_claims: number;
  unreported_claims: number;
  reinsurer_share_incurred: number;
  reinsurer_share_unreported: number;

  // Net hesaplamalar
  net_premium: number;
  net_unearned_reserve: number;
  net_payment: number;
  net_unreported: number;
  net_incurred: number;
  net_earned_premium: number;

  // PYE
  pye_net_payment: number | null;
  pye_net_unreported: number | null;
  pye_net_incurred: number | null;
  pye_net_earned_premium: number | null;

  // PQ
  pq_net_payment: number | null;
  pq_net_unreported: number | null;
  pq_net_incurred: number | null;
  pq_net_earned_premium: number | null;
}

export class D1Uploader {
  private databaseId: string;
  private wranglerPath: string;

  constructor(databaseId: string, wranglerPath: string = 'wrangler') {
    this.databaseId = databaseId;
    this.wranglerPath = wranglerPath;
  }

  /**
   * Combined_data.xlsx dosyasını okur ve parse eder
   */
  parseCombinedData(filePath: string): D1UploadRow[] {
    console.log(`\n📄 Reading: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✓ Found ${data.length} rows in Excel`);

    const parsedData: D1UploadRow[] = data.map(row => ({
      company_code: String(row['Şirket Kodu'] || ''),
      company_name: String(row['Şirket Adı'] || ''),
      company_type: String(row['Şirket Tipi'] || 'HD'),
      branch_code: String(row['Hazine Kodu'] || ''),
      period: String(row['Dönem'] || ''),

      // Brüt değerler
      gross_written_premium: this.parseNumber(row['Brüt Yazılan Primler (+/-)']),
      ceded_to_reinsurer: this.parseNumber(row['Reasüröre Devredilen Primler (+/-)']),
      transferred_to_sgk: this.parseNumber(row['SGK ya Aktarılan Primler (-)']),
      unearned_premium_reserve: this.parseNumber(row['Kazanılmamış Primler Karşılığı (+/-)']),
      previous_unearned_premium_reserve: this.parseNumber(row['Devreden Kazanılmamış Primler Karşılığı (+/-)']),
      reinsurer_share_unearned: this.parseNumber(row['Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)']),
      previous_reinsurer_share_unearned: this.parseNumber(row['Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)']),
      sgk_share_unearned: this.parseNumber(row['Kazanılmamış Primler Karşılığında SGK Payı (+/-)']),
      previous_sgk_share_unearned: this.parseNumber(row['Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)']),
      technical_investment_income: this.parseNumber(row['Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri']),
      gross_paid_claims: this.parseNumber(row['Brüt Ödenen Tazminatlar (+/-)']),
      reinsurer_share_paid_claims: this.parseNumber(row['Ödenen Tazminatlarda Reasürör Payı (+/-)']),
      incurred_claims: this.parseNumber(row['Tahakkuk Eden Muallak Tazminat']),
      unreported_claims: this.parseNumber(row['Raporlanmayan Muallak Tazminat']),
      reinsurer_share_incurred: this.parseNumber(row['Tahakkuk Eden Muallak Tazminat Reasürör Payı']),
      reinsurer_share_unreported: this.parseNumber(row['Raporlanmayan Muallak Tazminat Reasürör Payı']),

      // Net hesaplamalar
      net_premium: this.parseNumber(row['Net Prim']),
      net_unearned_reserve: this.parseNumber(row['Net KPK']),
      net_payment: this.parseNumber(row['Net Ödeme']),
      net_unreported: this.parseNumber(row['Net Raporlanmayan']),
      net_incurred: this.parseNumber(row['Net Tahakkuk Eden']),
      net_earned_premium: this.parseNumber(row['Net EP']),

      // PYE
      pye_net_payment: this.parseNumberOrNull(row['PYE Net Ödeme']),
      pye_net_unreported: this.parseNumberOrNull(row['PYE Net Raporlanmayan']),
      pye_net_incurred: this.parseNumberOrNull(row['PYE Net Tahakkuk Eden']),
      pye_net_earned_premium: this.parseNumberOrNull(row['PYE Net EP']),

      // PQ
      pq_net_payment: this.parseNumberOrNull(row['PQ Net Ödeme']),
      pq_net_unreported: this.parseNumberOrNull(row['PQ Net Raporlanmayan']),
      pq_net_incurred: this.parseNumberOrNull(row['PQ Net Tahakkuk Eden']),
      pq_net_earned_premium: this.parseNumberOrNull(row['PQ Net EP']),
    }));

    return parsedData;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private parseNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * SQL dosyası oluşturur
   */
  generateSQL(data: D1UploadRow[]): string {
    const sql: string[] = [];

    // Companies ve periods için unique değerler topla
    const companies = new Map<string, { name: string; type: string }>();
    const periods = new Set<string>();

    data.forEach(row => {
      if (row.company_code && row.company_name) {
        companies.set(row.company_code, {
          name: row.company_name,
          type: row.company_type,
        });
      }
      if (row.period) {
        periods.add(row.period);
      }
    });

    // Companies INSERT
    sql.push('-- Insert Companies');
    sql.push('INSERT OR IGNORE INTO companies (code, name, type) VALUES');
    const companyValues: string[] = [];
    companies.forEach((info, code) => {
      const safeName = info.name.replace(/'/g, "''");
      companyValues.push(`('${code}', '${safeName}', '${info.type}')`);
    });
    sql.push(companyValues.join(',\n') + ';');
    sql.push('');

    // Periods INSERT
    sql.push('-- Insert Periods');
    sql.push('INSERT OR IGNORE INTO periods (period, year, quarter) VALUES');
    const periodValues: string[] = [];
    periods.forEach(period => {
      const year = parseInt(period.substring(0, 4));
      const quarter = parseInt(period.substring(4));
      periodValues.push(`('${period}', ${year}, ${quarter})`);
    });
    sql.push(periodValues.join(',\n') + ';');
    sql.push('');

    // Financial Data INSERT (batch olarak)
    sql.push('-- Insert Financial Data');
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      sql.push(`INSERT OR REPLACE INTO financial_data (
        company_id, branch_code, period,
        gross_written_premium, ceded_to_reinsurer, transferred_to_sgk,
        unearned_premium_reserve, previous_unearned_premium_reserve,
        reinsurer_share_unearned, previous_reinsurer_share_unearned,
        sgk_share_unearned, previous_sgk_share_unearned,
        technical_investment_income,
        gross_paid_claims, reinsurer_share_paid_claims,
        incurred_claims, unreported_claims,
        reinsurer_share_incurred, reinsurer_share_unreported,
        net_premium, net_unearned_reserve, net_payment,
        net_unreported, net_incurred, net_earned_premium,
        pye_net_payment, pye_net_unreported, pye_net_incurred, pye_net_earned_premium,
        pq_net_payment, pq_net_unreported, pq_net_incurred, pq_net_earned_premium
      ) VALUES`);

      const values: string[] = [];
      batch.forEach(row => {
        values.push(`(
          (SELECT id FROM companies WHERE code = '${row.company_code}'),
          '${row.branch_code}',
          '${row.period}',
          ${row.gross_written_premium}, ${row.ceded_to_reinsurer}, ${row.transferred_to_sgk},
          ${row.unearned_premium_reserve}, ${row.previous_unearned_premium_reserve},
          ${row.reinsurer_share_unearned}, ${row.previous_reinsurer_share_unearned},
          ${row.sgk_share_unearned}, ${row.previous_sgk_share_unearned},
          ${row.technical_investment_income},
          ${row.gross_paid_claims}, ${row.reinsurer_share_paid_claims},
          ${row.incurred_claims}, ${row.unreported_claims},
          ${row.reinsurer_share_incurred}, ${row.reinsurer_share_unreported},
          ${row.net_premium}, ${row.net_unearned_reserve}, ${row.net_payment},
          ${row.net_unreported}, ${row.net_incurred}, ${row.net_earned_premium},
          ${row.pye_net_payment ?? 'NULL'}, ${row.pye_net_unreported ?? 'NULL'}, ${row.pye_net_incurred ?? 'NULL'}, ${row.pye_net_earned_premium ?? 'NULL'},
          ${row.pq_net_payment ?? 'NULL'}, ${row.pq_net_unreported ?? 'NULL'}, ${row.pq_net_incurred ?? 'NULL'}, ${row.pq_net_earned_premium ?? 'NULL'}
        )`);
      });

      sql.push(values.join(',\n') + ';');
      sql.push('');
    }

    return sql.join('\n');
  }

  /**
   * SQL dosyasını D1'e yükler
   */
  async uploadToD1(sqlContent: string, outputPath: string): Promise<void> {
    // SQL dosyasını kaydet
    fs.writeFileSync(outputPath, sqlContent);
    console.log(`✓ SQL file saved: ${outputPath}`);

    console.log('\n📤 Uploading to Cloudflare D1...');
    console.log('Please run the following command manually:');
    console.log(`\ncd backend && wrangler d1 execute ${this.databaseId} --file=../${outputPath}\n`);
  }
}

async function main() {
  console.log('🚀 TSB D1 Uploader');
  console.log('='.repeat(60));

  const datasDir = './datas';
  const combinedFilePath = path.join(datasDir, 'combined_data.xlsx');
  const outputSQLPath = path.join(datasDir, 'upload.sql');

  if (!fs.existsSync(combinedFilePath)) {
    console.error(`❌ File not found: ${combinedFilePath}`);
    console.log('💡 Run: npm run combine first');
    return;
  }

  // Database ID'yi wrangler.toml'dan oku veya parametre olarak al
  const databaseId = process.argv[2] || 'tsb-analytics-db';

  const uploader = new D1Uploader(databaseId);

  // Parse combined data
  const data = uploader.parseCombinedData(combinedFilePath);
  console.log(`✓ Parsed ${data.length} rows`);

  // Generate SQL
  console.log('\n📝 Generating SQL...');
  const sql = uploader.generateSQL(data);
  console.log(`✓ Generated SQL with ${sql.split('\n').length} lines`);

  // Upload
  await uploader.uploadToD1(sql, outputSQLPath);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Upload preparation completed!');
  console.log('='.repeat(60) + '\n');
}

main();
