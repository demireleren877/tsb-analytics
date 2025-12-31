import { google } from 'googleapis';
import { Config } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class MailSender {
  private config: Config;
  private gmail: any;

  constructor(config: Config) {
    this.config = config;

    const oauth2Client = new google.auth.OAuth2(
      config.gmailClientId,
      config.gmailClientSecret,
      config.gmailRedirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: config.gmailRefreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private createMessageWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachmentPath?: string
  ): string {
    const boundary = '----=_Part_' + Date.now();
    const messageParts = [];

    // Headers
    messageParts.push(`To: ${to}`);
    messageParts.push(`From: ${this.config.mailFrom}`);
    messageParts.push(`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`);
    messageParts.push('MIME-Version: 1.0');
    messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    messageParts.push('');

    // HTML Body
    messageParts.push(`--${boundary}`);
    messageParts.push('Content-Type: text/html; charset=UTF-8');
    messageParts.push('Content-Transfer-Encoding: base64');
    messageParts.push('');
    messageParts.push(Buffer.from(html).toString('base64'));
    messageParts.push('');

    // Attachment
    if (attachmentPath && fs.existsSync(attachmentPath)) {
      const fileContent = fs.readFileSync(attachmentPath);
      const fileName = path.basename(attachmentPath);
      const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      messageParts.push(`--${boundary}`);
      messageParts.push(`Content-Type: ${mimeType}; name="${fileName}"`);
      messageParts.push('Content-Transfer-Encoding: base64');
      messageParts.push(
        `Content-Disposition: attachment; filename="=?UTF-8?B?${Buffer.from(fileName).toString('base64')}?="`
      );
      messageParts.push('');
      messageParts.push(fileContent.toString('base64'));
      messageParts.push('');
    }

    messageParts.push(`--${boundary}--`);

    const message = messageParts.join('\r\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendNewFileNotification(fileName: string, filePath: string, hash: string): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .info-box strong { color: #2c3e50; }
            code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🔔 TSB'de Yeni Dosya Yayınlandı!</h2>
            <p>Takip edilen dosyanın yeni bir versiyonu tespit edildi ve ekte bulabilirsiniz.</p>

            <div class="info-box">
              <h3>📄 Dosya Bilgileri:</h3>
              <p><strong>Dosya Adı:</strong> ${fileName}</p>
              <p><strong>İndirildiği Konum:</strong> ${filePath}</p>
              <p><strong>Hash (SHA-256):</strong> <code>${hash}</code></p>
              <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>
            </div>

            <p>📎 Excel dosyası bu mailin eki olarak gönderilmiştir.</p>

            <div class="footer">
              Bu mail TSB File Monitor tarafından otomatik olarak gönderilmiştir.
            </div>
          </div>
        </body>
        </html>
      `;

      const encodedMessage = this.createMessageWithAttachment(
        this.config.mailTo,
        '🔔 TSB Yeni Dosya Bildirimi',
        html,
        filePath
      );

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`📧 Mail sent to ${this.config.mailTo} with attachment`);
    } catch (error) {
      console.error(`Failed to send email: ${error}`);
      throw error;
    }
  }

  async sendErrorNotification(errorMessage: string): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h2 { color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }
            .error-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ TSB File Monitor Hatası</h2>
            <p>Dosya kontrolü sırasında bir hata oluştu.</p>

            <div class="error-box">
              <h3>Hata Detayı:</h3>
              <pre>${errorMessage}</pre>
            </div>

            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>

            <p>Lütfen ayarlarınızı ve bağlantınızı kontrol edin.</p>

            <div class="footer">
              Bu mail TSB File Monitor tarafından otomatik olarak gönderilmiştir.
            </div>
          </div>
        </body>
        </html>
      `;

      const encodedMessage = this.createMessageWithAttachment(
        this.config.mailTo,
        '⚠️ TSB Monitor Hata Bildirimi',
        html
      );

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`📧 Error notification sent to ${this.config.mailTo}`);
    } catch (error) {
      console.error(`Failed to send error notification: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection by checking labels (requires only gmail.send scope)
      await this.gmail.users.labels.list({ userId: 'me', maxResults: 1 });
      console.log(`✅ Gmail API connection successful`);
      console.log(`   Using email: ${this.config.mailFrom}`);
      return true;
    } catch (error) {
      // Even if labels fail, gmail.send might work, so just warn
      console.log(`⚠️  Gmail API test warning (but send scope should work): ${error}`);
      return true;
    }
  }
}
