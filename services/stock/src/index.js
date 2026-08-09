/**
 * Stock Service
 * In-memory inventory – replace with a database in production.
 */
const express = require('express');
const morgan  = require('morgan');
const client  = require('prom-client');

const app  = express();
const PORT = process.env.PORT || 3003;

// ── Prometheus metrics ──────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const stockReservations = new client.Counter({
  name: 'stock_reservations_total',
  help: 'Total stock reservations processed',
  labelNames: ['result'],
  registers: [register],
});

// ── In-memory stock ───────────────────────────────────────────────────────────
const inventory = {
  'camiseta-azul':      { name: 'Camiseta Azul',      quantity: 100 },
  'tenis-branco':       { name: 'Tênis Branco',        quantity: 50  },
  'calca-jeans':        { name: 'Calça Jeans',         quantity: 75  },
  'mochila-preta':      { name: 'Mochila Preta',       quantity: 30  },
  'relogio-esportivo':  { name: 'Relógio Esportivo',   quantity: 20  },
};

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
  res.json({ status: 'ok', service: 'stock', timestamp: new Date() });
});

// ── GET /stock – full inventory ───────────────────────────────────────────────
app.get('/stock', (req, res) => {
  res.json(inventory);
});

// ── GET /stock/:productId – single item ──────────────────────────────────────
app.get('/stock/:productId', (req, res) => {
  const item = inventory[req.params.productId];
  if (!item) return res.status(404).json({ error: 'Product not found' });
  res.json({ productId: req.params.productId, ...item });
});

// ── POST /stock/reserve – reserve stock ──────────────────────────────────────
app.post('/stock/reserve', (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'productId and quantity are required' });
  }

  const item = inventory[productId];
  if (!item) {
    stockReservations.inc({ result: 'not_found' });
    return res.status(404).json({ error: 'Product not found' });
  }

  if (item.quantity < quantity) {
    stockReservations.inc({ result: 'insufficient' });
    return res.status(409).json({
      error:     'Insufficient stock',
      available: item.quantity,
      requested: quantity,
    });
  }

  item.quantity -= quantity;
  stockReservations.inc({ result: 'success' });

  console.log(`[stock] reserved ${quantity}x ${productId} – remaining: ${item.quantity}`);
  res.json({ productId, reserved: quantity, remaining: item.quantity });
});

// ── POST /stock/release – release reserved stock ─────────────────────────────
app.post('/stock/release', (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'productId and quantity are required' });
  }

  const item = inventory[productId];
  if (!item) return res.status(404).json({ error: 'Product not found' });

  item.quantity += quantity;
  console.log(`[stock] released ${quantity}x ${productId} – remaining: ${item.quantity}`);
  res.json({ productId, released: quantity, remaining: item.quantity });
});

app.listen(PORT, () => {
  console.log(`[stock] running on port ${PORT}`);
});
