import cron from 'node-cron';
import { getConfig } from './config';
import { TSBDownloader } from './tsb-downloader';
import { TSBFileFinder } from './tsb-file-finder';
import { FileTracker } from './file-tracker';
import { MailSender } from './mail-sender';

async function checkAndNotify() {
  console.log('\n' + '='.repeat(60));
  console.log(`🔍 Starting file check at ${new Date().toLocaleString('tr-TR')}`);
  console.log('='.repeat(60));

  try {
    const config = getConfig();
    const finder = new TSBFileFinder(config);
    const downloader = new TSBDownloader(config);
    const tracker = new FileTracker();
    const mailSender = new MailSender(config);

    // Find file by search terms
    console.log(`\n🔍 Searching for file with terms: ${config.fileSearchTerms.join(', ')}`);
    const fileEntry = await finder.findFileByName(config.fileSearchTerms);

    if (!fileEntry) {
      throw new Error(`File not found matching terms: ${config.fileSearchTerms.join(', ')}`);
    }

    console.log(`✅ Found file: ${fileEntry.fileName} (ID: ${fileEntry.statisticId})\n`);

    // Download file
    const { filePath, hash, fileName } = await downloader.downloadFile(fileEntry.statisticId);

    // Check if file has changed
    const hasChanged = tracker.hasFileChanged(hash);

    if (hasChanged) {
      // Save new file info
      tracker.saveFileInfo({
        fileName,
        filePath,
        hash,
        downloadDate: new Date().toISOString(),
      });

      // Send notification
      console.log('📧 Sending email notification with attachment...');
      await mailSender.sendNewFileNotification(fileName, filePath, hash);
      console.log('✅ Notification sent successfully!');
    } else {
      console.log('ℹ️  No changes detected. Email not sent.');
    }

    console.log('='.repeat(60));
    console.log('✓ Check completed successfully');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Error during file check:', error);

    try {
      const config = getConfig();
      const mailSender = new MailSender(config);
      await mailSender.sendErrorNotification(String(error));
    } catch (mailError) {
      console.error('Failed to send error notification:', mailError);
    }
  }
}

async function main() {
  console.log('🚀 TSB File Monitor Started');
  console.log('='.repeat(60));

  try {
    const config = getConfig();
    console.log(`📋 Configuration loaded`);
    console.log(`   Search terms: ${config.fileSearchTerms.join(', ')}`);
    console.log(`   Schedule: ${config.cronSchedule}`);
    console.log(`   Mail to: ${config.mailTo}`);
    console.log(`   Download dir: ${config.downloadDir}`);

    // Test mail connection
    const mailSender = new MailSender(config);
    console.log('\n📧 Testing mail connection...');
    await mailSender.testConnection();

    // Check for --check-once flag
    const checkOnce = process.argv.includes('--check-once');

    if (checkOnce) {
      console.log('\n🔍 Running single check...\n');
      await checkAndNotify();
      console.log('✓ Single check completed. Exiting...');
      process.exit(0);
    }

    // Run initial check
    console.log('\n🔍 Running initial check...\n');
    await checkAndNotify();

    // Schedule recurring checks
    console.log(`⏰ Scheduling recurring checks: ${config.cronSchedule}`);
    console.log('   Press Ctrl+C to stop\n');

    cron.schedule(config.cronSchedule, async () => {
      await checkAndNotify();
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

main();
