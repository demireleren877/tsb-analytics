import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { companies } from './routes/companies';
import { data } from './routes/data';
import { analytics } from './routes/analytics';
import { comparisons } from './routes/comparisons';
import { subscriptions } from './routes/subscriptions';
import { parseExcelBuffer, ParsedRow } from './lib/excel-parser';

type Bindings = {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  API_VERSION: string;
  // Gmail API credentials
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  MAIL_FROM?: string;
};

interface Env {
  DB: D1Database;
  // Gmail API credentials
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  MAIL_FROM?: string;
  // TSB API credentials
  TSB_REMEMBER_ME_TOKEN?: string;
  TSB_SESSION_COOKIE?: string;
  TSB_XSRF_TOKEN?: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('/*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'TSB Analytics API',
    version: c.env.API_VERSION || 'v1',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.route('/api/companies', companies);
app.route('/api/data', data);
app.route('/api/analytics', analytics);
app.route('/api/comparisons', comparisons);
app.route('/api/subscriptions', subscriptions);

// Test endpoint to manually trigger scheduled check
app.get('/api/test-scheduled', async (c) => {
  console.log('Manual scheduled check triggered');

  const env = c.env as unknown as Env;
  const { newDataFound, latestPeriod, fileUrl, statisticId } = await checkForNewData(env);

  let notificationCount = 0;
  let importResult = { success: false, inserted: 0, errors: 0 };

  if (newDataFound && latestPeriod) {
    // Import new data if fileUrl is available
    if (fileUrl && statisticId) {
      importResult = await importNewPeriodData(env, latestPeriod, fileUrl, statisticId);
    }

    // Update the stored period
    await env.DB.prepare(
      "UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_known_period'"
    ).bind(latestPeriod).run();

    // Notify subscribers
    notificationCount = await notifySubscribers(env, latestPeriod);
  }

  // Log the check
  await env.DB.prepare(
    'INSERT INTO data_check_history (latest_period, new_data_found, notification_sent, notification_count) VALUES (?, ?, ?, ?)'
  ).bind(
    latestPeriod || '',
    newDataFound ? 1 : 0,
    notificationCount > 0 ? 1 : 0,
    notificationCount
  ).run();

  return c.json({
    success: true,
    newDataFound,
    latestPeriod,
    fileUrl,
    importResult,
    notificationCount,
    message: newDataFound ? `New data found! Imported ${importResult.inserted} rows. Sent ${notificationCount} notifications.` : 'No new data found.',
  });
});

// Test endpoint to manually import a specific period
app.get('/api/test-import/:period', async (c) => {
  const period = c.req.param('period');
  console.log(`Manual import triggered for period ${period}`);

  const env = c.env as unknown as Env;

  // Get file URL and statisticId for this period
  const { fileUrl, statisticId } = await checkForNewData(env);

  if (!fileUrl) {
    return c.json({ success: false, error: 'Could not find file URL' }, 400);
  }

  if (!statisticId) {
    return c.json({ success: false, error: 'Could not find statistic ID' }, 400);
  }

  const result = await importNewPeriodData(env, period, fileUrl, statisticId);

  return c.json({
    success: result.success,
    period,
    inserted: result.inserted,
    errors: result.errors,
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: c.req.path,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  }, 500);
});

// Check TSB website for new data
async function checkForNewData(env: Env): Promise<{ newDataFound: boolean; latestPeriod: string | null; fileUrl: string | null; statisticId: number | null }> {
  try {
    // Fetch the latest period from TSB API (public endpoint)
    const response = await fetch(
      'https://www.tsb.org.tr/Statistic/GetAllStatistics?CategoryUrl=finansal-tablolar&SubCategoryUrl=sirket-bazinda-mali-ve-teknik-tablolar&pageId=1',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; TSB-Analytics-Bot/1.0)',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch TSB statistics:', response.status);
      return { newDataFound: false, latestPeriod: null, fileUrl: null, statisticId: null };
    }

    const data = await response.json() as { Result?: Array<{ Id: number; FileName: string; PeriodYear: number; StatisticPeriodId: number; FilePath: string }> };

    if (!data.Result || !Array.isArray(data.Result)) {
      console.error('Invalid response format from TSB');
      return { newDataFound: false, latestPeriod: null, fileUrl: null, statisticId: null };
    }

    // Find the latest "Şirketler Gelir Tablosu Detay" file
    const incomeStatementFiles = data.Result.filter((item) => {
      const fileName = (item.FileName || '').toLowerCase()
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      return fileName.includes('sirketler') &&
        fileName.includes('gelir tablosu') &&
        fileName.includes('detay');
    });

    if (incomeStatementFiles.length === 0) {
      console.log('No income statement files found');
      return { newDataFound: false, latestPeriod: null, fileUrl: null, statisticId: null };
    }

    // Get the latest file by period
    const sortedFiles = incomeStatementFiles.sort((a, b) => {
      const periodA = a.PeriodYear * 10 + a.StatisticPeriodId;
      const periodB = b.PeriodYear * 10 + b.StatisticPeriodId;
      return periodB - periodA;
    });

    const latestFile = sortedFiles[0];
    const latestPeriod = `${latestFile.PeriodYear}${latestFile.StatisticPeriodId}`;
    const fileUrl = latestFile.FilePath ? `https://www.tsb.org.tr${latestFile.FilePath}` : null;
    const statisticId = latestFile.Id;

    // Check against stored period
    const storedPeriod = await env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'last_known_period'"
    ).first<{ value: string }>();

