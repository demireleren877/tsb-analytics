import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { companies } from './routes/companies';
import { data } from './routes/data';
import { analytics } from './routes/analytics';
import { comparisons } from './routes/comparisons';
import { subscriptions } from './routes/subscriptions';

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
async function checkForNewData(env: Env): Promise<{ newDataFound: boolean; latestPeriod: string | null }> {
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
      return { newDataFound: false, latestPeriod: null };
    }

    const data = await response.json() as { Result?: Array<{ FileName: string; PeriodYear: number; StatisticPeriodId: number }> };

    if (!data.Result || !Array.isArray(data.Result)) {
      console.error('Invalid response format from TSB');
      return { newDataFound: false, latestPeriod: null };
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
      return { newDataFound: false, latestPeriod: null };
    }

    // Get the latest file by period
    const sortedFiles = incomeStatementFiles.sort((a, b) => {
      const periodA = a.PeriodYear * 10 + a.StatisticPeriodId;
      const periodB = b.PeriodYear * 10 + b.StatisticPeriodId;
      return periodB - periodA;
    });

    const latestFile = sortedFiles[0];
    const latestPeriod = `${latestFile.PeriodYear}${latestFile.StatisticPeriodId}`;

    // Check against stored period
    const storedPeriod = await env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'last_known_period'"
    ).first<{ value: string }>();

    const lastKnownPeriod = storedPeriod?.value || '';

    if (latestPeriod !== lastKnownPeriod && lastKnownPeriod !== '') {
      console.log(`New data found: ${latestPeriod} (previous: ${lastKnownPeriod})`);
      return { newDataFound: true, latestPeriod };
    }

    // Update the stored period if it was empty
    if (lastKnownPeriod === '') {
      await env.DB.prepare(
        "UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_known_period'"
      ).bind(latestPeriod).run();
    }

    return { newDataFound: false, latestPeriod };
  } catch (error) {
    console.error('Error checking for new data:', error);
    return { newDataFound: false, latestPeriod: null };
  }
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

  const { newDataFound, latestPeriod } = await checkForNewData(env);

  let notificationCount = 0;
  if (newDataFound && latestPeriod) {
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

  console.log(`Check completed: newDataFound=${newDataFound}, latestPeriod=${latestPeriod}, notifications=${notificationCount}`);
}

export default {
  fetch: app.fetch,
  scheduled,
};
