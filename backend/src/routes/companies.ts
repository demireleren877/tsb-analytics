import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const companies = new Hono<{ Bindings: Bindings }>();

// GET /api/companies - Tüm şirketleri listele
companies.get('/', async (c) => {
  try {
    const { type } = c.req.query();

    let query = 'SELECT * FROM companies';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/companies/:id - Şirket detayı
companies.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const company = await c.env.DB.prepare(
      'SELECT * FROM companies WHERE id = ?'
    ).bind(id).first();

    if (!company) {
      return c.json({
        success: false,
        error: 'Company not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET /api/companies/:id/data - Şirket finansal verileri
companies.get('/:id/data', async (c) => {
  try {
    const id = c.req.param('id');
    const { period, branch, startPeriod, endPeriod } = c.req.query();

    let query = `
      SELECT
        fd.*,
        bc.name as branch_name,
        c.name as company_name,
        c.code as company_code
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      JOIN branch_codes bc ON fd.branch_code = bc.code
      WHERE fd.company_id = ?
    `;
    const params: any[] = [id];

    if (period) {
      query += ' AND fd.period = ?';
      params.push(period);
    }

    if (branch) {
      query += ' AND fd.branch_code = ?';
      params.push(branch);
    }

    if (startPeriod && endPeriod) {
      query += ' AND fd.period >= ? AND fd.period <= ?';
      params.push(startPeriod, endPeriod);
    }

    query += ' ORDER BY fd.period DESC, fd.branch_code ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export { companies };