    const lastKnownPeriod = storedPeriod?.value || '';

    if (latestPeriod !== lastKnownPeriod && lastKnownPeriod !== '') {
      console.log(`New data found: ${latestPeriod} (previous: ${lastKnownPeriod})`);
      return { newDataFound: true, latestPeriod, fileUrl, statisticId };
    }

    // Update the stored period if it was empty
    if (lastKnownPeriod === '') {
      await env.DB.prepare(
        "UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_known_period'"
      ).bind(latestPeriod).run();
    }

    return { newDataFound: false, latestPeriod, fileUrl, statisticId };
  } catch (error) {
    console.error('Error checking for new data:', error);
    return { newDataFound: false, latestPeriod: null, fileUrl: null, statisticId: null };
  }
}

// Get TSB statistic token for file download
async function getTsbStatisticToken(env: Env, statisticId: number): Promise<string | null> {
  if (!env.TSB_REMEMBER_ME_TOKEN || !env.TSB_SESSION_COOKIE || !env.TSB_XSRF_TOKEN) {
    console.log('TSB credentials not configured');
    return null;
  }

  try {
    const cookies = [
      'politeArea=sbm',
      `rememberMeToken=${env.TSB_REMEMBER_ME_TOKEN}`,
      `.AspNetCore.Session=${env.TSB_SESSION_COOKIE}`,
      `X-XSRF-Token-Cookie=${env.TSB_XSRF_TOKEN}`,
    ].join('; ');

    const response = await fetch('https://www.tsb.org.tr/Statistic/ControlRememberMe', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'Origin': 'https://www.tsb.org.tr',
        'Referer': 'https://www.tsb.org.tr/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36',
      },
      body: `statisticId=${statisticId}`,
    });

    if (!response.ok) {
      console.error(`Failed to get TSB statistic token: ${response.status}`);
      return null;
    }

    // Extract statisticToken from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/statisticToken=([^;]+)/);
      if (match) {
        return match[1];
      }
    }

    console.log('No statisticToken found in response');
    return null;
  } catch (error) {
    console.error('Error getting TSB statistic token:', error);
    return null;
  }
}

