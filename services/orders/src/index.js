const express = require('express');
const morgan  = require('morgan');
const { v4: uuidv4 } = require('uuid');
const client  = require('prom-client');

const { pool, migrate } = require('./db');
const { connect, publish } = require('./rabbitmq');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Prometheus metrics ──────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
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
  res.json({ status: 'ok', service: 'orders', timestamp: new Date() });
});

// ── GET /orders – list all orders ────────────────────────────────────────────
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[orders] list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── GET /orders/:id – get a single order ─────────────────────────────────────
app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [
      req.params.id,
    ]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[orders] get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── POST /orders – create an order ───────────────────────────────────────────
app.post('/orders', async (req, res) => {
  const { product, quantity } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ error: 'product and quantity are required' });
  }

  const id = uuidv4();
  try {
    const result = await pool.query(
      `INSERT INTO orders (id, product, quantity, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING *`,
      [id, product, parseInt(quantity)]
    );

    const order = result.rows[0];
    ordersCreated.inc();

    // Publish domain event to RabbitMQ
    publish('PedidoCriado', {
      orderId:  order.id,
      product:  order.product,
      quantity: order.quantity,
      status:   order.status,
      timestamp: new Date(),
    });

    console.log(`[orders] order created: ${order.id}`);
    res.status(201).json(order);
  } catch (err) {
    console.error('[orders] create error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── PATCH /orders/:id/status – update status ─────────────────────────────────
app.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[orders] update error:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  await migrate();
  await connect();
  app.listen(PORT, () => {
    console.log(`[orders] running on port ${PORT}`);
  });
}

start();
