import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const comparisons = new Hono<{ Bindings: Bindings }>();

// POST /api/comparisons/companies - Şirketleri karşılaştır
comparisons.post('/companies', async (c) => {
  try {
    const body = await c.req.json();
    const { companyIds, period, branch } = body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length < 2) {
      return c.json({
        success: false,
        error: 'At least 2 company IDs are required',
      }, 400);
    }

    const currentPeriod = period || '20253';

    // Calculate previous year end (Q4 of previous year)
    const year = parseInt(currentPeriod.substring(0, 4));
    const pyePeriod = `${year - 1}4`;

    const placeholders = companyIds.map(() => '?').join(',');

    // Get current period data
    let query = `
      SELECT
        c.id,
        c.name,
        c.code,
        fd.branch_code,
        bc.name as branch_name,
        SUM(fd.gross_written_premium) as gross_premium,
        SUM(fd.net_premium) as net_premium,
        SUM(fd.net_payment) as net_payment,
        SUM(fd.net_earned_premium) as net_earned_premium,
        SUM(fd.net_incurred) as net_incurred,
        SUM(fd.net_unreported) as net_unreported,
        SUM(fd.discount_provision) as discount_provision,
        SUM(fd.incurred_claims) as gross_incurred,
        SUM(fd.unreported_claims) as gross_unreported
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      JOIN branch_codes bc ON fd.branch_code = bc.code
      WHERE fd.company_id IN (${placeholders})
      AND fd.period = ?
    `;
    const params = [...companyIds, currentPeriod];

    if (branch) {
      query += ' AND fd.branch_code = ?';
      params.push(branch);
    }

    query += ' GROUP BY c.id, c.name, c.code, fd.branch_code, bc.name';
    query += ' ORDER BY c.name ASC, fd.branch_code ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get PYE (Previous Year End) data
    let pyeQuery = `
      SELECT
        c.id,
        fd.branch_code,
        SUM(fd.net_incurred) as pye_net_incurred,
        SUM(fd.net_unreported) as pye_net_unreported
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      WHERE fd.company_id IN (${placeholders})
      AND fd.period = ?
    `;
    const pyeParams = [...companyIds, pyePeriod];

    if (branch) {
      pyeQuery += ' AND fd.branch_code = ?';
      pyeParams.push(branch);
    }

    pyeQuery += ' GROUP BY c.id, fd.branch_code';

    const pyeResult = await c.env.DB.prepare(pyeQuery).bind(...pyeParams).all();

    // Create PYE lookup map
    const pyeData: any = {};
    pyeResult.results?.forEach((row: any) => {
      const key = `${row.id}_${row.branch_code}`;
      pyeData[key] = {
        pye_net_incurred: row.pye_net_incurred || 0,
        pye_net_unreported: row.pye_net_unreported || 0,
      };
    });

    // Group by company
    const companyData: any = {};
    result.results?.forEach((row: any) => {
      if (!companyData[row.id]) {
        companyData[row.id] = {
          id: row.id,
          name: row.name,
          code: row.code,
          branches: [],
          totals: {
            gross_premium: 0,
            net_premium: 0,
            net_payment: 0,
            net_earned_premium: 0,
            net_incurred: 0,
            net_unreported: 0,
            pye_net_incurred: 0,
            pye_net_unreported: 0,
            discount_provision: 0,
            gross_incurred: 0,
            gross_unreported: 0,
          },
        };
      }

      const pyeKey = `${row.id}_${row.branch_code}`;
      const pye = pyeData[pyeKey] || { pye_net_incurred: 0, pye_net_unreported: 0 };

      // Calculate discount rate for this branch
      const grossTotal = Math.abs(row.gross_incurred || 0) + Math.abs(row.gross_unreported || 0);
      const discountRate = grossTotal > 0
        ? (Math.abs(row.discount_provision || 0) / grossTotal) * 100
        : 0;

      companyData[row.id].branches.push({
        code: row.branch_code,
        name: row.branch_name,
        gross_premium: row.gross_premium,
        net_premium: row.net_premium,
        net_payment: row.net_payment,
        net_earned_premium: row.net_earned_premium,
        net_incurred: row.net_incurred,
        net_unreported: row.net_unreported,
        pye_net_incurred: pye.pye_net_incurred,
        pye_net_unreported: pye.pye_net_unreported,
        discount_provision: row.discount_provision,
        gross_incurred: row.gross_incurred,
        gross_unreported: row.gross_unreported,
        discount_rate: parseFloat(discountRate.toFixed(2)),
      });

      // Add to totals
      companyData[row.id].totals.gross_premium += row.gross_premium || 0;
      companyData[row.id].totals.net_premium += row.net_premium || 0;
      companyData[row.id].totals.net_payment += row.net_payment || 0;
      companyData[row.id].totals.net_earned_premium += row.net_earned_premium || 0;
      companyData[row.id].totals.net_incurred += row.net_incurred || 0;
      companyData[row.id].totals.net_unreported += row.net_unreported || 0;
      companyData[row.id].totals.pye_net_incurred += pye.pye_net_incurred || 0;
      companyData[row.id].totals.pye_net_unreported += pye.pye_net_unreported || 0;
      companyData[row.id].totals.discount_provision += row.discount_provision || 0;
      companyData[row.id].totals.gross_incurred += row.gross_incurred || 0;
      companyData[row.id].totals.gross_unreported += row.gross_unreported || 0;
    });

    // Calculate total discount rate for each company
    Object.values(companyData).forEach((company: any) => {
      const totalGross = Math.abs(company.totals.gross_incurred) + Math.abs(company.totals.gross_unreported);
      company.totals.discount_rate = totalGross > 0
        ? parseFloat(((Math.abs(company.totals.discount_provision) / totalGross) * 100).toFixed(2))
        : 0;
    });

    return c.json({
      success: true,
      data: Object.values(companyData),
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

// GET /api/comparisons/yoy - Year over Year karşılaştırma
comparisons.get('/yoy', async (c) => {
  try {
    const { company, currentPeriod = '20253' } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    // Calculate previous year same quarter
    const year = parseInt(currentPeriod.substring(0, 4));
    const quarter = currentPeriod.substring(4);
    const previousPeriod = `${year - 1}${quarter}`;

    const current = await c.env.DB.prepare(`
      SELECT
        SUM(net_premium) as net_premium,
        SUM(net_payment) as net_payment,
        SUM(net_earned_premium) as net_earned_premium
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, currentPeriod).first();

    const previous = await c.env.DB.prepare(`
      SELECT
        SUM(net_premium) as net_premium,
        SUM(net_payment) as net_payment,
        SUM(net_earned_premium) as net_earned_premium
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, previousPeriod).first();

    const calculateGrowth = (current: number, previous: number) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    return c.json({
      success: true,
      data: {
        current: {
          period: currentPeriod,
          net_premium: current?.net_premium || 0,
          net_payment: current?.net_payment || 0,
          net_earned_premium: current?.net_earned_premium || 0,
        },
        previous: {
          period: previousPeriod,
          net_premium: previous?.net_premium || 0,
          net_payment: previous?.net_payment || 0,
          net_earned_premium: previous?.net_earned_premium || 0,
        },
        growth: {
          net_premium: parseFloat(calculateGrowth(
            (current?.net_premium as number) || 0,
            (previous?.net_premium as number) || 0
          ).toFixed(2)),
          net_payment: parseFloat(calculateGrowth(
            (current?.net_payment as number) || 0,
            (previous?.net_payment as number) || 0
          ).toFixed(2)),
          net_earned_premium: parseFloat(calculateGrowth(
            (current?.net_earned_premium as number) || 0,
            (previous?.net_earned_premium as number) || 0
          ).toFixed(2)),
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

// GET /api/comparisons/qoq - Quarter over Quarter karşılaştırma
comparisons.get('/qoq', async (c) => {
  try {
    const { company, currentPeriod = '20253' } = c.req.query();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company ID is required',
      }, 400);
    }

    // Calculate previous quarter
    const year = parseInt(currentPeriod.substring(0, 4));
    const quarter = parseInt(currentPeriod.substring(4));
    let previousPeriod: string;

    if (quarter === 1) {
      previousPeriod = `${year - 1}4`;
    } else {
      previousPeriod = `${year}${quarter - 1}`;
    }

    const current = await c.env.DB.prepare(`
      SELECT
        SUM(net_premium) as net_premium,
        SUM(net_payment) as net_payment,
        SUM(net_earned_premium) as net_earned_premium,
        SUM(net_incurred) as net_incurred
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, currentPeriod).first();

    const previous = await c.env.DB.prepare(`
      SELECT
        SUM(net_premium) as net_premium,
        SUM(net_payment) as net_payment,
        SUM(net_earned_premium) as net_earned_premium,
        SUM(net_incurred) as net_incurred
      FROM financial_data
      WHERE company_id = ? AND period = ?
    `).bind(company, previousPeriod).first();

    const calculateGrowth = (current: number, previous: number) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    return c.json({
      success: true,
      data: {
        current: {
          period: currentPeriod,
          net_premium: current?.net_premium || 0,
          net_payment: current?.net_payment || 0,
          net_earned_premium: current?.net_earned_premium || 0,
          net_incurred: current?.net_incurred || 0,
        },
        previous: {
          period: previousPeriod,
          net_premium: previous?.net_premium || 0,
          net_payment: previous?.net_payment || 0,
          net_earned_premium: previous?.net_earned_premium || 0,
          net_incurred: previous?.net_incurred || 0,
        },
        growth: {
          net_premium: parseFloat(calculateGrowth(
            (current?.net_premium as number) || 0,
            (previous?.net_premium as number) || 0
          ).toFixed(2)),
          net_payment: parseFloat(calculateGrowth(
            (current?.net_payment as number) || 0,
            (previous?.net_payment as number) || 0
          ).toFixed(2)),
          net_earned_premium: parseFloat(calculateGrowth(
            (current?.net_earned_premium as number) || 0,
            (previous?.net_earned_premium as number) || 0
          ).toFixed(2)),
          net_incurred: parseFloat(calculateGrowth(
            (current?.net_incurred as number) || 0,
            (previous?.net_incurred as number) || 0
          ).toFixed(2)),
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

export { comparisons };
