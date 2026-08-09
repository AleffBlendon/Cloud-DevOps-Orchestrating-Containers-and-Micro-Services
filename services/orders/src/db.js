const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'lojaveloz',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

/**
 * Run the initial migration to ensure the orders table exists.
 */
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id         UUID PRIMARY KEY,
      product    VARCHAR(255) NOT NULL,
      quantity   INTEGER      NOT NULL DEFAULT 1,
      status     VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[orders] database migration complete');
}

module.exports = { pool, migrate };
