import * as fs from 'fs';
import * as path from 'path';
import { ExcelCombiner } from './excel-combiner';

async function main() {
  console.log('🚀 TSB Excel Data Combiner');
  console.log('='.repeat(60));

  const datasDir = './datas';
  const combinedFilePath = path.join(datasDir, 'combined_data.xlsx');

  // datas klasöründeki Excel dosyalarını bul (combined_data.xlsx hariç)
  if (!fs.existsSync(datasDir)) {
    console.error(`❌ Directory not found: ${datasDir}`);
    return;
  }

  const allFiles = fs.readdirSync(datasDir)
    .filter(f => f.endsWith('.xlsx') && f !== 'combined_data.xlsx')
    .map(f => path.join(datasDir, f));

  // Dosya ismi formatı: 20201.xlsx, 20202.xlsx, ... 20253.xlsx
  // YYYYQ formatındaki tüm dosyaları al
  const targetFiles = allFiles.filter(filePath => {
    const fileName = path.basename(filePath, '.xlsx');
    // Format: YYYYQ (örn: 20201, 20244, 20251)
    const match = fileName.match(/^(\d{4})(\d)$/);
    return match !== null; // YYYYQ formatındaki tüm dosyaları kabul et
  });

  if (targetFiles.length === 0) {
    console.log('\n❌ No Excel files found in datas folder');
    console.log(`📂 Looking in: ${datasDir}`);
    console.log('💡 Expected format: YYYYQ.xlsx (e.g., 20201.xlsx, 20244.xlsx)');
    return;
  }

  console.log(`\n📂 Found ${targetFiles.length} file(s) in datas folder:\n`);
  targetFiles.forEach(f => {
    console.log(`   - ${path.basename(f)}`);
  });

  // Excel Combiner oluştur
  const combiner = new ExcelCombiner();

  // Tüm dosyaları parse et
  console.log('\n📊 Parsing Excel files...');
  console.log('='.repeat(60));

  const combinedData = combiner.combineMultipleFiles(targetFiles);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Parsing completed!`);
  console.log(`   Total rows extracted: ${combinedData.length}`);

  // Duplicate'leri temizle
  const uniqueData = combiner.removeDuplicates(combinedData);

  // Previous Year End verilerini ekle
  const dataWithPYE = combiner.addPreviousYearEndData(uniqueData);

  // Previous Quarter verilerini ekle
  const dataWithPQ = combiner.addPreviousQuarterData(dataWithPYE);

  // Veriyi kaydet (append mode)
  combiner.saveCombinedData(dataWithPQ, combinedFilePath);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Data combination completed!');
  console.log(`   Output file: ${combinedFilePath}`);
  console.log(`   Total rows: ${uniqueData.length}`);
  console.log('='.repeat(60) + '\n');
}

main();
