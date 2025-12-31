export interface Config {
  tsbRememberMeToken: string;
  tsbSessionCookie: string;
  tsbXsrfToken: string;
  fileSearchTerms: string[];
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRedirectUri: string;
  gmailRefreshToken: string;
  mailFrom: string;
  mailTo: string;
  cronSchedule: string;
  downloadDir: string;
}

export interface FileInfo {
  fileName: string;
  filePath: string;
  hash: string;
  downloadDate: string;
}
