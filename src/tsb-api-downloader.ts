import axios from 'axios';
import { Config } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface StatisticFile {
  id: number;
  fileName: string;
  filePath: string;
  year: number;
  quarter: number;
}

export class TSBApiDownloader {
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
   * API üzerinden tüm istatistik dosyalarını listeler
   */
  async getAllStatistics(): Promise<any[]> {
    try {
      let allResults: any[] = [];
      const maxPages = 22;

      console.log(`📥 Fetching pages 1-${maxPages}...\n`);

      for (let pageId = 1; pageId <= maxPages; pageId++) {
        const response = await axios.get(
          `${this.baseUrl}/Statistic/GetAllStatistics`,
          {
            params: {
              CategoryUrl: 'finansal-tablolar',
              SubCategoryUrl: 'sirket-bazinda-mali-ve-teknik-tablolar',
              pageId: pageId,
              _: Date.now()
            },
            headers: {
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Cookie': this.getCookieString(),
              'Referer': `${this.baseUrl}/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar`,
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
            }
          }
        );

        if (response.data && response.data.Result && Array.isArray(response.data.Result)) {
          const results = response.data.Result;
          allResults = allResults.concat(results);
          console.log(`   Page ${pageId}: ${results.length} files`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log(`\n📊 Total files fetched: ${allResults.length}\n`);
      return allResults;
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * 2020 ve sonrasındaki Income Statement Details dosyalarını bulur
   */
  async findIncomeStatementFiles(startYear: number = 2020): Promise<StatisticFile[]> {
    console.log(`\n📂 Searching for "Şirketler Gelir Tablosu Detay" files...\n`);

    const allResults = await this.getAllStatistics();
    const files: StatisticFile[] = [];

    // API response'u parse et
    for (const item of allResults) {
      const fileName = item.FileName || '';

      // "Şirketler Gelir Tablosu Detay" içeren dosyaları filtrele
      const normalizedFileName = fileName.toLowerCase()
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');

      if (normalizedFileName.includes('sirketler') &&
          normalizedFileName.includes('gelir tablosu') &&
          normalizedFileName.includes('detay')) {

        // PeriodYear zaten var, sadece quarter'ı çıkart
        const year = item.PeriodYear;
        const quarter = item.StatisticPeriodId; // 1, 2, 3, 4

        if (year >= startYear) {
          files.push({
            id: item.Id,
            fileName,
            filePath: item.FilePath,
            year: year,
            quarter: quarter
          });
          console.log(`✓ Found: ${fileName} (${year} Q${quarter})`);
        }
      }
    }

    console.log(`\n📊 Found ${files.length} Income Statement Details files from ${startYear}\n`);
    return files.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    });
  }

  /**
   * Belirtilen dosyayı indirir
   */
  async downloadFile(file: StatisticFile): Promise<string | null> {
    try {
      // Get statistic token
      const response = await axios.post(
        `${this.baseUrl}/Statistic/ControlRememberMe`,
        `statisticId=${file.id}`,
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
      const fileUrl = `${this.baseUrl}${file.filePath}`;
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

      // YYYYQ formatında kaydet
      const localFileName = `${file.year}${file.quarter}.xlsx`;
      const localFilePath = path.join(this.config.downloadDir, localFileName);
      fs.writeFileSync(localFilePath, fileResponse.data);

      return localFilePath;
    } catch (error) {
      console.error(`❌ Failed to download ${file.fileName}:`, error);
      return null;
    }
  }

  /**
   * Tüm dosyaları toplu olarak indirir
   */
  async downloadAllFiles(startYear: number = 2020): Promise<string[]> {
    const files = await this.findIncomeStatementFiles(startYear);
    const downloaded: string[] = [];

    console.log(`📥 Starting download of ${files.length} files...\n`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const localFileName = `${file.year}${file.quarter}.xlsx`;

      console.log(`[${i + 1}/${files.length}] Downloading: ${file.fileName} -> ${localFileName}`);

      const result = await this.downloadFile(file);

      if (result) {
        downloaded.push(result);
        console.log(`   ✓ Saved to: ${result}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Downloaded ${downloaded.length}/${files.length} files successfully!\n`);
    return downloaded;
  }
}
