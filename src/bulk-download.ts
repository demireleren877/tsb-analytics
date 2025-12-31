import { getConfig } from './config';
import { TSBBulkDownloader } from './tsb-bulk-downloader';

async function main() {
  console.log('🚀 TSB Bulk Downloader');
  console.log('='.repeat(60));

  try {
    // Get start year from command line or default to 2020
    const args = process.argv.slice(2);
    const startYear = args[0] ? parseInt(args[0]) : 2020;

    console.log(`📅 Starting year: ${startYear}\n`);

    const config = getConfig();
    const downloader = new TSBBulkDownloader(config);

    const files = await downloader.downloadAllFiles(startYear);

    console.log('='.repeat(60));
    console.log('✅ Bulk download completed!');
    console.log(`   Total files: ${files.length}`);
    console.log(`   Download directory: ${config.downloadDir}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
