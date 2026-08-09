/**
 * Payments Service – Mock implementation
 * Simulates payment processing without a real payment gateway.
 * 90 % of requests succeed; 10 % fail (to simulate real-world behaviour).
 */
const express = require('express');
const morgan  = require('morgan');
const { v4: uuidv4 } = require('uuid');
const client  = require('prom-client');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Prometheus metrics ──────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const paymentsTotal = new client.Counter({
  name: 'payments_processed_total',
  help: 'Total payments processed',
  labelNames: ['status'],
  registers: [register],
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('combined'));
app.use(express.json());

// ── Metrics ──────────────────────────────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payments', timestamp: new Date() });
});

// ── POST /payments – process a payment ───────────────────────────────────────
app.post('/payments', (req, res) => {
  const { orderId, amount, method } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'orderId and amount are required' });
  }

  // Simulate async processing time (100-400 ms)
  const processingTime = 100 + Math.floor(Math.random() * 300);

  setTimeout(() => {
    // 90 % success rate
    const success = Math.random() > 0.1;

    const payment = {
      paymentId:   uuidv4(),
      orderId,
      amount:      parseFloat(amount),
      method:      method || 'credit_card',
      status:      success ? 'APPROVED' : 'DECLINED',
      processedAt: new Date(),
    };

    paymentsTotal.inc({ status: payment.status });
    console.log(`[payments] ${payment.status} – orderId=${orderId} amount=${amount}`);

    res.status(success ? 200 : 402).json(payment);
  }, processingTime);
});

// ── GET /payments/:paymentId – mock lookup ────────────────────────────────────
app.get('/payments/:paymentId', (req, res) => {
  // Returns a mock record – a real service would query a database
  res.json({
    paymentId:   req.params.paymentId,
    status:      'APPROVED',
    processedAt: new Date(),
    note:        'Mock response – no persistence in this service',
  });
});

app.listen(PORT, () => {
  console.log(`[payments] running on port ${PORT}`);
});
