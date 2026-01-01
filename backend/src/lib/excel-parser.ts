import * as XLSX from 'xlsx';

// All TSB branch codes (701-799, 855, 856)
const TARGET_SHEETS = [
  '701', '702', '703', '704', '705', '706', '707', '708', '710', '711', '712', '713', '714',
  '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727',
  '728', '729', '730', '731', '732', '733', '734', '735', '736', '737', '738', '739', '740',
  '741', '742', '743', '744', '745', '746', '747', '748', '749', '750', '751', '752', '753',
  '754', '755', '756', '757', '758', '759', '760', '761', '765', '766', '767', '768', '769',
  '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782',
  '783', '784', '785', '786', '789', '790', '791', '792', '793', '794', '795', '796', '797',
  '798', '799', '855', '856'
];

// Column mapping from Turkish Excel headers to database columns
const SOURCE_COLUMNS: { [key: string]: string } = {
  'Brüt Yazılan Primler (+/-);': 'gross_written_premium',
  'Reasüröre Devredilen Primler (+/-);': 'ceded_to_reinsurer',
  'SGK ya Aktarılan Primler (-);': 'transferred_to_sgk',
  'Kazanılmamış Primler Karşılığı (+/-);': 'unearned_premium_reserve',
  'Devreden Kazanılmamış Primler Karşılığı (+/-);': 'previous_unearned_premium_reserve',
  'Kazanılmamış Prımler Karşılığında Reasürör Payı (+/-);': 'reinsurer_share_unearned',
  'Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-);': 'previous_reinsurer_share_unearned',
  'Kazanılmamış Prımler Karşılığında SGK Payı (+/-);': 'sgk_share_unearned',
  'Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-);': 'previous_sgk_share_unearned',
  'Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri': 'technical_investment_income',
  'Brüt Ödenen Tazminatlar (+/-);': 'gross_paid_claims',
  'Ödenen Tazminatlarda Reasürör Payı (+/-);': 'reinsurer_share_paid_claims'
};

export interface ParsedRow {
  company_code: string;
  company_name: string;
  branch_code: string;
  period: string;
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
  net_premium: number;
  net_unearned_reserve: number;
  net_payment: number;
  net_unreported: number;
  net_incurred: number;
  net_earned_premium: number;
}

