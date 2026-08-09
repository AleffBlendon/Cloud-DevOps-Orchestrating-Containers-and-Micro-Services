const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE     = 'loja_veloz';

let channel = null;

/**
 * Connect to RabbitMQ with a simple retry strategy.
 * Returns the channel once connected.
 */
async function connect(retries = 10, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      channel    = await conn.createChannel();

      // Declare a durable topic exchange so messages survive broker restarts
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      console.log('[orders] connected to RabbitMQ');
      return channel;
    } catch (err) {
      console.warn(`[orders] RabbitMQ connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('[orders] could not connect to RabbitMQ – events will not be published');
  return null;
}

/**
 * Publish an event to the exchange.
 * @param {string} routingKey  e.g. "PedidoCriado"
 * @param {object} payload
 */
function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[orders] RabbitMQ channel unavailable, skipping publish');
    return;
  }
  const msg = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE, routingKey, msg, { persistent: true });
  console.log(`[orders] event published: ${routingKey}`, payload);
}

module.exports = { connect, publish };
