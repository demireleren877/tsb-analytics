import * as fs from 'fs';
import * as path from 'path';
import { FileInfo } from './types';

export class FileTracker {
  private trackingFile: string;

  constructor(trackingFile: string = './file-tracking.json') {
    this.trackingFile = trackingFile;
  }

  getLastFileInfo(): FileInfo | null {
    try {
      if (!fs.existsSync(this.trackingFile)) {
        return null;
      }

      const data = fs.readFileSync(this.trackingFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading tracking file: ${error}`);
      return null;
    }
  }

  saveFileInfo(fileInfo: FileInfo): void {
    try {
      fs.writeFileSync(this.trackingFile, JSON.stringify(fileInfo, null, 2));
      console.log(`📝 File info saved to ${this.trackingFile}`);
    } catch (error) {
      console.error(`Error saving tracking file: ${error}`);
    }
  }

  hasFileChanged(newHash: string): boolean {
    const lastFileInfo = this.getLastFileInfo();

    if (!lastFileInfo) {
      console.log('ℹ️  No previous file info found. This is the first check.');
      return true;
    }

    const changed = lastFileInfo.hash !== newHash;

    if (changed) {
      console.log('🔄 File has changed!');
      console.log(`   Old hash: ${lastFileInfo.hash}`);
      console.log(`   New hash: ${newHash}`);
    } else {
      console.log('✓ File has not changed');
    }

    return changed;
  }
}