function parseNumber(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  // Handle Turkish number format (comma as decimal separator)
  const strValue = String(value).replace(/,/g, '.');
  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? 0 : parsed;
}

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string, period: string): ParsedRow[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const result: ParsedRow[] = [];

  // Find header row
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
    console.warn(`Header not found in sheet ${sheetName}`);
    return result;
  }

  const headers = rows[headerRowIndex];

  // Build column index map
  const columnIndex: { [key: string]: number } = {};
  headers.forEach((header: any, index: number) => {
    if (header) {
      columnIndex[String(header).trim()] = index;
    }
  });

  // Parse data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const sirketAdi = row[0];
    if (!sirketAdi || typeof sirketAdi !== 'string') continue;

    // Skip TOPLAM row
    if (sirketAdi.includes('TOPLAM')) break;

    // Get company type
    const sirketTipiIndex = columnIndex['Şirket Tipi'] || 2;
    const sirketTipi = row[sirketTipiIndex];
    if (sirketTipi !== 'HD') continue;

    // Get company code
    const sirketKoduIndex = columnIndex['Şirket Kodu'] || 1;
    const sirketKodu = String(row[sirketKoduIndex] || '');

    // Extract values
    const getValue = (colName: string): number => {
      const idx = columnIndex[colName];
      return idx !== undefined ? parseNumber(row[idx]) : 0;
    };

    // Get basic financial values
    const grossWrittenPremium = getValue('Brüt Yazılan Primler (+/-);') || getValue('Brüt Yazılan Primler (+/-)');
    const cedeedToReinsurer = getValue('Reasüröre Devredilen Primler (+/-);') || getValue('Reasüröre Devredilen Primler (+/-)');
    const transferredToSgk = getValue('SGK ya Aktarılan Primler (-);') || getValue('SGK ya Aktarılan Primler (-)');
    const unearnedReserve = getValue('Kazanılmamış Primler Karşılığı (+/-);') || getValue('Kazanılmamış Primler Karşılığı (+/-)');
    const prevUnearnedReserve = getValue('Devreden Kazanılmamış Primler Karşılığı (+/-);') || getValue('Devreden Kazanılmamış Primler Karşılığı (+/-)');
    const reinsurerShareUnearned = getValue('Kazanılmamış Prımler Karşılığında Reasürör Payı (+/-);') || getValue('Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)');
    const prevReinsurerShareUnearned = getValue('Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-);') || getValue('Devreden Kazanılmamış Primler Karşılığında Reasürör Payı (+/-)');
    const sgkShareUnearned = getValue('Kazanılmamış Prımler Karşılığında SGK Payı (+/-);') || getValue('Kazanılmamış Primler Karşılığında SGK Payı (+/-)');
    const prevSgkShareUnearned = getValue('Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-);') || getValue('Devreden Kazanılmamış Primler Karşılığında SGK Payı (+/-)');
    const technicalIncome = getValue('Teknik Olmayan Bölümden Aktarılan Yatırım Gelirleri');
    const grossPaidClaims = getValue('Brüt Ödenen Tazminatlar (+/-);') || getValue('Brüt Ödenen Tazminatlar (+/-)');
    const reinsurerSharePaid = getValue('Ödenen Tazminatlarda Reasürör Payı (+/-);') || getValue('Ödenen Tazminatlarda Reasürör Payı (+/-)');

    // Get claim values from specific positions
    const incurred = parseNumber(row[111]) || 0;
    const unreported = parseNumber(row[117]) || 0;
    const reinsurerShareIncurred = parseNumber(row[123]) || 0;
    const reinsurerShareUnreported = parseNumber(row[129]) || 0;

    // Calculate net values
    const netPremium = grossWrittenPremium + cedeedToReinsurer + transferredToSgk;
    const netUnearnedReserve = unearnedReserve + prevUnearnedReserve +
      reinsurerShareUnearned + prevReinsurerShareUnearned +
      sgkShareUnearned + prevSgkShareUnearned;
    const netPayment = grossPaidClaims + reinsurerSharePaid;
    const netUnreported = unreported + reinsurerShareUnreported;
    const netIncurred = incurred + reinsurerShareIncurred;
    const netEarnedPremium = netPremium + netUnearnedReserve;

    result.push({
      company_code: sirketKodu,
      company_name: sirketAdi,
      branch_code: sheetName,
      period: period,
      gross_written_premium: grossWrittenPremium,
      ceded_to_reinsurer: cedeedToReinsurer,
      transferred_to_sgk: transferredToSgk,
      unearned_premium_reserve: unearnedReserve,
      previous_unearned_premium_reserve: prevUnearnedReserve,
      reinsurer_share_unearned: reinsurerShareUnearned,
      previous_reinsurer_share_unearned: prevReinsurerShareUnearned,
      sgk_share_unearned: sgkShareUnearned,
      previous_sgk_share_unearned: prevSgkShareUnearned,
      technical_investment_income: technicalIncome,
      gross_paid_claims: grossPaidClaims,
      reinsurer_share_paid_claims: reinsurerSharePaid,
      incurred_claims: incurred,
      unreported_claims: unreported,
      reinsurer_share_incurred: reinsurerShareIncurred,
      reinsurer_share_unreported: reinsurerShareUnreported,
      net_premium: netPremium,
      net_unearned_reserve: netUnearnedReserve,
      net_payment: netPayment,
      net_unreported: netUnreported,
      net_incurred: netIncurred,
      net_earned_premium: netEarnedPremium
    });
  }

  return result;
}

export function parseExcelBuffer(buffer: ArrayBuffer, period: string): ParsedRow[] {
  console.log(`Parsing Excel for period ${period}...`);

  const workbook = XLSX.read(buffer, { type: 'array' });
  const allData: ParsedRow[] = [];

  for (const sheetName of TARGET_SHEETS) {
    if (workbook.SheetNames.includes(sheetName)) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = parseSheet(sheet, sheetName, period);
      console.log(`Sheet ${sheetName}: ${sheetData.length} HD companies`);
      allData.push(...sheetData);
    }
  }

  console.log(`Total rows extracted: ${allData.length}`);
  return allData;
}

export { TARGET_SHEETS };
