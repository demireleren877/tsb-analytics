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

// Send email notifications to subscribers
async function notifySubscribers(env: Env, period: string): Promise<number> {
  if (!env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email notifications');
    return 0;
  }

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
        const unsubscribeUrl = `https://tsb-analytics-api.your-domain.workers.dev/api/subscriptions/unsubscribe/${subscriber.unsubscribe_token}`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TSB Analytics <noreply@your-domain.com>',
            to: [subscriber.email],
            subject: `Yeni TSB Verisi Yayınlandı - ${periodText}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Yeni TSB Verisi Yayınlandı</h2>
                <p>Merhaba,</p>
                <p>TSB web sitesinde <strong>${periodText}</strong> dönemi için yeni "Şirketler Gelir Tablosu Detay" verisi yayınlandı.</p>
                <p>Verileri incelemek için TSB Analytics uygulamasını ziyaret edebilirsiniz.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Bu e-postayı almak istemiyorsanız <a href="${unsubscribeUrl}">buraya tıklayarak</a> aboneliğinizi iptal edebilirsiniz.
                </p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          sentCount++;
          await env.DB.prepare(
            'UPDATE subscriptions SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(subscriber.id).run();
        } else {
          console.error(`Failed to send email to ${subscriber.email}:`, await response.text());
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
