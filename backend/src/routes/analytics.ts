import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const analytics = new Hono<{ Bindings: Bindings }>();

// GET /api/analytics/dashboard - Dashboard metrikleri
analytics.get('/dashboard', async (c) => {
  try {
    const { period, branch, company_ids } = c.req.query();
    const currentPeriod = period || '20253'; // Default to latest period

    // Build WHERE clause for branch filtering
    let whereClause = 'WHERE period = ?';
    const baseParams: any[] = [currentPeriod];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        whereClause += ` AND branch_code IN (${placeholders})`;
        baseParams.push(...branches);
      }
    }

    // Support multiple companies (comma-separated)
    if (company_ids) {
      const companyIds = company_ids.split(',').filter(c => c.trim());
      if (companyIds.length > 0) {
        const placeholders = companyIds.map(() => '?').join(',');
        whereClause += ` AND company_id IN (${placeholders})`;
        baseParams.push(...companyIds);
      }
    }

    // Toplam prim üretimi
    const totalPremium = await c.env.DB.prepare(`
      SELECT SUM(net_premium) as total
      FROM financial_data
      ${whereClause}
    `).bind(...baseParams).first();

    // Toplam hasar ödemeleri
    const totalClaims = await c.env.DB.prepare(`
      SELECT SUM(net_payment) as total
      FROM financial_data
      ${whereClause}
    `).bind(...baseParams).first();

    // Aktif şirket sayısı
    const activeCompanies = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT company_id) as total
      FROM financial_data
      ${whereClause}
    `).bind(...baseParams).first();

    // Loss ratio (Hasar/Prim)
    const lossRatio = totalPremium?.total && totalClaims?.total
      ? ((totalClaims.total as number) / (totalPremium.total as number)) * 100
      : 0;

    // Branş bazında dağılım
    let branchQuery = `
      SELECT
        bc.code,
        bc.name,
        SUM(fd.net_premium) as total_premium,
        SUM(fd.net_payment) as total_claims,
        COUNT(DISTINCT fd.company_id) as company_count
      FROM financial_data fd
      JOIN branch_codes bc ON fd.branch_code = bc.code
      ${whereClause}
      GROUP BY bc.code, bc.name
      ORDER BY total_premium DESC
    `;
    const branchDistribution = await c.env.DB.prepare(branchQuery).bind(...baseParams).all();

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
    const { company, metric = 'net_premium', periods = '8', branch } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    let query = `
      SELECT
        period,
        SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ?
    `;
    const params: any[] = [company];

    if (branch) {
      query += ' AND branch_code = ?';
      params.push(branch);
    }

    query += ` GROUP BY period`;
    query += ` ORDER BY period DESC`;
    query += ` LIMIT ?`;
    params.push(parseInt(periods));

    const result = await c.env.DB.prepare(query).bind(...params).all();

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

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        query += ` AND fd.branch_code IN (${placeholders})`;
        params.push(...branches);
      }
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
    const { company, metric = 'net_premium', branch } = c.req.query();

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
    let currentQuery = `
      SELECT SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `;
    const currentParams: any[] = [company, currentPeriod];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        currentQuery += ` AND branch_code IN (${placeholders})`;
        currentParams.push(...branches);
      }
    }

    const currentQoQ = await c.env.DB.prepare(currentQuery).bind(...currentParams).first();

    let previousQuery = `
      SELECT SUM(${metric}) as value
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `;
    const previousParams: any[] = [company, previousQuarter];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        previousQuery += ` AND branch_code IN (${placeholders})`;
        previousParams.push(...branches);
      }
    }

    const previousQoQ = await c.env.DB.prepare(previousQuery).bind(...previousParams).first();

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

// GET /api/analytics/company-performance - Şirket performans verileri (PYE dahil)
analytics.get('/company-performance', async (c) => {
  try {
    const { company, periods = '8', branch } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    // Get all periods for this company
    let periodsQuery = `
      SELECT DISTINCT period
      FROM financial_data
      WHERE company_id = ?
    `;
    const periodsParams: any[] = [company];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        periodsQuery += ` AND branch_code IN (${placeholders})`;
        periodsParams.push(...branches);
      }
    }

    periodsQuery += ' ORDER BY period DESC LIMIT ?';
    periodsParams.push(parseInt(periods));

    const periodsResult = await c.env.DB.prepare(periodsQuery).bind(...periodsParams).all();

    if (!periodsResult.results || periodsResult.results.length === 0) {
      return c.json({
        success: true,
        data: [],
      });
    }

    // For each period, get the data and calculate PYE
    const performanceData = [];

    for (const periodRow of periodsResult.results) {
      const currentPeriod = periodRow.period as string;
      const year = parseInt(currentPeriod.substring(0, 4));
      const pyePeriod = `${year - 1}4`; // Previous year Q4

      // Get current period data
      let currentQuery = `
        SELECT
          SUM(net_premium) as net_premium,
          SUM(net_payment) as net_payment,
          SUM(net_incurred) as net_incurred,
          SUM(net_unreported) as net_unreported,
          SUM(net_earned_premium) as net_earned_premium,
          SUM(discount_provision) as discount_provision,
          SUM(incurred_claims) as gross_incurred,
          SUM(unreported_claims) as gross_unreported
        FROM financial_data
        WHERE company_id = ? AND period = ?
      `;
      const currentParams: any[] = [company, currentPeriod];

      // Support multiple branches (comma-separated)
      if (branch) {
        const branches = branch.split(',').filter(b => b.trim());
        if (branches.length > 0) {
          const placeholders = branches.map(() => '?').join(',');
          currentQuery += ` AND branch_code IN (${placeholders})`;
          currentParams.push(...branches);
        }
      }

      const currentData = await c.env.DB.prepare(currentQuery).bind(...currentParams).first();

      // Get PYE data
      let pyeQuery = `
        SELECT
          SUM(net_incurred) as pye_net_incurred,
          SUM(net_unreported) as pye_net_unreported
        FROM financial_data
        WHERE company_id = ? AND period = ?
      `;
      const pyeParams: any[] = [company, pyePeriod];

      // Support multiple branches (comma-separated)
      if (branch) {
        const branches = branch.split(',').filter(b => b.trim());
        if (branches.length > 0) {
          const placeholders = branches.map(() => '?').join(',');
          pyeQuery += ` AND branch_code IN (${placeholders})`;
          pyeParams.push(...branches);
        }
      }

      const pyeData = await c.env.DB.prepare(pyeQuery).bind(...pyeParams).first();

      // Calculate discount rate
      const grossTotal = Math.abs(currentData?.gross_incurred || 0) + Math.abs(currentData?.gross_unreported || 0);
      const discountRate = grossTotal > 0
        ? parseFloat(((Math.abs(currentData?.discount_provision || 0) / grossTotal) * 100).toFixed(2))
        : 0;

      performanceData.push({
        period: currentPeriod,
        net_premium: currentData?.net_premium || 0,
        net_payment: currentData?.net_payment || 0,
        net_incurred: currentData?.net_incurred || 0,
        net_unreported: currentData?.net_unreported || 0,
        net_earned_premium: currentData?.net_earned_premium || 0,
        pye_net_incurred: pyeData?.pye_net_incurred || 0,
        pye_net_unreported: pyeData?.pye_net_unreported || 0,
        discount_rate: discountRate,
      });
    }

    return c.json({
      success: true,
      data: performanceData.reverse(), // Return in chronological order
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/analytics/loss-ratio-rankings - Loss Ratio bazlı performans sıralaması
analytics.get('/loss-ratio-rankings', async (c) => {
  try {
    const { period, branch, limit = '20' } = c.req.query();
    const currentPeriod = period || '20253';

    // Calculate previous year end (Q4 of previous year)
    const year = parseInt(currentPeriod.substring(0, 4));
    const pyePeriod = `${year - 1}4`;

    // Get current period data with PYE data
    let query = `
      SELECT
        c.id,
        c.name,
        c.code,
        SUM(fd.net_payment) as net_payment,
        SUM(fd.net_incurred) as net_incurred,
        SUM(fd.net_unreported) as net_unreported,
        SUM(fd.net_earned_premium) as net_earned_premium
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      WHERE fd.period = ?
    `;
    const params: any[] = [currentPeriod];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        query += ` AND fd.branch_code IN (${placeholders})`;
        params.push(...branches);
      }
    }

    query += ' GROUP BY c.id, c.name, c.code';
    const currentResult = await c.env.DB.prepare(query).bind(...params).all();

    // Get PYE data
    let pyeQuery = `
      SELECT
        c.id,
        SUM(fd.net_incurred) as pye_net_incurred,
        SUM(fd.net_unreported) as pye_net_unreported
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      WHERE fd.period = ?
    `;
    const pyeParams: any[] = [pyePeriod];

    // Support multiple branches (comma-separated)
    if (branch) {
      const branches = branch.split(',').filter(b => b.trim());
      if (branches.length > 0) {
        const placeholders = branches.map(() => '?').join(',');
        pyeQuery += ` AND fd.branch_code IN (${placeholders})`;
        pyeParams.push(...branches);
      }
    }

    pyeQuery += ' GROUP BY c.id';
    const pyeResult = await c.env.DB.prepare(pyeQuery).bind(...pyeParams).all();

    // Create PYE lookup
    const pyeData: any = {};
    pyeResult.results?.forEach((row: any) => {
      pyeData[row.id] = {
        pye_net_incurred: row.pye_net_incurred || 0,
        pye_net_unreported: row.pye_net_unreported || 0,
      };
    });

    // Calculate loss ratios
    const rankings = currentResult.results?.map((row: any) => {
      const pye = pyeData[row.id] || { pye_net_incurred: 0, pye_net_unreported: 0 };

      // Net Ultimate = Net Ödeme + Net Tahakkuk + Net Raporlanmayan - PYE_Net Tahakkuk - PYE_Net Raporlanmayan
      const netUltimate = Math.abs(row.net_payment)
                        + Math.abs(row.net_incurred)
                        + Math.abs(row.net_unreported)
                        - Math.abs(pye.pye_net_incurred)
                        - Math.abs(pye.pye_net_unreported);

      const lossRatio = row.net_earned_premium > 0
        ? (netUltimate / row.net_earned_premium) * 100
        : 0;

      return {
        id: row.id,
        name: row.name,
        code: row.code,
        net_ultimate: netUltimate,
        net_earned_premium: row.net_earned_premium,
        loss_ratio: parseFloat(lossRatio.toFixed(2)),
      };
    }).sort((a: any, b: any) => a.loss_ratio - b.loss_ratio) // Sort by loss ratio ASC (lower is better)
      .slice(0, parseInt(limit));

    return c.json({
      success: true,
      data: rankings,
      period: currentPeriod,
      pyePeriod: pyePeriod,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export { analytics };
