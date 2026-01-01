import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const data = new Hono<{ Bindings: Bindings }>();

// GET /api/data - Filtrelenmiş finansal veriler
data.get('/', async (c) => {
  try {
    const {
      company,
      branch,
      period,
      startPeriod,
      endPeriod,
      limit = '100',
      offset = '0',
    } = c.req.query();

    let query = `
      SELECT
        fd.*,
        c.name as company_name,
        c.code as company_code,
        c.type as company_type,
        bc.name as branch_name
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      JOIN branch_codes bc ON fd.branch_code = bc.code
      WHERE 1=1
    `;
    const params: any[] = [];

    if (company) {
      query += ' AND fd.company_id = ?';
      params.push(company);
    }

    if (branch) {
      query += ' AND fd.branch_code = ?';
      params.push(branch);
    }

    if (period) {
      query += ' AND fd.period = ?';
      params.push(period);
    }

    if (startPeriod && endPeriod) {
      query += ' AND fd.period >= ? AND fd.period <= ?';
      params.push(startPeriod, endPeriod);
    }

    query += ' ORDER BY fd.period DESC, c.name ASC, fd.branch_code ASC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Total count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM financial_data fd
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (company) {
      countQuery += ' AND fd.company_id = ?';
      countParams.push(company);
    }

    if (branch) {
      countQuery += ' AND fd.branch_code = ?';
      countParams.push(branch);
    }

    if (period) {
      countQuery += ' AND fd.period = ?';
      countParams.push(period);
    }

    if (startPeriod && endPeriod) {
      countQuery += ' AND fd.period >= ? AND fd.period <= ?';
      countParams.push(startPeriod, endPeriod);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();

    return c.json({
      success: true,
      data: result.results,
      pagination: {
        total: (countResult?.total as number) || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < ((countResult?.total as number) || 0),
      },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/data/branches - Branş listesi
data.get('/branches', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM branch_codes ORDER BY code ASC'
    ).all();

    return c.json({
      success: true,
      data: result.results,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/data/periods - Dönem listesi
data.get('/periods', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM periods ORDER BY period DESC'
    ).all();

    return c.json({
      success: true,
      data: result.results,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export { data };
