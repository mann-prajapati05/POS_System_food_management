import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize connection pool with environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'odoo_pos',
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Error handling for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connection successful:', result.rows[0]);
    return true;
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  }
}

/**
 * Execute a query with optional parameters
 * @param {string} queryText - SQL query
 * @param {Array} values - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(queryText, values = []) {
  const start = Date.now();
  try {
    const result = await pool.query(queryText, values);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠ Slow query (${duration}ms):`, queryText.substring(0, 100));
    }
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

/**
 * Begin a transaction
 */
export async function beginTransaction() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (err) {
    client.release();
    throw err;
  }
}

/**
 * Commit a transaction
 */
export async function commitTransaction(client) {
  try {
    await client.query('COMMIT');
    client.release();
  } catch (err) {
    client.release();
    throw err;
  }
}

/**
 * Rollback a transaction
 */
export async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

/**
 * Close all connections
 */
export async function closePool() {
  await pool.end();
  console.log('✓ Database pool closed');
}

export default pool;
