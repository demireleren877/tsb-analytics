import axios from 'axios';
import { Config } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface FileEntry {
  statisticId: number;
  fileName: string;
  filePath: string;
}

interface DownloadedFile {
  statisticId: number;
  fileName: string;
  localPath: string;
  year: number;
  quarter: number;
  hash: string;
}

export class TSBBulkDownloader {
  private config: Config;
  private baseUrl = 'https://www.tsb.org.tr';

  constructor(config: Config) {
    this.config = config;
  }

  private getCookieString(includeStatisticToken?: string): string {
    let cookies = [
      'politeArea=sbm',
      `rememberMeToken=${this.config.tsbRememberMeToken}`,
      `.AspNetCore.Session=${this.config.tsbSessionCookie}`,
      `X-XSRF-Token-Cookie=${this.config.tsbXsrfToken}`,
    ];

    if (includeStatisticToken) {
      cookies.push(`statisticToken=${includeStatisticToken}`);
    }

    return cookies.join('; ');
  }

  /**
   * Dosya adından yıl ve çeyrek bilgisini çıkartır
   * Örnek: "3 Company Level Income Statement Details 2025 3.xlsx" -> { year: 2025, quarter: 3 }
   */
  private extractYearQuarter(fileName: string): { year: number; quarter: number } | null {
    // Pattern: "YYYY Q" veya "YYYY QQ" formatında
    const match = fileName.match(/(\d{4})\s+(\d{1,2})/);
    if (match) {
      return {
        year: parseInt(match[1]),
        quarter: parseInt(match[2]),
      };
    }
    return null;
  }

  /**
   * Tüm Income Statement Details dosyalarını bulur ve filtreler
   */
  async findAllIncomeStatementFiles(startYear: number = 2020): Promise<FileEntry[]> {
    console.log(`\n📂 Searching for all Income Statement Details files from ${startYear}...\n`);

    const files: FileEntry[] = [];
    const startId = 4000; // Çok daha geniş aralık - eski dosyalar için
    const endId = 5200;

    for (let id = startId; id <= endId; id++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/Statistic/ControlRememberMe`,
          `statisticId=${id}`,
          {
            headers: {
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Cookie': this.getCookieString(),
              'Origin': this.baseUrl,
              'Referer': `${this.baseUrl}/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar`,
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
            },
            timeout: 5000,
          }
        );

        const filePath = response.data.replace(/"/g, '');
        const fileName = filePath.split('/').pop() || '';

        // "Income Statement" ve "Details" içeren dosyaları filtrele
        if (fileName.toLowerCase().includes('income statement') &&
            fileName.toLowerCase().includes('details')) {

          const yearQuarter = this.extractYearQuarter(fileName);

          if (yearQuarter && yearQuarter.year >= startYear) {
            files.push({ statisticId: id, fileName, filePath });
            console.log(`✓ [${id}] ${fileName} (${yearQuarter.year} Q${yearQuarter.quarter})`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Sessizce devam et
        continue;
      }
    }

    console.log(`\n📊 Found ${files.length} Income Statement Details files from ${startYear}\n`);
    return files;
  }

  /**
   * Belirtilen dosyayı indirir
   */
  async downloadFile(
    statisticId: number,
    fileName: string,
    filePath: string
  ): Promise<DownloadedFile | null> {
    try {
      // Get statistic token
      const response = await axios.post(
        `${this.baseUrl}/Statistic/ControlRememberMe`,
        `statisticId=${statisticId}`,
        {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': this.getCookieString(),
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar`,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
          },
        }
      );

      const setCookie = response.headers['set-cookie'];
      let statisticToken = '';

      if (setCookie) {
        const tokenCookie = setCookie.find((cookie: string) => cookie.startsWith('statisticToken='));
        if (tokenCookie) {
          statisticToken = tokenCookie.split(';')[0].replace('statisticToken=', '');
        }
      }

      // Download file
      const fileUrl = `${this.baseUrl}${filePath}`;
      const fileResponse = await axios.get(fileUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Cookie': this.getCookieString(statisticToken),
          'Referer': `${this.baseUrl}/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar`,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        },
        responseType: 'arraybuffer',
      });

      // Ensure download directory exists
      if (!fs.existsSync(this.config.downloadDir)) {
        fs.mkdirSync(this.config.downloadDir, { recursive: true });
      }

      const localFilePath = path.join(this.config.downloadDir, fileName);
      fs.writeFileSync(localFilePath, fileResponse.data);

      const hash = crypto.createHash('sha256').update(fileResponse.data).digest('hex');
      const yearQuarter = this.extractYearQuarter(fileName);

      return {
        statisticId,
        fileName,
        localPath: localFilePath,
        year: yearQuarter?.year || 0,
        quarter: yearQuarter?.quarter || 0,
        hash,
      };
    } catch (error) {
      console.error(`❌ Failed to download ${fileName}: ${error}`);
      return null;
    }
  }

  /**
   * Tüm dosyaları toplu olarak indirir
   */
  async downloadAllFiles(startYear: number = 2020): Promise<DownloadedFile[]> {
    const files = await this.findAllIncomeStatementFiles(startYear);
    const downloaded: DownloadedFile[] = [];

    console.log(`📥 Starting bulk download of ${files.length} files...\n`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[${i + 1}/${files.length}] Downloading: ${file.fileName}`);

      const result = await this.downloadFile(file.statisticId, file.fileName, file.filePath);

      if (result) {
        downloaded.push(result);
        console.log(`   ✓ Saved to: ${result.localPath}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Downloaded ${downloaded.length}/${files.length} files successfully!\n`);

    // Save download manifest
    const manifest = {
      downloadDate: new Date().toISOString(),
      totalFiles: downloaded.length,
      startYear,
      files: downloaded,
    };

    const manifestPath = path.join(this.config.downloadDir, 'download-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📝 Manifest saved to: ${manifestPath}\n`);

    return downloaded;
  }
}
