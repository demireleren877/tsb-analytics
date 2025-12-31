import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const analytics = new Hono<{ Bindings: Bindings }>();

// GET /api/analytics/dashboard - Dashboard metrikleri
analytics.get('/dashboard', async (c) => {
  try {
    const { period } = c.req.query();
    const currentPeriod = period || '20253'; // Default to latest period

    // Toplam prim üretimi
    const totalPremium = await c.env.DB.prepare(`
      SELECT SUM(net_premium) as total
      FROM financial_data
      WHERE period = ?
    `).bind(currentPeriod).first();

    // Toplam hasar ödemeleri
    const totalClaims = await c.env.DB.prepare(`
      SELECT SUM(net_payment) as total
      FROM financial_data
      WHERE period = ?
    `).bind(currentPeriod).first();

    // Aktif şirket sayısı
    const activeCompanies = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT company_id) as total
      FROM financial_data
      WHERE period = ?
    `).bind(currentPeriod).first();

    // Loss ratio (Hasar/Prim)
    const lossRatio = totalPremium?.total && totalClaims?.total
      ? ((totalClaims.total as number) / (totalPremium.total as number)) * 100
      : 0;

    // Branş bazında dağılım
    const branchDistribution = await c.env.DB.prepare(`
      SELECT
        bc.code,
        bc.name,
        SUM(fd.net_premium) as total_premium,
        SUM(fd.net_payment) as total_claims,
        COUNT(DISTINCT fd.company_id) as company_count
      FROM financial_data fd
      JOIN branch_codes bc ON fd.branch_code = bc.code
      WHERE fd.period = ?
      GROUP BY bc.code, bc.name
      ORDER BY total_premium DESC
    `).bind(currentPeriod).all();

    return c.json({
      success: true,
      data: {
        metrics: {
          totalPremium: totalPremium?.total || 0,
          totalClaims: totalClaims?.total || 0,
          activeCompanies: activeCompanies?.total || 0,
          lossRatio: parseFloat(lossRatio.toFixed(2)),
        },
        branchDistribution: branchDistribution.results,
      },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/analytics/trends - Trend verileri
analytics.get('/trends', async (c) => {
  try {
    const { company, metric = 'net_premium', periods = '8' } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      SELECT
        period,
        SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ?
      GROUP BY period
      ORDER BY period DESC
      LIMIT ?
    `).bind(company, parseInt(periods)).all();

    return c.json({
      success: true,
      data: result.results?.reverse() || [],
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/analytics/rankings - Sıralama/Ranking
analytics.get('/rankings', async (c) => {
  try {
    const {
      metric = 'net_premium',
      period,
      branch,
      limit = '10',
      order = 'DESC',
    } = c.req.query();

    const currentPeriod = period || '20253';

    let query = `
      SELECT
        c.id,
        c.name,
        c.code,
        SUM(fd.${metric}) as total
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      WHERE fd.period = ?
    `;
    const params: any[] = [currentPeriod];

    if (branch) {
      query += ' AND fd.branch_code = ?';
      params.push(branch);
    }

    query += ` GROUP BY c.id, c.name, c.code`;
    query += ` ORDER BY total ${order}`;
    query += ` LIMIT ?`;
    params.push(parseInt(limit));

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      metric,
      period: currentPeriod,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/analytics/growth - Büyüme oranları
analytics.get('/growth', async (c) => {
  try {
    const { company, metric = 'net_premium' } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    // Son 4 çeyrek verisini al
    const periods = await c.env.DB.prepare(`
      SELECT DISTINCT period
      FROM financial_data
      ORDER BY period DESC
      LIMIT 4
    `).all();

    if (!periods.results || periods.results.length < 2) {
      return c.json({
        success: false,
        error: 'Insufficient data for growth calculation',
      }, 400);
    }

    const currentPeriod = periods.results[0].period;
    const previousQuarter = periods.results[1].period;

    // QoQ (Quarter over Quarter)
    const currentQoQ = await c.env.DB.prepare(`
      SELECT SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, currentPeriod).first();

    const previousQoQ = await c.env.DB.prepare(`
      SELECT SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, previousQuarter).first();

    const qoqGrowth = currentQoQ?.value && previousQoQ?.value
      ? (((currentQoQ.value as number) - (previousQoQ.value as number)) / (previousQoQ.value as number)) * 100
      : 0;

    return c.json({
      success: true,
      data: {
        qoq: {
          current: currentQoQ?.value || 0,
          previous: previousQoQ?.value || 0,
          growth: parseFloat(qoqGrowth.toFixed(2)),
          currentPeriod,
          previousPeriod: previousQuarter,
        },
      },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export { analytics };
