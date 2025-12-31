import dotenv from 'dotenv';
import { Config } from './types';

dotenv.config();

export function getConfig(): Config {
  const requiredEnvVars = [
    'TSB_REMEMBER_ME_TOKEN',
    'TSB_SESSION_COOKIE',
    'TSB_XSRF_TOKEN',
    'FILE_SEARCH_TERMS',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REDIRECT_URI',
    'GMAIL_REFRESH_TOKEN',
    'MAIL_FROM',
    'MAIL_TO',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // FILE_SEARCH_TERMS virgülle ayrılmış string olarak gelir
  const searchTerms = process.env.FILE_SEARCH_TERMS!
    .split(',')
    .map(term => term.trim())
    .filter(term => term.length > 0);

  return {
    tsbRememberMeToken: process.env.TSB_REMEMBER_ME_TOKEN!,
    tsbSessionCookie: process.env.TSB_SESSION_COOKIE!,
    tsbXsrfToken: process.env.TSB_XSRF_TOKEN!,
    fileSearchTerms: searchTerms,
    gmailClientId: process.env.GMAIL_CLIENT_ID!,
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET!,
    gmailRedirectUri: process.env.GMAIL_REDIRECT_URI!,
    gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN!,
    mailFrom: process.env.MAIL_FROM!,
    mailTo: process.env.MAIL_TO!,
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *',
    downloadDir: process.env.DOWNLOAD_DIR || './datas',
  };
}
