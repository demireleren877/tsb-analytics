import axios from 'axios';
import { Config } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class TSBDownloader {
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

  async getStatisticToken(statisticId: number): Promise<{ token: string; filePath: string }> {
    try {
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

      const filePath = response.data;

      // Extract statisticToken from set-cookie header
      const setCookie = response.headers['set-cookie'];
      let statisticToken = '';

      if (setCookie) {
        const tokenCookie = setCookie.find((cookie: string) => cookie.startsWith('statisticToken='));
        if (tokenCookie) {
          statisticToken = tokenCookie.split(';')[0].replace('statisticToken=', '');
        }
      }

      return { token: statisticToken, filePath: filePath.replace(/"/g, '') };
    } catch (error) {
      throw new Error(`Failed to get statistic token: ${error}`);
    }
  }

  async downloadFile(statisticId: number): Promise<{ filePath: string; hash: string; fileName: string }> {
    try {
      // Get statistic token
      const { token, filePath } = await this.getStatisticToken(statisticId);

      console.log(`📥 Downloading: ${filePath}`);

      // Download file
      const fileUrl = `${this.baseUrl}${filePath}`;
      const response = await axios.get(fileUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Cookie': this.getCookieString(token),
          'Referer': `${this.baseUrl}/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar`,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        },
        responseType: 'arraybuffer',
      });

      // Ensure download directory exists
      if (!fs.existsSync(this.config.downloadDir)) {
        fs.mkdirSync(this.config.downloadDir, { recursive: true });
      }

      // Extract filename from path
      const fileName = path.basename(filePath);
      const localFilePath = path.join(this.config.downloadDir, fileName);

      // Save file
      fs.writeFileSync(localFilePath, response.data);

      // Calculate hash
      const hash = crypto.createHash('sha256').update(response.data).digest('hex');

      console.log(`✅ File downloaded: ${fileName}`);
      console.log(`📝 Hash: ${hash}`);

      return { filePath: localFilePath, hash, fileName };
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }
}
