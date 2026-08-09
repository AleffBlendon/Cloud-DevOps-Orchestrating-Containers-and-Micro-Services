const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Prometheus metrics ──────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests received by the gateway',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// ── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('combined'));

// ── Metrics endpoint ─────────────────────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: new Date() });
});

// ── Middleware to count requests ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });
  next();
});

// ── Proxy routes ──────────────────────────────────────────────────────────────
const ORDERS_URL   = process.env.ORDERS_URL   || 'http://localhost:3001';
const PAYMENTS_URL = process.env.PAYMENTS_URL || 'http://localhost:3002';
const STOCK_URL    = process.env.STOCK_URL    || 'http://localhost:3003';

app.use(
  '/orders',
  createProxyMiddleware({ target: ORDERS_URL, changeOrigin: true, logLevel: 'warn' })
);

app.use(
  '/payments',
  createProxyMiddleware({ target: PAYMENTS_URL, changeOrigin: true, logLevel: 'warn' })
);

app.use(
  '/stock',
  createProxyMiddleware({ target: STOCK_URL, changeOrigin: true, logLevel: 'warn' })
);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Loja Veloz - API Gateway',
    version: '1.0.0',
    routes: ['/orders', '/payments', '/stock', '/health', '/metrics'],
  });
});

app.listen(PORT, () => {
  console.log(`[gateway] running on port ${PORT}`);
});
