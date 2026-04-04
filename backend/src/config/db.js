import pg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'odoo_pos';

const BASE_DB_CONFIG = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
};

/**
 * PostgreSQL Connection Pool
 * Configured with environment variables for production-ready scaling
 * 
 * Environment Variables:
 *   DB_HOST     - Database host (default: localhost)
 *   DB_PORT     - Database port (default: 5432)
 *   DB_USER     - Database user (default: postgres)
 *   DB_PASSWORD - Database password (default: postgres)
 *   DB_NAME     - Database name (default: odoo_pos)
 */
const pool = new Pool({
  ...BASE_DB_CONFIG,
  database: DB_NAME,
  max: 20, // Maximum concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Error handling for idle clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function readSchemaSql() {
  const candidates = [
    resolve(__dirname, '../../database/schema.sql'),
    resolve(__dirname, '../../schema.sql'),
  ];

  for (const schemaPath of candidates) {
    try {
      return await readFile(schemaPath, 'utf8');
    } catch {
      // Try next candidate path
    }
  }

  throw new Error('schema.sql file not found. Expected at database/schema.sql or schema.sql');
}

/**
 * First-run bootstrap:
 * 1) Create DB if missing
 * 2) Apply schema if core table does not exist
 */
export async function ensureDatabaseAndSchema() {
  const maintenanceDb = process.env.DB_MAINTENANCE_DB || 'postgres';
  const adminPool = new Pool({
    ...BASE_DB_CONFIG,
    database: maintenanceDb,
    max: 1,
  });

  try {
    const dbExists = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME]
    );

    if (dbExists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(DB_NAME)}`);
      console.log(`✓ Database created: ${DB_NAME}`);
    }
  } finally {
    await adminPool.end();
  }

  // Ensure required extensions and schema on target database.
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  const usersTable = await pool.query(
    "SELECT to_regclass('public.users') AS users_table"
  );

  if (!usersTable.rows[0]?.users_table) {
    const schemaSql = await readSchemaSql();
    await pool.query(schemaSql);
    console.log('✓ Database schema initialized');
  }
}

/**
 * Test database connection
 * Called on server startup to verify connectivity
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
    throw err;
  }
}

/**
 * Execute a query with optional parameters
 * Uses prepared statements for SQL injection prevention
 * 
 * @param {string} queryText - SQL query with $1, $2, etc. placeholders
 * @param {Array} values - Query parameters (default: [])
 * @returns {Promise<Object>} Query result object
 */
export async function query(queryText, values = []) {
  const start = Date.now();
  try {
    const result = await pool.query(queryText, values);
    const duration = Date.now() - start;
    
    // Log slow queries for performance monitoring
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
 * Returns client for sequential queries within transaction
 * 
 * @returns {Promise<Client>} PostgreSQL client with active transaction
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
 * Persists all changes made by transaction
 * 
 * @param {Client} client - PostgreSQL client from beginTransaction()
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
 * Reverts all changes made by transaction
 * 
 * @param {Client} client - PostgreSQL client from beginTransaction()
 */
export async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

/**
 * Close all database connections
 * Called on server shutdown for graceful cleanup
 */
export async function closePool() {
  await pool.end();
  console.log('✓ Database pool closed');
}

export default pool;