// Download Excel file from TSB
async function downloadExcelFile(env: Env, fileUrl: string, statisticId: number): Promise<ArrayBuffer | null> {
  if (!env.TSB_REMEMBER_ME_TOKEN || !env.TSB_SESSION_COOKIE || !env.TSB_XSRF_TOKEN) {
    console.log('TSB credentials not configured, cannot download Excel');
    return null;
  }

  try {
    console.log(`Getting statistic token for ID: ${statisticId}`);
    const statisticToken = await getTsbStatisticToken(env, statisticId);

    const cookies = [
      'politeArea=sbm',
      `rememberMeToken=${env.TSB_REMEMBER_ME_TOKEN}`,
      `.AspNetCore.Session=${env.TSB_SESSION_COOKIE}`,
      `X-XSRF-Token-Cookie=${env.TSB_XSRF_TOKEN}`,
    ];

    if (statisticToken) {
      cookies.push(`statisticToken=${statisticToken}`);
    }

    console.log(`Downloading Excel from: ${fileUrl}`);
    const response = await fetch(fileUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Cookie': cookies.join('; '),
        'Referer': 'https://www.tsb.org.tr/tr/istatistik/finansal-tablolar/sirket-bazinda-mali-ve-teknik-tablolar',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to download Excel: ${response.status}`);
      return null;
    }

    // Check if we got redirected to error page
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      console.error('Got HTML response instead of Excel - probably auth error');
      return null;
    }

    const buffer = await response.arrayBuffer();
    console.log(`Downloaded ${buffer.byteLength} bytes`);
    return buffer;
  } catch (error) {
    console.error('Error downloading Excel:', error);
    return null;
  }
}

// Get or create company ID
async function getOrCreateCompanyId(env: Env, code: string, name: string): Promise<number | null> {
  try {
    // Try to find existing company
    const existing = await env.DB.prepare(
      'SELECT id FROM companies WHERE code = ?'
    ).bind(code).first<{ id: number }>();

    if (existing) {
      return existing.id;
    }

    // Create new company
    const result = await env.DB.prepare(
      'INSERT INTO companies (code, name, type) VALUES (?, ?, ?) RETURNING id'
    ).bind(code, name, 'HD').first<{ id: number }>();

    if (result) {
      console.log(`Created new company: ${name} (${code})`);
      return result.id;
    }

    return null;
  } catch (error) {
    console.error(`Error getting/creating company ${code}:`, error);
    return null;
  }
}

// Ensure period exists
async function ensurePeriodExists(env: Env, period: string): Promise<void> {
  try {
    const year = parseInt(period.substring(0, 4));
    const quarter = parseInt(period.substring(4));

    await env.DB.prepare(
      'INSERT OR IGNORE INTO periods (period, year, quarter) VALUES (?, ?, ?)'
    ).bind(period, year, quarter).run();
  } catch (error) {
    console.error(`Error ensuring period ${period}:`, error);
  }
}

// Import parsed data to database
async function importToDatabase(env: Env, rows: ParsedRow[], period: string): Promise<{ inserted: number; errors: number }> {
  console.log(`Importing ${rows.length} rows for period ${period}...`);

  // Ensure period exists
  await ensurePeriodExists(env, period);

  let inserted = 0;
  let errors = 0;

  // Process in batches
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const row of batch) {
      try {
        const companyId = await getOrCreateCompanyId(env, row.company_code, row.company_name);
        if (!companyId) {
          errors++;
          continue;
        }

        // Insert or replace financial data
        await env.DB.prepare(`
          INSERT OR REPLACE INTO financial_data (
            company_id, branch_code, period,
            gross_written_premium, ceded_to_reinsurer, transferred_to_sgk,
            unearned_premium_reserve, previous_unearned_premium_reserve,
            reinsurer_share_unearned, previous_reinsurer_share_unearned,
            sgk_share_unearned, previous_sgk_share_unearned,
            technical_investment_income, gross_paid_claims, reinsurer_share_paid_claims,
            incurred_claims, unreported_claims, reinsurer_share_incurred, reinsurer_share_unreported,
            net_premium, net_unearned_reserve, net_payment, net_unreported, net_incurred, net_earned_premium,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          companyId, row.branch_code, period,
          row.gross_written_premium, row.ceded_to_reinsurer, row.transferred_to_sgk,
          row.unearned_premium_reserve, row.previous_unearned_premium_reserve,
          row.reinsurer_share_unearned, row.previous_reinsurer_share_unearned,
          row.sgk_share_unearned, row.previous_sgk_share_unearned,
          row.technical_investment_income, row.gross_paid_claims, row.reinsurer_share_paid_claims,
          row.incurred_claims, row.unreported_claims, row.reinsurer_share_incurred, row.reinsurer_share_unreported,
          row.net_premium, row.net_unearned_reserve, row.net_payment, row.net_unreported, row.net_incurred, row.net_earned_premium
        ).run();

        inserted++;
      } catch (error) {
        console.error(`Error inserting row for ${row.company_name}/${row.branch_code}:`, error);
        errors++;
      }
    }

    console.log(`Progress: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }

  console.log(`Import complete: ${inserted} inserted, ${errors} errors`);
  return { inserted, errors };
}

// Full import flow
async function importNewPeriodData(env: Env, period: string, fileUrl: string, statisticId: number): Promise<{ success: boolean; inserted: number; errors: number }> {
  console.log(`Starting import for period ${period}...`);

  // Download Excel
  const buffer = await downloadExcelFile(env, fileUrl, statisticId);
  if (!buffer) {
    return { success: false, inserted: 0, errors: 0 };
  }

  // Parse Excel
  let rows: ParsedRow[];
  try {
    rows = parseExcelBuffer(buffer, period);
  } catch (error) {
    console.error('Error parsing Excel:', error);
    return { success: false, inserted: 0, errors: 0 };
  }

  if (rows.length === 0) {
    console.log('No data found in Excel');
    return { success: false, inserted: 0, errors: 0 };
  }

  // Import to database
  const result = await importToDatabase(env, rows, period);

  return { success: true, ...result };
}

// Get Gmail access token using refresh token
async function getGmailAccessToken(env: Env): Promise<string | null> {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
    console.log('Gmail credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get Gmail access token:', await response.text());
      return null;
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  } catch (error) {
    console.error('Error getting Gmail access token:', error);
    return null;
  }
}

// Create base64url encoded email message
function createEmailMessage(to: string, from: string, subject: string, htmlBody: string): string {
  const messageParts = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlBody))),
  ];

  const message = messageParts.join('\r\n');

  // Convert to base64url
  return btoa(message)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send email via Gmail API
async function sendGmailEmail(
  accessToken: string,
  to: string,
  from: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const rawMessage = createEmailMessage(to, from, subject, htmlBody);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawMessage,
      }),
    });

    if (!response.ok) {
      console.error('Gmail API error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Gmail:', error);
    return false;
  }
}

// Send email notifications to subscribers
async function notifySubscribers(env: Env, period: string): Promise<number> {
  // Get Gmail access token
  const accessToken = await getGmailAccessToken(env);
  if (!accessToken) {
    console.log('Gmail access token not available, skipping email notifications');
    return 0;
  }

  const mailFrom = env.MAIL_FROM || 'noreply@gmail.com';

  try {
    // Get all active subscribers
    const subscribers = await env.DB.prepare(
      'SELECT id, email, unsubscribe_token FROM subscriptions WHERE is_active = 1'
    ).all<{ id: number; email: string; unsubscribe_token: string }>();

    if (!subscribers.results || subscribers.results.length === 0) {
      console.log('No active subscribers to notify');
      return 0;
    }

    const year = period.slice(0, 4);
    const quarter = period.slice(4);
    const periodText = `${year} Q${quarter}`;

    let sentCount = 0;

    for (const subscriber of subscribers.results) {
      try {
        const unsubscribeUrl = `https://tsb-analytics-api.l5819033.workers.dev/api/subscriptions/unsubscribe/${subscriber.unsubscribe_token}`;

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              h2 { color: #1a365d; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🔔 Yeni TSB Verisi Yayınlandı!</h2>
              <p>Merhaba,</p>
              <div class="info-box">
                <p>TSB web sitesinde <strong>${periodText}</strong> dönemi için yeni "Şirketler Gelir Tablosu Detay" verisi yayınlandı.</p>
                <p>Verileri incelemek için TSB Analytics uygulamasını ziyaret edebilirsiniz.</p>
              </div>
              <div class="footer">
                <p>Bu e-postayı almak istemiyorsanız <a href="${unsubscribeUrl}">buraya tıklayarak</a> aboneliğinizi iptal edebilirsiniz.</p>
                <p>Bu mail TSB Analytics tarafından otomatik olarak gönderilmiştir.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const success = await sendGmailEmail(
          accessToken,
          subscriber.email,
          mailFrom,
          `🔔 Yeni TSB Verisi Yayınlandı - ${periodText}`,
          htmlBody
        );

        if (success) {
          sentCount++;
          await env.DB.prepare(
            'UPDATE subscriptions SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(subscriber.id).run();
          console.log(`Email sent to ${subscriber.email}`);
        } else {
          console.error(`Failed to send email to ${subscriber.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${subscriber.email}:`, emailError);
      }
    }

    return sentCount;
  } catch (error) {
    console.error('Error notifying subscribers:', error);
    return 0;
  }
}

// Scheduled handler for cron triggers
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  console.log(`Scheduled check triggered at ${new Date().toISOString()}`);

  const { newDataFound, latestPeriod, fileUrl, statisticId } = await checkForNewData(env);

  let notificationCount = 0;
  let importedRows = 0;

  if (newDataFound && latestPeriod) {
    // Import new data if fileUrl is available
    if (fileUrl && statisticId) {
      const importResult = await importNewPeriodData(env, latestPeriod, fileUrl, statisticId);
      importedRows = importResult.inserted;
      console.log(`Import result: ${importResult.inserted} inserted, ${importResult.errors} errors`);
    }

    // Update the stored period
    await env.DB.prepare(
      "UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_known_period'"
    ).bind(latestPeriod).run();

    // Notify subscribers
    notificationCount = await notifySubscribers(env, latestPeriod);
  }

  // Log the check
  await env.DB.prepare(
    'INSERT INTO data_check_history (latest_period, new_data_found, notification_sent, notification_count) VALUES (?, ?, ?, ?)'
  ).bind(
    latestPeriod || '',
    newDataFound ? 1 : 0,
    notificationCount > 0 ? 1 : 0,
    notificationCount
  ).run();

  console.log(`Check completed: newDataFound=${newDataFound}, latestPeriod=${latestPeriod}, imported=${importedRows}, notifications=${notificationCount}`);
}

export default {
  fetch: app.fetch,
  scheduled,
};
