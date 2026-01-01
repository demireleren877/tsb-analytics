import { Hono } from 'hono';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
};

export const subscriptions = new Hono<{ Bindings: Bindings }>();

// Generate a random unsubscribe token
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Validation schemas
const subscribeSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

// Subscribe to notifications
subscriptions.post('/subscribe', async (c) => {
  try {
    const body = await c.req.json();
    const result = subscribeSchema.safeParse(body);

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error.errors[0]?.message || 'Geçersiz e-posta adresi',
      }, 400);
    }

    const { email } = result.data;
    const unsubscribeToken = generateToken();

    // Check if email already exists
    const existing = await c.env.DB.prepare(
      'SELECT id, is_active FROM subscriptions WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      if (existing.is_active) {
        return c.json({
          success: false,
          error: 'Bu e-posta adresi zaten abone',
        }, 400);
      }

      // Reactivate subscription
      await c.env.DB.prepare(
        'UPDATE subscriptions SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?'
      ).bind(email).run();

      return c.json({
        success: true,
        message: 'Aboneliğiniz yeniden aktifleştirildi',
      });
    }

    // Create new subscription
    await c.env.DB.prepare(
      'INSERT INTO subscriptions (email, unsubscribe_token) VALUES (?, ?)'
    ).bind(email, unsubscribeToken).run();

    return c.json({
      success: true,
      message: 'Başarıyla abone oldunuz. Yeni veri yayınlandığında bilgilendirileceksiniz.',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return c.json({
      success: false,
      error: 'Abonelik oluşturulurken bir hata oluştu',
    }, 500);
  }
});

// Unsubscribe from notifications
subscriptions.get('/unsubscribe/:token', async (c) => {
  try {
    const token = c.req.param('token');

    const subscription = await c.env.DB.prepare(
      'SELECT id, email FROM subscriptions WHERE unsubscribe_token = ?'
    ).bind(token).first();

    if (!subscription) {
      return c.json({
        success: false,
        error: 'Geçersiz abonelik iptal bağlantısı',
      }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE subscriptions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE unsubscribe_token = ?'
    ).bind(token).run();

    return c.json({
      success: true,
      message: 'Aboneliğiniz başarıyla iptal edildi',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return c.json({
      success: false,
      error: 'Abonelik iptal edilirken bir hata oluştu',
    }, 500);
  }
});

// Check subscription status
subscriptions.get('/status/:email', async (c) => {
  try {
    const email = c.req.param('email');

    const subscription = await c.env.DB.prepare(
      'SELECT is_active, created_at FROM subscriptions WHERE email = ?'
    ).bind(email).first();

    if (!subscription) {
      return c.json({
        subscribed: false,
      });
    }

    return c.json({
      subscribed: subscription.is_active === 1,
      subscribedAt: subscription.created_at,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({
      subscribed: false,
    });
  }
});

// Get subscriber count (public stats)
subscriptions.get('/stats', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 1'
    ).first();

    return c.json({
      activeSubscribers: result?.count || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({
      activeSubscribers: 0,
    });
  }
});

// Get latest data check info
subscriptions.get('/latest-check', async (c) => {
  try {
    const latestPeriod = await c.env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'last_known_period'"
    ).first();

    const lastCheck = await c.env.DB.prepare(
      'SELECT check_time, latest_period, new_data_found FROM data_check_history ORDER BY check_time DESC LIMIT 1'
    ).first();

    return c.json({
      latestPeriod: latestPeriod?.value || null,
      lastCheck: lastCheck ? {
        time: lastCheck.check_time,
        period: lastCheck.latest_period,
        newDataFound: lastCheck.new_data_found === 1,
      } : null,
    });
  } catch (error) {
    console.error('Latest check error:', error);
    return c.json({
      latestPeriod: null,
      lastCheck: null,
    });
  }
});
