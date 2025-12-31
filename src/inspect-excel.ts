import * as XLSX from 'xlsx';

const filePath = process.argv[2] || 'datas/20253.xlsx';
const sheetName = process.argv[3] || 'Gelir Tablosu';

console.log(`\n📄 Inspecting: ${filePath}`);
console.log(`📊 Sheet: ${sheetName}\n`);

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  console.error(`❌ Sheet "${sheetName}" not found!`);
  console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`);
  process.exit(1);
}

const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

console.log(`Total rows: ${data.length}\n`);
console.log('First 20 rows:\n');

data.slice(0, 20).forEach((row, index) => {
  console.log(`Row ${index}:`, row.slice(0, 8));
});
