import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { companies } from './routes/companies';
import { data } from './routes/data';
import { analytics } from './routes/analytics';
import { comparisons } from './routes/comparisons';

type Bindings = {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  API_VERSION: string;
};

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

export default app;
