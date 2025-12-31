import { TSBApiDownloader } from './tsb-api-downloader';
import { getConfig } from './config';

async function main() {
  console.log('🚀 TSB API Downloader');
  console.log('='.repeat(60));

  const config = getConfig();
  const downloader = new TSBApiDownloader(config);

  const startYear = parseInt(process.argv[2] || '2020');
  console.log(`\n📅 Starting from year: ${startYear}\n`);

  try {
    const downloadedFiles = await downloader.downloadAllFiles(startYear);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Download completed!');
    console.log(`📁 Files saved to: ${config.downloadDir}`);
    console.log('\n💡 Next step: Run "npm run combine" to process the files');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Download failed:', error);
    process.exit(1);
  }
}

main();
