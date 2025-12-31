import axios from 'axios';
import { Config } from './types';

interface FileEntry {
  statisticId: number;
  fileName: string;
  filePath: string;
}

export class TSBFileFinder {
  private config: Config;
  private baseUrl = 'https://www.tsb.org.tr';

  constructor(config: Config) {
    this.config = config;
  }

  private getCookieString(): string {
    return [
      'politeArea=sbm',
      `rememberMeToken=${this.config.tsbRememberMeToken}`,
      `.AspNetCore.Session=${this.config.tsbSessionCookie}`,
      `X-XSRF-Token-Cookie=${this.config.tsbXsrfToken}`,
    ].join('; ');
  }

  /**
   * Belirtilen dosya ismini içeren dosyayı bulur
   * Örnek: "Gelir Tablosu Detay" arar
   */
  async findFileByName(searchTerms: string[]): Promise<FileEntry | null> {
    console.log(`🔍 Searching for file matching: ${searchTerms.join(' ')}`);

    // Bilinen ID aralığında tara (5050-5070 arası TSB finansal tablolar)
    const startId = 5050;
    const endId = 5070;
    const files: FileEntry[] = [];

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
          }
        );

        const filePath = response.data.replace(/"/g, '');
        const fileName = filePath.split('/').pop() || '';

        files.push({ statisticId: id, fileName, filePath });

        // Tüm arama terimlerini içeriyor mu kontrol et
        const fileNameLower = fileName.toLowerCase();
        const allTermsMatch = searchTerms.every(term =>
          fileNameLower.includes(term.toLowerCase())
        );

        if (allTermsMatch) {
          console.log(`✅ Found matching file!`);
          console.log(`   ID: ${id}`);
          console.log(`   Name: ${fileName}`);
          return { statisticId: id, fileName, filePath };
        }

        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Hata durumunda devam et
        continue;
      }
    }

    console.log(`❌ No file found matching: ${searchTerms.join(' ')}`);
    console.log(`\n📋 Available files (${files.length} found):`);
    files.forEach(f => {
      console.log(`   [${f.statisticId}] ${f.fileName}`);
    });

    return null;
  }

  /**
   * Tüm mevcut dosyaları listeler
   */
  async listAllFiles(): Promise<FileEntry[]> {
    const startId = 5050;
    const endId = 5070;
    const files: FileEntry[] = [];

    console.log('📂 Listing all available files...\n');

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
          }
        );

        const filePath = response.data.replace(/"/g, '');
        const fileName = filePath.split('/').pop() || '';

        files.push({ statisticId: id, fileName, filePath });
        console.log(`[${id}] ${fileName}`);

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        continue;
      }
    }

    return files;
  }
}
